"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useTransactions } from "@/components/transactions/transactions-provider";
import { initialSales, type SaleStockAllocation } from "@/lib/sales";
import { availableStockWeight, deriveStockSources, type StockSource } from "@/lib/stocks";

type StocksContextValue = { sources: StockSource[]; reserveStock: (allocations: SaleStockAllocation[]) => boolean; releaseStock: (allocations: SaleStockAllocation[]) => void; replaceSaleStock: (previous: SaleStockAllocation[], next: SaleStockAllocation[]) => boolean; getSourcesForSaleCorrection: (previous: SaleStockAllocation[]) => StockSource[] };
const StocksContext = createContext<StocksContextValue | null>(null);
const initialActiveAllocations = initialSales.filter((sale) => sale.lifecycleStatus === "ACTIVE").flatMap((sale) => sale.allocations ?? []);

function canReserve(sources: StockSource[], allocations: SaleStockAllocation[]) {
  const containerIds = allocations.flatMap((allocation) => allocation.purchaseContainerId ? [`${allocation.sourceId}:${allocation.purchaseContainerId}`] : []);
  if (new Set(containerIds).size !== containerIds.length) return false;
  const directBySource = new Map<string, number>();
  for (const allocation of allocations) {
    const source = sources.find((item) => item.id === allocation.sourceId);
    if (!source || source.purchaseItemId !== allocation.purchaseItemId || allocation.allocatedGrossWeightKg <= 0) return false;
    if (allocation.purchaseContainerId) {
      if (!source.containers?.some((container) => container.id === allocation.purchaseContainerId && container.status === "available" && container.weightKg === allocation.allocatedGrossWeightKg)) return false;
    } else {
      if (source.containers) return false;
      directBySource.set(source.id, (directBySource.get(source.id) ?? 0) + allocation.allocatedGrossWeightKg);
    }
  }
  return [...directBySource.entries()].every(([sourceId, weight]) => weight <= availableStockWeight(sources.find((source) => source.id === sourceId)!));
}

export function StocksProvider({ children }: { children: ReactNode }) {
  const { transactions } = useTransactions();
  const [activeAllocations, setActiveAllocations] = useState<SaleStockAllocation[]>(initialActiveAllocations);
  const sources = useMemo(() => deriveStockSources(transactions, activeAllocations), [activeAllocations, transactions]);
  const reserveStock = useCallback((allocations: SaleStockAllocation[]) => {
    if (!canReserve(sources, allocations)) return false;
    setActiveAllocations((current) => [...current, ...allocations]);
    return true;
  }, [sources]);
  const releaseStock = useCallback((allocations: SaleStockAllocation[]) => setActiveAllocations((current) => current.filter((active) => !allocations.some((allocation) => allocation.id === active.id))), []);
  const replaceSaleStock = useCallback((previous: SaleStockAllocation[], next: SaleStockAllocation[]) => {
    const candidate = activeAllocations.filter((active) => !previous.some((allocation) => allocation.id === active.id));
    if (!canReserve(deriveStockSources(transactions, candidate), next)) return false;
    setActiveAllocations([...candidate, ...next]);
    return true;
  }, [activeAllocations, transactions]);
  const getSourcesForSaleCorrection = useCallback((previous: SaleStockAllocation[]) => deriveStockSources(transactions, activeAllocations.filter((active) => !previous.some((allocation) => allocation.id === active.id))), [activeAllocations, transactions]);
  const value = useMemo(() => ({ sources, reserveStock, releaseStock, replaceSaleStock, getSourcesForSaleCorrection }), [getSourcesForSaleCorrection, releaseStock, replaceSaleStock, reserveStock, sources]);
  return <StocksContext.Provider value={value}>{children}</StocksContext.Provider>;
}

export function useStocks() { const context = useContext(StocksContext); if (!context) throw new Error("useStocks harus digunakan di dalam StocksProvider."); return context; }
