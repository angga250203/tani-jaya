"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { calculateTransactionTotal, calculateTransactionWeight, initialTransactions, type TransactionRecord } from "@/lib/transactions";
import type { TransactionFormValues } from "@/lib/validations";

type TransactionsContextValue = {
  transactions: TransactionRecord[];
  createTransaction: (values: TransactionFormValues, sellerName: string) => TransactionRecord;
  updateTransaction: (id: string, values: TransactionFormValues, sellerName: string) => void;
  settleTransactionsInTotalan: (transactionIds: string[], totalanId: string) => void;
};
const TransactionsContext = createContext<TransactionsContextValue | null>(null);

function toRecord(id: string, values: TransactionFormValues, sellerName: string): TransactionRecord {
  const items = values.items.map((item, index) => { const grossWeight = item.weighingMethod === "TOTAL_LANGSUNG" ? item.grossWeight : item.containers.reduce((total, container) => total + container.weight, 0); const deduction = item.deduction ?? 0; const netWeight = grossWeight - deduction; return { id: `detail-${id}-${index + 1}`, commodity: item.commodity, grade: item.grade, weighingMethod: item.weighingMethod, containerWeights: item.weighingMethod === "TOTAL_LANGSUNG" ? [] : item.containers.map((container) => container.weight), grossWeight, deduction, netWeight, pricePerKg: item.pricePerKg, subtotal: netWeight * item.pricePerKg }; });
  const transactionTime = `${new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta" }).format(new Date())} WIB`;
  return { id, transactionDate: values.transactionDate, transactionTime, sellerType: values.sellerType, farmerId: values.sellerType === "PETANI_MITRA" ? values.farmerId : undefined, sellerName, scheduleId: values.scheduleId, fieldId: values.fieldId, cycleId: values.cycleId, paymentStatus: values.sellerType === "PENJUAL_UMUM" ? "PAID" : values.paymentStatus ?? "UNPAID", notes: values.notes?.trim() ?? "", items, totalNetWeight: calculateTransactionWeight(items), totalAmount: calculateTransactionTotal(items) };
}

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const createTransaction = useCallback((values: TransactionFormValues, sellerName: string) => { const record = toRecord(`transaksi-local-${Date.now()}`, values, sellerName); setTransactions((current) => [record, ...current]); return record; }, []);
  const updateTransaction = useCallback((id: string, values: TransactionFormValues, sellerName: string) => {
    setTransactions((current) => current.map((transaction) => {
      if (transaction.id !== id) return transaction;
      if (transaction.totalanId) return transaction;
      const updated = toRecord(id, values, sellerName);
      return updated;
    }));
  }, []);
  const settleTransactionsInTotalan = useCallback((transactionIds: string[], totalanId: string) => {
    setTransactions((current) => current.map((transaction) => (
      transactionIds.includes(transaction.id)
        ? { ...transaction, paymentStatus: "PAID", totalanId }
        : transaction
    )));
  }, []);
  const value = useMemo(() => ({ transactions, createTransaction, updateTransaction, settleTransactionsInTotalan }), [createTransaction, settleTransactionsInTotalan, transactions, updateTransaction]);
  return <TransactionsContext.Provider value={value}>{children}</TransactionsContext.Provider>;
}

export function useTransactions() { const context = useContext(TransactionsContext); if (!context) throw new Error("useTransactions harus digunakan di dalam TransactionsProvider."); return context; }
