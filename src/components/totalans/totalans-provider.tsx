"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useTransactions } from "@/components/transactions/transactions-provider";
import { useKasbons } from "@/components/kasbons/kasbons-provider";
import {
  calculateFinalPayment,
  calculateKasbonDeduction,
  calculateSelectedNetWeight,
  calculateSelectedTransactionTotal,
  createIncludedTransaction,
  initialTotalans,
  type TotalanRecord,
} from "@/lib/totalans";

type FinalizeTotalanInput = {
  farmerId: string;
  farmerName: string;
  transactionIds: string[];
  requestedKasbonDeduction: number;
};

type FinalizeTotalanResult = { record?: TotalanRecord; error?: string };

type TotalansContextValue = {
  totalans: TotalanRecord[];
  kasbonBalances: Record<string, number>;
  isPurchaseFinanciallyLocked: (transactionId: string) => boolean;
  finalizeTotalan: (input: FinalizeTotalanInput) => FinalizeTotalanResult;
};

const TotalansContext = createContext<TotalansContextValue | null>(null);

export function TotalansProvider({ children }: { children: ReactNode }) {
  const { settleTransactionsInTotalan, transactions } = useTransactions();
  const { balances: kasbonBalances, recordTotalanDeduction } = useKasbons();
  const [totalans, setTotalans] = useState(initialTotalans);

  const finalizeTotalan = useCallback((input: FinalizeTotalanInput): FinalizeTotalanResult => {
    const selectedTransactions = transactions.filter((transaction) => input.transactionIds.includes(transaction.id));
    const allEligible = selectedTransactions.length === input.transactionIds.length
      && selectedTransactions.every((transaction) => (
        transaction.sellerType === "PETANI_MITRA"
        && transaction.farmerId === input.farmerId
        && transaction.paymentStatus === "UNPAID"
        && !transaction.totalanId
      ));

    if (!input.farmerId) return { error: "Pilih petani terlebih dahulu." };
    if (!input.transactionIds.length) return { error: "Pilih minimal satu transaksi." };
    if (!allEligible) return { error: "Pilihan transaksi sudah tidak memenuhi syarat untuk totalan." };

    const totalHarvestValue = calculateSelectedTransactionTotal(selectedTransactions);
    const totalNetWeight = calculateSelectedNetWeight(selectedTransactions);
    const kasbonBalance = kasbonBalances[input.farmerId] ?? 0;
    const kasbonDeduction = calculateKasbonDeduction(input.requestedKasbonDeduction, kasbonBalance, totalHarvestValue);

    if (kasbonDeduction !== input.requestedKasbonDeduction) {
      return { error: "Potongan kasbon melebihi saldo kasbon atau total hasil panen." };
    }

    const id = `totalan-local-${Date.now()}`;
    const record: TotalanRecord = {
      id,
      number: `TLN-2026-${String(totalans.length + 1).padStart(3, "0")}`,
      totalanDate: "2026-09-16",
      farmerId: input.farmerId,
      farmerName: input.farmerName,
      transactions: selectedTransactions.map(createIncludedTransaction),
      totalTransactions: selectedTransactions.length,
      totalNetWeight,
      totalHarvestValue,
      kasbonDeduction,
      finalPayment: calculateFinalPayment(totalHarvestValue, kasbonDeduction),
      status: "COMPLETED",
    };

    if (kasbonDeduction > 0 && !recordTotalanDeduction({ farmerId: input.farmerId, totalanId: id, date: record.totalanDate, amount: kasbonDeduction })) {
      return { error: "Potongan kasbon tidak dapat dicatat pada riwayat." };
    }
    setTotalans((current) => [record, ...current]);
    settleTransactionsInTotalan(input.transactionIds, id);
    return { record };
  }, [kasbonBalances, recordTotalanDeduction, settleTransactionsInTotalan, totalans.length, transactions]);

  const isPurchaseFinanciallyLocked = useCallback((transactionId: string) => (
    totalans.some((totalan) => totalan.status === "COMPLETED" && totalan.transactions.some((transaction) => transaction.transactionId === transactionId))
  ), [totalans]);
  const value = useMemo(() => ({ totalans, kasbonBalances, finalizeTotalan, isPurchaseFinanciallyLocked }), [finalizeTotalan, isPurchaseFinanciallyLocked, kasbonBalances, totalans]);
  return <TotalansContext.Provider value={value}>{children}</TotalansContext.Provider>;
}

export function useTotalans() {
  const context = useContext(TotalansContext);
  if (!context) throw new Error("useTotalans harus digunakan di dalam TotalansProvider.");
  return context;
}
