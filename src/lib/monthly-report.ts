import { calculateKasbonBalance, isKasbonCredit, type KasbonEntry } from "@/lib/kasbons";
import { type TotalanRecord } from "@/lib/totalans";
import { isTransactionSettledByTotalan, resolvedTransactionPaymentStatus, type TransactionRecord } from "@/lib/transactions";

export function monthLabel(month: string) {
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(`${month}-01T00:00:00`));
}

export function previousMonth(month: string) {
  const [year, value] = month.split("-").map(Number);
  return `${value === 1 ? year - 1 : year}-${String(value === 1 ? 12 : value - 1).padStart(2, "0")}`;
}

export function getMonthlyReport(month: string, transactions: TransactionRecord[], totalans: TotalanRecord[], entries: KasbonEntry[]) {
  const monthTransactions = transactions.filter((transaction) => transaction.transactionDate.startsWith(month));
  const monthTotalans = totalans.filter((totalan) => totalan.totalanDate.startsWith(month));
  const transactionSummary = monthTransactions.reduce((result, transaction) => ({
    count: result.count + 1,
    grossWeight: result.grossWeight + transaction.items.reduce((sum, item) => sum + item.grossWeight, 0),
    weight: result.weight + transaction.totalNetWeight,
    amount: result.amount + transaction.totalAmount,
    partners: result.partners + Number(transaction.sellerType === "PETANI_MITRA"),
    general: result.general + Number(transaction.sellerType === "PENJUAL_UMUM"),
    paid: result.paid + Number(resolvedTransactionPaymentStatus(transaction) === "PAID" && !isTransactionSettledByTotalan(transaction)),
    unpaid: result.unpaid + Number(resolvedTransactionPaymentStatus(transaction) === "UNPAID"),
    totaled: result.totaled + Number(isTransactionSettledByTotalan(transaction)),
  }), { count: 0, grossWeight: 0, weight: 0, amount: 0, partners: 0, general: 0, paid: 0, unpaid: 0, totaled: 0 });
  const commodities = Object.values(monthTransactions.flatMap((transaction) => transaction.items).reduce<Record<string, { name: string; weight: number; amount: number; count: number }>>((groups, item) => {
    const group = groups[item.commodity] ?? { name: item.commodity, weight: 0, amount: 0, count: 0 };
    group.weight += item.netWeight; group.amount += item.subtotal; group.count += 1; groups[item.commodity] = group; return groups;
  }, {})).sort((a, b) => b.weight - a.weight);
  const suppliers = Object.values(monthTransactions.reduce<Record<string, { name: string; type: TransactionRecord["sellerType"]; count: number; weight: number; amount: number }>>((groups, transaction) => {
    const group = groups[transaction.sellerName] ?? { name: transaction.sellerName, type: transaction.sellerType, count: 0, weight: 0, amount: 0 };
    group.count += 1; group.weight += transaction.totalNetWeight; group.amount += transaction.totalAmount; groups[transaction.sellerName] = group; return groups;
  }, {})).sort((a, b) => b.amount - a.amount);
  const totalan = monthTotalans.reduce((result, item) => ({ count: result.count + 1, harvest: result.harvest + item.totalHarvestValue, deduction: result.deduction + item.kasbonDeduction, paid: result.paid + item.finalPayment }), { count: 0, harvest: 0, deduction: 0, paid: 0 });
  const monthlyEntries = entries.filter((entry) => entry.date.startsWith(month));
  const kasbon = { given: monthlyEntries.filter(isKasbonCredit).reduce((sum, entry) => sum + entry.amount, 0), deducted: monthlyEntries.filter((entry) => !isKasbonCredit(entry)).reduce((sum, entry) => sum + entry.amount, 0), ending: calculateKasbonBalance(entries.filter((entry) => entry.date <= `${month}-31`)) };
  const previousTransactions = transactions.filter((transaction) => transaction.transactionDate.startsWith(previousMonth(month)));
  const previousAmount = previousTransactions.reduce((sum, transaction) => sum + transaction.totalAmount, 0);
  const change = previousAmount ? ((transactionSummary.amount - previousAmount) / previousAmount) * 100 : undefined;
  return { transactions: monthTransactions, transactionSummary, commodities, suppliers, totalan, kasbon, previousAmount, change };
}
