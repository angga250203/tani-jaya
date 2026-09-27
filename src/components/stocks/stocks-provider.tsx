"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { readStockSources } from "@/lib/sales-repository";
import type { SaleStockAllocation } from "@/lib/sales";
import type { StockSource } from "@/lib/stocks";
import { createClient } from "@/lib/supabase/client";

type StocksContextValue = {
  sources: StockSource[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<boolean>;
  getSourcesForSaleCorrection: (previous: SaleStockAllocation[]) => StockSource[];
};

const StocksContext = createContext<StocksContextValue | null>(null);

function correctionSources(sources: StockSource[], previous: SaleStockAllocation[]) {
  const result = new Map(sources.map((source) => [source.id, { ...source, containers: source.containers ? [...source.containers] : undefined }]));
  previous.filter((allocation) => !allocation.releasedAt).forEach((allocation) => {
    const current = result.get(allocation.sourceId);
    if (allocation.purchaseContainerId) {
      const container = { id: allocation.purchaseContainerId, label: allocation.purchaseContainerLabel ?? "Wadah", weightKg: allocation.allocatedGrossWeightKg, status: "available" as const };
      if (current) {
        if (!current.containers?.some((entry) => entry.id === container.id)) current.containers = [...(current.containers ?? []), container];
      } else {
        result.set(allocation.sourceId, {
          id: allocation.sourceId,
          purchaseTransactionId: "",
          purchaseItemId: allocation.purchaseItemId,
          purchaseReference: "Pembelian sebelumnya",
          purchaseDate: "",
          sellerType: allocation.sellerType,
          sellerName: allocation.sellerName,
          farmerId: allocation.farmerId,
          commodity: allocation.commodity,
          grade: allocation.grade,
          weighingMethod: allocation.weighingMethod,
          grossIncomingWeightKg: container.weightKg,
          activeAllocatedWeightKg: 0,
          containers: [container],
        });
      }
      return;
    }
    if (current) {
      current.activeAllocatedWeightKg = Math.max(0, current.activeAllocatedWeightKg - allocation.allocatedGrossWeightKg);
      return;
    }
    result.set(allocation.sourceId, {
      id: allocation.sourceId,
      purchaseTransactionId: "",
      purchaseItemId: allocation.purchaseItemId,
      purchaseReference: "Pembelian sebelumnya",
      purchaseDate: "",
      sellerType: allocation.sellerType,
      sellerName: allocation.sellerName,
      farmerId: allocation.farmerId,
      commodity: allocation.commodity,
      grade: allocation.grade,
      weighingMethod: allocation.weighingMethod,
      grossIncomingWeightKg: allocation.allocatedGrossWeightKg,
      activeAllocatedWeightKg: 0,
      containers: undefined,
    });
  });
  return [...result.values()];
}

export function StocksProvider({ children }: { children: ReactNode }) {
  const [sources, setSources] = useState<StockSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++requestVersion.current;
    setIsLoading(true);
    setError(null);
    const result = await readStockSources(createClient());
    if (request !== requestVersion.current) return false;
    setIsLoading(false);
    if (result.error) {
      setError(result.error);
      return false;
    }
    setSources(result.data ?? []);
    return true;
  }, []);

  useEffect(() => {
    let active = true;
    const loadInitialStock = async () => {
      const result = await readStockSources(createClient());
      if (!active) return;
      setIsLoading(false);
      if (result.error) { setError(result.error); return; }
      setSources(result.data ?? []);
    };
    void loadInitialStock();
    return () => { active = false; };
  }, []);

  const getSourcesForSaleCorrection = useCallback((previous: SaleStockAllocation[]) => correctionSources(sources, previous), [sources]);
  const value = useMemo(() => ({ sources, isLoading, error, refresh, getSourcesForSaleCorrection }), [error, getSourcesForSaleCorrection, isLoading, refresh, sources]);
  return <StocksContext.Provider value={value}>{children}</StocksContext.Provider>;
}

export function useStocks() {
  const context = useContext(StocksContext);
  if (!context) throw new Error("useStocks harus digunakan di dalam StocksProvider.");
  return context;
}
