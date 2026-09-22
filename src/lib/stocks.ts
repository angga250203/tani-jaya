import type { SaleStockAllocation } from "@/lib/sales";
import type { SellerType, TransactionRecord, WeighingMethod } from "@/lib/transactions";

export type StockGrade = "SP" | "TG" | "BR";

export type StockContainer = { id: string; label: string; weightKg: number; status: "available" | "allocated" };

/** A read model derived from one Purchase item; physical stock-in is its gross weight. */
export type StockSource = {
  id: string;
  purchaseTransactionId: string;
  purchaseItemId: string;
  purchaseReference: string;
  purchaseDate: string;
  sellerType: SellerType;
  sellerName: string;
  farmerId?: string;
  commodity: string;
  grade: StockGrade;
  weighingMethod: WeighingMethod;
  grossIncomingWeightKg: number;
  activeAllocatedWeightKg: number;
  containers?: StockContainer[];
};

export const gradeLabels: Record<StockGrade, string> = { SP: "Super", TG: "Tanggung", BR: "Barang Jelek" };

function containerId(purchaseItemId: string, index: number) { return `${purchaseItemId}:container:${index + 1}`; }

/** The sole stock projection used by the mock app. No independently editable stock exists. */
export function deriveStockSources(transactions: TransactionRecord[], activeAllocations: SaleStockAllocation[]): StockSource[] {
  return transactions.flatMap((transaction) => transaction.items.map((item) => {
    const itemAllocations = activeAllocations.filter((allocation) => allocation.purchaseItemId === item.id);
    const containers = item.weighingMethod === "TOTAL_LANGSUNG" ? undefined : item.containerWeights.map((weightKg, index) => {
      const id = containerId(item.id, index);
      return {
        id,
        label: `${item.weighingMethod === "PER_KARUNG" ? "Karung" : "Peti"} #${index + 1}`,
        weightKg,
        status: itemAllocations.some((allocation) => allocation.purchaseContainerId === id) ? "allocated" as const : "available" as const,
      };
    });
    return {
      id: item.id,
      purchaseTransactionId: transaction.id,
      purchaseItemId: item.id,
      purchaseReference: transaction.id,
      purchaseDate: transaction.transactionDate,
      sellerType: transaction.sellerType,
      sellerName: transaction.sellerName,
      farmerId: transaction.farmerId,
      commodity: item.commodity,
      grade: item.grade,
      weighingMethod: item.weighingMethod,
      grossIncomingWeightKg: item.grossWeight,
      activeAllocatedWeightKg: containers ? 0 : itemAllocations.reduce((total, allocation) => total + allocation.allocatedGrossWeightKg, 0),
      containers,
    };
  }));
}

export function allocatedStockWeight(source: StockSource) { return source.containers ? source.containers.filter((container) => container.status === "allocated").reduce((total, container) => total + container.weightKg, 0) : source.activeAllocatedWeightKg; }
export function availableStockWeight(source: StockSource) { return Math.max(0, source.grossIncomingWeightKg - allocatedStockWeight(source)); }
export function stockSummary(sources: StockSource[]) {
  const availableSources = sources.filter((source) => availableStockWeight(source) > 0);
  const availableWeight = (predicate: (source: StockSource) => boolean) => availableSources.filter(predicate).reduce((total, source) => total + availableStockWeight(source), 0);
  return { totalAvailableWeightKg: availableWeight(() => true), totalAllocatedWeightKg: sources.reduce((total, source) => total + allocatedStockWeight(source), 0), activeSourceCount: availableSources.length, commodityCount: new Set(availableSources.map((source) => source.commodity)).size, superWeightKg: availableWeight((source) => source.grade === "SP"), otherGradeWeightKg: availableWeight((source) => source.grade === "TG" || source.grade === "BR") };
}
export function weighingMethodLabel(method: WeighingMethod) { return method === "PER_KARUNG" ? "Per Karung" : method === "PER_PETI" ? "Per Peti" : "Timbang Langsung"; }
