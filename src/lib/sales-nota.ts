import {
  buyerTypeLabel,
  deriveSaleTotals,
  formatSaleDate,
  saleDeliveryLabel,
  type SaleRecord,
} from "@/lib/sales";
import type { WeighingMethod } from "@/lib/transactions";

/** Buyer-facing projection; it deliberately excludes internal purchase data. */
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
  totals: { grossWeightKg: number; deductionWeightKg: number; netWeightKg: number; amount: number; paid: number; remaining: number };
  lastPayment?: { date: string; amount: number };
};

function saleItemContainerDetail(sale: SaleRecord, saleItemId: string, grossWeightKg: number) {
  const allocations = sale.allocations.filter((allocation) => allocation.saleItemId === saleItemId && !allocation.releasedAt);
  const containers = allocations.filter((allocation) => allocation.purchaseContainerId);
  if (!containers.length) return { weighingMethod: "TOTAL_LANGSUNG" as const, containerWeights: [] };

  const weighingMethod = containers[0].weighingMethod;
  const containerWeights = containers.map((allocation) => allocation.allocatedGrossWeightKg);
  const containerTotal = containerWeights.reduce((sum, weight) => sum + weight, 0);
  const directWeight = allocations.filter((allocation) => !allocation.purchaseContainerId).reduce((sum, allocation) => sum + allocation.allocatedGrossWeightKg, 0);
  const multipleMethods = new Set(containers.map((allocation) => allocation.weighingMethod)).size > 1;
  return {
    weighingMethod,
    containerWeights,
    containerDetailMessage: multipleMethods || containerTotal !== grossWeightKg - directWeight
      ? "Rincian wadah ditampilkan sesuai berat fisik yang dialokasikan."
      : directWeight > 0 ? `Sebagian berat ditimbang langsung (${directWeight} kg).` : undefined,
  };
}

export function toSalesNotaView(sale: SaleRecord): SalesNotaView {
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
    items: sale.items.map((item) => ({ ...item, ...saleItemContainerDetail(sale, item.id, item.grossWeightKg) })),
    totals: { grossWeightKg: totals.totalGrossWeightKg, deductionWeightKg: totals.totalDeductionWeightKg, netWeightKg: totals.totalNetWeightKg, amount: totals.totalAmount, paid: totals.totalPaid, remaining: totals.remainingBalance },
    lastPayment: latestPayment ? { date: formatSaleDate(latestPayment.paymentDate), amount: latestPayment.amount } : undefined,
  };
}
