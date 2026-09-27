export type BuyerType = "GENERAL_BUYER" | "WEIGHER_COLLECTOR" | "MARKET";
export type SaleDeliveryMethod = "BUYER_PICKUP" | "EXPEDITION";
export type SaleLifecycleStatus = "ACTIVE" | "CANCELLED";

export type SaleItem = {
  id: string;
  commodity: string;
  grade: "SP" | "TG" | "BR";
  grossWeightKg: number;
  deductionWeightKg: number;
  netWeightKg: number;
  pricePerKg: number;
  subtotal: number;
};

/** Payments are ordered by immutable database `created_at`, not payment date. */
export type SalePayment = {
  id: string;
  paymentDate: string;
  amount: number;
  remainingBalanceAfter: number;
  createdAt: string;
};

export type SaleChangeEvent = {
  id: string;
  eventType: "CORRECTED" | "CANCELLED";
  reason: string;
  occurredAt: string;
};

/** Internal-only allocation traceability. Never use this in a buyer Nota. */
export type SaleStockAllocation = {
  id: string;
  /** Assigned after a persisted Sale item exists; drafts are keyed by commodity + grade. */
  saleItemId?: string;
  sourceId: string;
  purchaseItemId: string;
  sellerType: "PETANI_MITRA" | "PENJUAL_UMUM";
  sellerName: string;
  farmerId?: string;
  commodity: string;
  grade: SaleItem["grade"];
  weighingMethod: "TOTAL_LANGSUNG" | "PER_KARUNG" | "PER_PETI";
  purchaseContainerId?: string;
  purchaseContainerLabel?: string;
  allocatedGrossWeightKg: number;
  releasedAt?: string;
  releaseReason?: string;
};

export type SaleRecord = {
  id: string;
  saleNumber: string;
  saleDate: string;
  buyerName: string;
  buyerType: BuyerType;
  deliveryMethod: SaleDeliveryMethod;
  lifecycleStatus: SaleLifecycleStatus;
  cancellationReason?: string;
  items: SaleItem[];
  payments: SalePayment[];
  changeEvents: SaleChangeEvent[];
  allocations: SaleStockAllocation[];
  expeditionName?: string;
  expeditionRatePerKg?: number;
  /** Derived from `sale_payment_states`; ledger rows remain the audit detail. */
  totalPaidAmount?: number;
  remainingBalanceAmount?: number;
  effectivePaymentStatus?: "PAID" | "UNPAID" | "CANCELLED";
};

export type SaleCorrectionInput = {
  buyerName: string;
  buyerType: BuyerType;
  deliveryMethod: SaleDeliveryMethod;
  expeditionName?: string;
  expeditionRatePerKg?: number;
  items: Omit<SaleItem, "id">[];
  allocations: SaleStockAllocation[];
  reason: string;
};

export type SaleCreateInput = Omit<SaleCorrectionInput, "reason"> & {
  saleDate: string;
  initialPayment: number;
};

export type DerivedSaleTotals = {
  totalGrossWeightKg: number;
  totalDeductionWeightKg: number;
  totalNetWeightKg: number;
  totalAmount: number;
  totalPaid: number;
  remainingBalance: number;
  paymentState: "PAID" | "UNPAID" | "CANCELLED";
  initialPaymentContext: "DP/Titip" | "Utang" | null;
};

export function linkAllocationsToSaleItems(allocations: SaleStockAllocation[], items: SaleItem[]) {
  return allocations.map((allocation) => {
    const item = items.find((candidate) => candidate.commodity === allocation.commodity && candidate.grade === allocation.grade);
    return item ? { ...allocation, saleItemId: item.id } : allocation;
  });
}

export function validateActiveSaleAllocations(sale: Pick<SaleRecord, "items" | "allocations" | "lifecycleStatus">) {
  if (sale.lifecycleStatus !== "ACTIVE") return undefined;
  for (const saleItem of sale.items) {
    const total = sale.allocations
      .filter((allocation) => allocation.saleItemId === saleItem.id && !allocation.releasedAt)
      .reduce((sum, allocation) => sum + allocation.allocatedGrossWeightKg, 0);
    if (total !== saleItem.grossWeightKg) return `Alokasi stok ${saleItem.commodity} ${saleItem.grade} harus tepat ${saleItem.grossWeightKg} kg.`;
  }
  return undefined;
}

export function deriveSaleTotals(sale: SaleRecord): DerivedSaleTotals {
  const totalGrossWeightKg = sale.items.reduce((total, item) => total + item.grossWeightKg, 0);
  const totalDeductionWeightKg = sale.items.reduce((total, item) => total + item.deductionWeightKg, 0);
  const totalNetWeightKg = sale.items.reduce((total, item) => total + item.netWeightKg, 0);
  const totalAmount = sale.items.reduce((total, item) => total + item.subtotal, 0);
  const ledgerPaid = sale.payments.reduce((total, payment) => total + payment.amount, 0);
  const totalPaid = sale.totalPaidAmount ?? ledgerPaid;
  const remainingBalance = Math.max(0, sale.remainingBalanceAmount ?? totalAmount - totalPaid);
  const paymentState = sale.effectivePaymentStatus ?? (sale.lifecycleStatus === "CANCELLED" ? "CANCELLED" : remainingBalance === 0 ? "PAID" : "UNPAID");
  const initialPaymentContext = paymentState !== "UNPAID" ? null : totalPaid > 0 ? "DP/Titip" : "Utang";
  return { totalGrossWeightKg, totalDeductionWeightKg, totalNetWeightKg, totalAmount, totalPaid, remainingBalance, paymentState, initialPaymentContext };
}

export function saleCommoditySummary(items: SaleItem[]) {
  const labels = items.map((item) => `${item.commodity} ${item.grade}`);
  return labels.length <= 2 ? labels.join(" • ") : `${labels.slice(0, 2).join(" • ")} • +${labels.length - 2} lainnya`;
}

export function saleDeliveryLabel(method: SaleDeliveryMethod) { return method === "EXPEDITION" ? "Ekspedisi" : "Diambil Pembeli"; }
export function buyerTypeLabel(type: BuyerType) { return type === "MARKET" ? "Pasar" : type === "WEIGHER_COLLECTOR" ? "Penimbang/Pengepul" : "Pembeli Umum"; }
export function formatSaleDate(date: string) { return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`)); }
export function sortSalesNewest(sales: SaleRecord[]) { return [...sales].sort((a, b) => b.saleDate.localeCompare(a.saleDate) || b.saleNumber.localeCompare(a.saleNumber)); }
