import { type TotalanRecord } from "@/lib/totalans";
import { type TransactionRecord } from "@/lib/transactions";

export type NotaType = "TRANSACTION" | "TOTALAN";

export type NotaRecord = {
  id: string;
  number: string;
  date: string;
  type: NotaType;
  recipientName: string;
  sourceId: string;
  amount: number;
};

function sourceSuffix(id: string) {
  const localMatch = id.match(/(\d+)$/);
  return localMatch?.[1].slice(-3).padStart(3, "0") ?? "001";
}

function compactDate(date: string) {
  return date.replaceAll("-", "");
}

export function notaIdForTransaction(transactionId: string) {
  return `nota-transaksi-${transactionId.replace("transaksi-", "")}`;
}

export function notaIdForTotalan(totalanId: string) {
  return `nota-totalan-${totalanId.replace("totalan-", "")}`;
}

export function getTransactionNota(transaction: TransactionRecord): NotaRecord {
  return {
    id: notaIdForTransaction(transaction.id),
    number: `NT-${compactDate(transaction.transactionDate)}-${sourceSuffix(transaction.id)}`,
    date: transaction.transactionDate,
    type: "TRANSACTION",
    recipientName: transaction.sellerName,
    sourceId: transaction.id,
    amount: transaction.totalAmount,
  };
}

export function getTotalanNota(totalan: TotalanRecord): NotaRecord {
  return {
    id: notaIdForTotalan(totalan.id),
    number: `TL-${compactDate(totalan.totalanDate)}-${sourceSuffix(totalan.id)}`,
    date: totalan.totalanDate,
    type: "TOTALAN",
    recipientName: totalan.farmerName,
    sourceId: totalan.id,
    amount: totalan.finalPayment,
  };
}

export function getAvailableNotas(transactions: TransactionRecord[], totalans: TotalanRecord[]) {
  return [
    ...transactions.map(getTransactionNota),
    ...totalans.map(getTotalanNota),
  ].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

export function notaTypeLabel(type: NotaType) {
  return type === "TRANSACTION" ? "Nota Transaksi" : "Nota Totalan";
}

export function getNotaSource(notaId: string, transactions: TransactionRecord[], totalans: TotalanRecord[]) {
  const transaction = transactions.find((item) => notaIdForTransaction(item.id) === notaId);
  if (transaction) return { nota: getTransactionNota(transaction), transaction } as const;
  const totalan = totalans.find((item) => notaIdForTotalan(item.id) === notaId);
  if (totalan) return { nota: getTotalanNota(totalan), totalan } as const;
  return undefined;
}
