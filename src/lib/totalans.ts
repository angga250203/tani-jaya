import { initialTransactions, type TransactionRecord } from "@/lib/transactions";

export type IncludedTransaction = {
  transactionId: string;
  transactionDate: string;
  commoditySummary: string;
  totalNetWeight: number;
  totalAmount: number;
};

export type TotalanRecord = {
  id: string;
  number: string;
  totalanDate: string;
  farmerId: string;
  farmerName: string;
  transactions: IncludedTransaction[];
  totalTransactions: number;
  totalNetWeight: number;
  totalHarvestValue: number;
  kasbonDeduction: number;
  finalPayment: number;
  status: "COMPLETED";
};

export function createIncludedTransaction(transaction: TransactionRecord): IncludedTransaction {
  return {
    transactionId: transaction.id,
    transactionDate: transaction.transactionDate,
    commoditySummary: transaction.items.map((item) => item.commodity).join(", "),
    totalNetWeight: transaction.totalNetWeight,
    totalAmount: transaction.totalAmount,
  };
}

export function calculateSelectedTransactionTotal(transactions: Pick<TransactionRecord, "totalAmount">[]) {
  return transactions.reduce((total, transaction) => total + transaction.totalAmount, 0);
}

export function calculateSelectedNetWeight(transactions: Pick<TransactionRecord, "totalNetWeight">[]) {
  return transactions.reduce((total, transaction) => total + transaction.totalNetWeight, 0);
}

export function calculateKasbonDeduction(requestedDeduction: number, kasbonBalance: number, totalHarvestValue: number) {
  return Math.min(Math.max(0, requestedDeduction), kasbonBalance, totalHarvestValue);
}

export function calculateFinalPayment(totalHarvestValue: number, kasbonDeduction: number) {
  return Math.max(0, totalHarvestValue - kasbonDeduction);
}

const historicalTransaction = initialTransactions.find((transaction) => transaction.id === "transaksi-005");

export const initialTotalans: TotalanRecord[] = historicalTransaction ? [
  {
    id: "totalan-001",
    number: "TLN-2026-001",
    totalanDate: "2026-09-16",
    farmerId: "petani-001",
    farmerName: "Budi Santoso",
    transactions: [createIncludedTransaction(historicalTransaction)],
    totalTransactions: 1,
    totalNetWeight: historicalTransaction.totalNetWeight,
    totalHarvestValue: historicalTransaction.totalAmount,
    kasbonDeduction: 1_000_000,
    finalPayment: historicalTransaction.totalAmount - 1_000_000,
    status: "COMPLETED",
  },
] : [];

export function getTotalanById(id: string) {
  return initialTotalans.find((totalan) => totalan.id === id);
}

export function formatTotalanDate(date: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${date}T00:00:00`));
}
