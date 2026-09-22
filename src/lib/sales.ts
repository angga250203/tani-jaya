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

/** Ledger order is the array order. The balance snapshot is audit context only. */
export type SalePayment = {
  id: string;
  paymentDate: string;
  amount: number;
  remainingBalanceAfter: number;
};

/** Append-only audit trail for lifecycle changes. Payments remain a separate ledger. */
export type SaleChangeEvent = {
  id: string;
  eventType: "CORRECTED" | "CANCELLED";
  reason: string;
  occurredAt: string;
};

/** Internal-only stock traceability. Never render this in buyer-facing summaries. */
export type SaleStockAllocation = {
  id: string;
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
  changeEvents?: SaleChangeEvent[];
  allocations?: SaleStockAllocation[];
  expeditionName?: string;
  expeditionRatePerKg?: number;
};

export type MockSaleCorrectionInput = {
  buyerName: string;
  buyerType: BuyerType;
  deliveryMethod: SaleDeliveryMethod;
  expeditionName?: string;
  expeditionRatePerKg?: number;
  items: Omit<SaleItem, "id">[];
  allocations: SaleStockAllocation[];
  reason: string;
};

export type MockSaleCreateInput = {
  buyerName: string;
  buyerType: BuyerType;
  deliveryMethod: SaleDeliveryMethod;
  expeditionName?: string;
  expeditionRatePerKg?: number;
  items: Omit<SaleItem, "id">[];
  allocations: SaleStockAllocation[];
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

const item = (id: string, commodity: string, grade: SaleItem["grade"], grossWeightKg: number, deductionWeightKg: number, pricePerKg: number): SaleItem => {
  const netWeightKg = grossWeightKg - deductionWeightKg;
  return { id, commodity, grade, grossWeightKg, deductionWeightKg, netWeightKg, pricePerKg, subtotal: netWeightKg * pricePerKg };
};

const allocation = (id: string, saleItemId: string, sourceId: string, purchaseItemId: string, sellerType: SaleStockAllocation["sellerType"], sellerName: string, commodity: string, grade: SaleItem["grade"], weighingMethod: SaleStockAllocation["weighingMethod"], allocatedGrossWeightKg: number, purchaseContainerId?: string, purchaseContainerLabel?: string): SaleStockAllocation => ({ id, saleItemId, sourceId, purchaseItemId, sellerType, sellerName, commodity, grade, weighingMethod, allocatedGrossWeightKg, purchaseContainerId, purchaseContainerLabel });

/** Shared local Sales fixtures. No UI component reads Supabase for this phase. */
export const initialSales: SaleRecord[] = [
  { id: "penjualan-005", saleNumber: "PJ-20260921-0003", saleDate: "2026-09-21", buyerName: "Pasar Induk Suka Maju", buyerType: "MARKET", deliveryMethod: "BUYER_PICKUP", lifecycleStatus: "ACTIVE", items: [item("sale-item-005a", "Timun", "SP", 70, 2, 15_000), item("sale-item-005b", "Tomat", "TG", 92, 0, 11_000)], payments: [{ id: "sale-payment-005", paymentDate: "2026-09-21", amount: 2_032_000, remainingBalanceAfter: 0 }], allocations: [allocation("alokasi-005a", "sale-item-005a", "detail-003", "detail-003", "PENJUAL_UMUM", "Pak Herman", "Timun", "SP", "TOTAL_LANGSUNG", 70), allocation("alokasi-005b", "sale-item-005b", "detail-004", "detail-004", "PETANI_MITRA", "Budi Santoso", "Tomat", "TG", "PER_PETI", 92, "detail-004:container:1", "Peti #1")] },
  { id: "penjualan-004", saleNumber: "PJ-20260920-0002", saleDate: "2026-09-20", buyerName: "Pak Ahmad", buyerType: "WEIGHER_COLLECTOR", deliveryMethod: "EXPEDITION", expeditionName: "Truk Maju Jaya", expeditionRatePerKg: 200, lifecycleStatus: "ACTIVE", items: [item("sale-item-004a", "Cabai Rawit", "SP", 90, 5, 8_000), item("sale-item-004b", "Cabai Rawit", "BR", 40, 0, 8_000)], payments: [{ id: "sale-payment-004", paymentDate: "2026-09-20", amount: 300_000, remainingBalanceAfter: 420_000 }], allocations: [allocation("alokasi-004a", "sale-item-004a", "detail-008", "detail-008", "PETANI_MITRA", "Budi Santoso", "Cabai Rawit", "SP", "TOTAL_LANGSUNG", 90), allocation("alokasi-004b", "sale-item-004b", "detail-005", "detail-005", "PETANI_MITRA", "Budi Santoso", "Cabai Rawit", "BR", "TOTAL_LANGSUNG", 40)] },
  { id: "penjualan-003", saleNumber: "PJ-20260919-0001", saleDate: "2026-09-19", buyerName: "Ibu Nur", buyerType: "GENERAL_BUYER", deliveryMethod: "BUYER_PICKUP", lifecycleStatus: "ACTIVE", items: [item("sale-item-003", "Terong", "BR", 80, 0, 12_500)], payments: [], allocations: [allocation("alokasi-003", "sale-item-003", "detail-006", "detail-006", "PETANI_MITRA", "Budi Santoso", "Terong", "BR", "TOTAL_LANGSUNG", 80)] },
  { id: "penjualan-002", saleNumber: "PJ-20260918-0004", saleDate: "2026-09-18", buyerName: "Toko Sejahtera", buyerType: "GENERAL_BUYER", deliveryMethod: "EXPEDITION", expeditionName: "Truk Karya Tani", expeditionRatePerKg: 250, lifecycleStatus: "CANCELLED", cancellationReason: "Kesalahan pencatatan jumlah karung saat pengiriman.", changeEvents: [{ id: "sale-change-002", eventType: "CANCELLED", reason: "Kesalahan pencatatan jumlah karung saat pengiriman.", occurredAt: "2026-09-18T10:15:00+07:00" }], items: [item("sale-item-002", "Cabai Rawit", "SP", 80, 0, 26_000)], payments: [], allocations: [allocation("alokasi-002a", "sale-item-002", "detail-001", "detail-001", "PETANI_MITRA", "Budi Santoso", "Cabai Rawit", "SP", "PER_KARUNG", 40, "detail-001:container:1", "Karung #1"), allocation("alokasi-002b", "sale-item-002", "detail-001", "detail-001", "PETANI_MITRA", "Budi Santoso", "Cabai Rawit", "SP", "PER_KARUNG", 40, "detail-001:container:2", "Karung #2")] },
  { id: "penjualan-001", saleNumber: "PJ-20260917-0001", saleDate: "2026-09-17", buyerName: "Pak Dedi", buyerType: "GENERAL_BUYER", deliveryMethod: "BUYER_PICKUP", lifecycleStatus: "ACTIVE", items: [item("sale-item-001a", "Cabai Rawit", "SP", 40, 0, 15_000), item("sale-item-001b", "Cabai Rawit", "BR", 32, 0, 11_000)], payments: [{ id: "sale-payment-001", paymentDate: "2026-09-17", amount: 952_000, remainingBalanceAfter: 0 }], allocations: [allocation("alokasi-001a", "sale-item-001a", "detail-001", "detail-001", "PETANI_MITRA", "Budi Santoso", "Cabai Rawit", "SP", "PER_KARUNG", 40, "detail-001:container:3", "Karung #3"), allocation("alokasi-001b", "sale-item-001b", "detail-005", "detail-005", "PETANI_MITRA", "Budi Santoso", "Cabai Rawit", "BR", "TOTAL_LANGSUNG", 32)] },
];

export function linkAllocationsToSaleItems(allocations: SaleStockAllocation[], items: SaleItem[]): SaleStockAllocation[] | undefined {
  return allocations.map((allocation) => {
    const saleItem = items.find((item) => item.commodity === allocation.commodity && item.grade === allocation.grade);
    return saleItem ? { ...allocation, saleItemId: saleItem.id } : undefined;
  }).every(Boolean) ? allocations.map((allocation) => ({ ...allocation, saleItemId: items.find((item) => item.commodity === allocation.commodity && item.grade === allocation.grade)!.id })) : undefined;
}

export function validateActiveSaleAllocations(sale: Pick<SaleRecord, "items" | "allocations" | "lifecycleStatus">) {
  if (sale.lifecycleStatus !== "ACTIVE") return undefined;
  for (const saleItem of sale.items) {
    const total = (sale.allocations ?? []).filter((allocation) => allocation.saleItemId === saleItem.id).reduce((sum, allocation) => sum + allocation.allocatedGrossWeightKg, 0);
    if (total !== saleItem.grossWeightKg) return `Alokasi stok ${saleItem.commodity} ${saleItem.grade} harus tepat ${saleItem.grossWeightKg} kg.`;
  }
  return undefined;
}

export function deriveSaleTotals(sale: SaleRecord): DerivedSaleTotals {
  const totalGrossWeightKg = sale.items.reduce((total, saleItem) => total + saleItem.grossWeightKg, 0);
  const totalDeductionWeightKg = sale.items.reduce((total, saleItem) => total + saleItem.deductionWeightKg, 0);
  const totalNetWeightKg = sale.items.reduce((total, saleItem) => total + saleItem.netWeightKg, 0);
  const totalAmount = sale.items.reduce((total, saleItem) => total + saleItem.subtotal, 0);
  const totalPaid = sale.payments.reduce((total, payment) => total + payment.amount, 0);
  const remainingBalance = Math.max(0, totalAmount - totalPaid);
  const paymentState = sale.lifecycleStatus === "CANCELLED" ? "CANCELLED" : remainingBalance === 0 ? "PAID" : "UNPAID";
  const initialPaymentContext = paymentState !== "UNPAID" ? null : totalPaid > 0 ? "DP/Titip" : "Utang";
  return { totalGrossWeightKg, totalDeductionWeightKg, totalNetWeightKg, totalAmount, totalPaid, remainingBalance, paymentState, initialPaymentContext };
}

/**
 * A cancelled or corrected Sale can release physical stock, but its retained
 * allocation still protects the original Pembelian source from traceability-
 * breaking edits. A permitted hard delete removes its allocation entirely.
 */
export function hasRetainedPurchaseAllocation(sales: SaleRecord[], purchaseItemId: string) {
  return sales.some((sale) => sale.allocations?.some((allocation) => allocation.purchaseItemId === purchaseItemId));
}

export function saleCommoditySummary(items: SaleItem[]) { const labels = items.map((saleItem) => `${saleItem.commodity} ${saleItem.grade}`); return labels.length <= 2 ? labels.join(" • ") : `${labels.slice(0, 2).join(" • ")} • +${labels.length - 2} lainnya`; }
export function saleDeliveryLabel(method: SaleDeliveryMethod) { return method === "EXPEDITION" ? "Ekspedisi" : "Diambil Pembeli"; }
export function buyerTypeLabel(type: BuyerType) { return type === "MARKET" ? "Pasar" : type === "WEIGHER_COLLECTOR" ? "Penimbang/Pengepul" : "Pembeli Umum"; }
export function formatSaleDate(date: string) { return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${date}T00:00:00`)); }
export function sortSalesNewest(sales: SaleRecord[]) { return [...sales].sort((a, b) => b.saleDate.localeCompare(a.saleDate) || b.saleNumber.localeCompare(a.saleNumber)); }
