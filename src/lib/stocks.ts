import type { SellerType, WeighingMethod } from "@/lib/transactions";

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

export function allocatedStockWeight(source: StockSource) { return source.containers ? source.containers.filter((container) => container.status === "allocated").reduce((total, container) => total + container.weightKg, 0) : source.activeAllocatedWeightKg; }
export function availableStockWeight(source: StockSource) { return Math.max(0, source.grossIncomingWeightKg - allocatedStockWeight(source)); }
export function stockSummary(sources: StockSource[]) {
  const availableSources = sources.filter((source) => availableStockWeight(source) > 0);
  const availableWeight = (predicate: (source: StockSource) => boolean) => availableSources.filter(predicate).reduce((total, source) => total + availableStockWeight(source), 0);
  return { totalAvailableWeightKg: availableWeight(() => true), totalAllocatedWeightKg: sources.reduce((total, source) => total + allocatedStockWeight(source), 0), activeSourceCount: availableSources.length, commodityCount: new Set(availableSources.map((source) => source.commodity)).size, superWeightKg: availableWeight((source) => source.grade === "SP"), otherGradeWeightKg: availableWeight((source) => source.grade === "TG" || source.grade === "BR") };
}
export function weighingMethodLabel(method: WeighingMethod) { return method === "PER_KARUNG" ? "Per Karung" : method === "PER_PETI" ? "Per Peti" : "Timbang Langsung"; }
