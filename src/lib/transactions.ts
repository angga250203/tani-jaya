export type SellerType = "PETANI_MITRA" | "PENJUAL_UMUM";
export type PaymentStatus = "PAID" | "UNPAID";
export type EffectivePaymentStatus = PaymentStatus | "INCLUDED_IN_TOTALAN";
export type WeighingMethod = "TOTAL_LANGSUNG" | "PER_KARUNG" | "PER_PETI";
export type PurchaseGrade = "SP" | "TG" | "BR";

export type TransactionItem = { id: string; commodity: string; grade: PurchaseGrade; weighingMethod: WeighingMethod; containerWeights: number[]; containerIds?: string[]; grossWeight: number; deduction: number; netWeight: number; pricePerKg: number; subtotal: number; stockHistoryLocked?: boolean };
export type FinalizedTotalanSettlement = { id: string; number?: string; totalanDate: string; finalizedAt: string };
export type TransactionRecord = { id: string; transactionNumber?: string; transactionDate: string; transactionTime: string; transactionTimeRaw?: string; sellerType: SellerType; farmerId?: string; sellerName: string; scheduleId?: string; scheduleDate?: string; fieldId?: string; cycleId?: string; cycleCommodity?: string; paymentStatus: PaymentStatus; effectivePaymentStatus: EffectivePaymentStatus; totalanId?: string; finalizedTotalan?: FinalizedTotalanSettlement; notes: string; items: TransactionItem[]; totalNetWeight: number; totalAmount: number };

export function calculateGrossWeight(method: WeighingMethod, directWeight: number, containerWeights: number[]) { return method === "TOTAL_LANGSUNG" ? directWeight : containerWeights.reduce((sum, weight) => sum + weight, 0); }
export function calculateNetWeight(grossWeight: number, deduction: number) { return Math.max(0, grossWeight - deduction); }
export function calculateCommoditySubtotal(netWeight: number, pricePerKg: number) { return netWeight * pricePerKg; }
export function calculateTransactionTotal(items: Pick<TransactionItem, "netWeight" | "subtotal">[]) { return items.reduce((total, item) => total + item.subtotal, 0); }
export function calculateTransactionWeight(items: Pick<TransactionItem, "netWeight">[]) { return items.reduce((total, item) => total + item.netWeight, 0); }

export function formatTransactionDate(date: string) { return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`)); }
export function sellerTypeLabel(type: SellerType) { return type === "PETANI_MITRA" ? "Petani Mitra" : "Penjual Umum"; }
export function paymentStatusLabel(status: PaymentStatus) { return status === "PAID" ? "Lunas" : "Belum Dibayar"; }
/** A Purchase is settled through Totalan only after its linked Totalan is finalized. */
export function isTransactionSettledByTotalan(transaction: TransactionRecord) { return Boolean(transaction.finalizedTotalan); }
export function resolvedTransactionPaymentStatus(transaction: TransactionRecord): PaymentStatus { return transaction.effectivePaymentStatus === "PAID" || isTransactionSettledByTotalan(transaction) ? "PAID" : "UNPAID"; }
export function transactionPaymentStatusLabel(transaction: TransactionRecord) { return isTransactionSettledByTotalan(transaction) ? "Lunas / Ditotal" : paymentStatusLabel(resolvedTransactionPaymentStatus(transaction)); }
/** The current schema only allows finalized Totalans, so draft memberships cannot exist. */
export function isTransactionEligibleForTotalan(transaction: TransactionRecord, farmerId: string) {
  return transaction.sellerType === "PETANI_MITRA"
    && transaction.farmerId === farmerId
    && transaction.paymentStatus === "UNPAID"
    && !isTransactionSettledByTotalan(transaction);
}
export function weighingMethodLabel(method: WeighingMethod) { return method === "PER_KARUNG" ? "Per Karung" : method === "PER_PETI" ? "Per Peti" : "Total Langsung"; }
export function purchaseGradeLabel(grade: PurchaseGrade) { return grade === "SP" ? "Super" : grade === "TG" ? "Tanggung" : "Barang Jelek"; }
