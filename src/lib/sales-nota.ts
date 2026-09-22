import {
  buyerTypeLabel,
  deriveSaleTotals,
  formatSaleDate,
  saleDeliveryLabel,
  type SaleRecord,
} from "@/lib/sales";
import type { TransactionRecord, WeighingMethod } from "@/lib/transactions";

/**
 * Buyer-facing projection for a Sales Nota. Intentionally excludes allocations,
 * source sellers, purchase IDs, and internal expedition data.
 */
export type SalesNotaView = {
  saleId: string;
  number: string;
  date: string;
  buyerName: string;
  buyerType: string;
  deliveryMethod: string;
  cancelled: boolean;
  paymentLabel: "Lunas" | "Belum Lunas" | "Dibatalkan";
  items: Array<{
    id: string;
    commodity: string;
    grade: string;
    grossWeightKg: number;
    deductionWeightKg: number;
    netWeightKg: number;
    pricePerKg: number;
    subtotal: number;
    weighingMethod: WeighingMethod;
    containerWeights: number[];
    containerDetailMessage?: string;
  }>;
  totals: {
    grossWeightKg: number;
    deductionWeightKg: number;
    netWeightKg: number;
    amount: number;
    paid: number;
    remaining: number;
  };
  lastPayment?: { date: string; amount: number };
};

function saleItemContainerDetail(sale: SaleRecord, saleItemId: string, grossWeightKg: number, transactions: TransactionRecord[]) {
  const allocations = (sale.allocations ?? []).filter((allocation) => allocation.saleItemId === saleItemId);
  const containerAllocations = allocations.filter((allocation) => allocation.purchaseContainerId);
  const containerMethod = containerAllocations[0]?.weighingMethod;

  if (!containerMethod) return { weighingMethod: "TOTAL_LANGSUNG" as const, containerWeights: [] };
  if (containerMethod === "TOTAL_LANGSUNG") return { weighingMethod: "TOTAL_LANGSUNG" as const, containerWeights: [] };

  const purchaseItems = new Map(transactions.flatMap((transaction) => transaction.items).map((item) => [item.id, item]));
  const weights = containerAllocations.map((allocation) => {
    const purchaseItem = purchaseItems.get(allocation.purchaseItemId);
    const prefix = `${allocation.purchaseItemId}:container:`;
    const position = allocation.purchaseContainerId?.startsWith(prefix) ? Number(allocation.purchaseContainerId.slice(prefix.length)) : Number.NaN;
    const weight = Number.isInteger(position) && position > 0 ? purchaseItem?.containerWeights[position - 1] : undefined;
    return purchaseItem?.weighingMethod === containerMethod && weight === allocation.allocatedGrossWeightKg ? weight : undefined;
  });
  const hasMissingContainer = weights.some((weight) => weight === undefined);
  const resolvedWeights = weights.filter((weight): weight is number => weight !== undefined);
  const containerTotal = resolvedWeights.reduce((total, weight) => total + weight, 0);
  const hasDirectAllocation = allocations.some((allocation) => !allocation.purchaseContainerId);
  const multipleContainerMethods = containerAllocations.some((allocation) => allocation.weighingMethod !== containerMethod);
  const containerDetailMessage = hasMissingContainer || multipleContainerMethods
    ? "Rincian wadah tidak dapat ditampilkan lengkap."
    : hasDirectAllocation
      ? "Sebagian berat ditimbang langsung."
      : containerTotal !== grossWeightKg
        ? "Total wadah tidak sesuai dengan berat fisik."
        : undefined;

  return { weighingMethod: containerMethod, containerWeights: resolvedWeights, containerDetailMessage };
}

export function toSalesNotaView(sale: SaleRecord, transactions: TransactionRecord[]): SalesNotaView {
  const totals = deriveSaleTotals(sale);
  const latestPayment = sale.payments.at(-1);
  return {
    saleId: sale.id,
    number: sale.saleNumber,
    date: formatSaleDate(sale.saleDate),
    buyerName: sale.buyerName,
    buyerType: buyerTypeLabel(sale.buyerType),
    deliveryMethod: saleDeliveryLabel(sale.deliveryMethod),
    cancelled: sale.lifecycleStatus === "CANCELLED",
    paymentLabel: totals.paymentState === "CANCELLED" ? "Dibatalkan" : totals.paymentState === "PAID" ? "Lunas" : "Belum Lunas",
    items: sale.items.map((item) => ({ ...item, ...saleItemContainerDetail(sale, item.id, item.grossWeightKg, transactions) })),
    totals: {
      grossWeightKg: totals.totalGrossWeightKg,
      deductionWeightKg: totals.totalDeductionWeightKg,
      netWeightKg: totals.totalNetWeightKg,
      amount: totals.totalAmount,
      paid: totals.totalPaid,
      remaining: totals.remainingBalance,
    },
    lastPayment: latestPayment ? { date: formatSaleDate(latestPayment.paymentDate), amount: latestPayment.amount } : undefined,
  };
}
