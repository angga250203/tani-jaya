"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useStocks } from "@/components/stocks/stocks-provider";
import { correctSaleArgs, createSaleArgs, readSales, saleErrorMessage } from "@/lib/sales-repository";
import type { SaleCorrectionInput, SaleCreateInput, SaleRecord } from "@/lib/sales";
import { createClient } from "@/lib/supabase/client";

type MutationResult = { sale?: SaleRecord; error?: string };
type SalesContextValue = {
  sales: SaleRecord[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<boolean>;
  createSale: (input: SaleCreateInput) => Promise<MutationResult>;
  recordSalePayment: (saleId: string, amount: number, paymentDate: string) => Promise<MutationResult>;
  correctSale: (saleId: string, input: SaleCorrectionInput) => Promise<MutationResult>;
  cancelSale: (saleId: string, reason: string) => Promise<MutationResult>;
  deleteSale: (saleId: string) => Promise<MutationResult>;
};

const SalesContext = createContext<SalesContextValue | null>(null);

export function SalesProvider({ children }: { children: ReactNode }) {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const { refresh: refreshStock } = useStocks();

  const refresh = useCallback(async () => {
    const request = ++requestVersion.current;
    setIsLoading(true);
    setError(null);
    const result = await readSales(createClient());
    if (request !== requestVersion.current) return false;
    setIsLoading(false);
    if (result.error) {
      setError(result.error);
      return false;
    }
    setSales(result.data ?? []);
    return true;
  }, []);

  useEffect(() => {
    let active = true;
    const loadInitialSales = async () => {
      const result = await readSales(createClient());
      if (!active) return;
      setIsLoading(false);
      if (result.error) { setError(result.error); return; }
      setSales(result.data ?? []);
    };
    void loadInitialSales();
    return () => { active = false; };
  }, []);

  const refreshAfterMutation = useCallback(async (saleId?: string): Promise<MutationResult> => {
    const result = await readSales(createClient());
    await refreshStock();
    if (result.error) return { error: "Perubahan tersimpan, tetapi data Penjualan terbaru belum dapat dimuat." };
    setError(null);
    setSales(result.data ?? []);
    return { sale: saleId ? result.data?.find((sale) => sale.id === saleId) : undefined };
  }, [refreshStock]);

  const createSale = useCallback(async (input: SaleCreateInput): Promise<MutationResult> => {
    const { data, error: rpcError } = await createClient().rpc("create_sale", createSaleArgs(input) as never);
    if (rpcError) return { error: saleErrorMessage(rpcError) };
    return refreshAfterMutation(data);
  }, [refreshAfterMutation]);

  const recordSalePayment = useCallback(async (saleId: string, amount: number, paymentDate: string): Promise<MutationResult> => {
    const { error: rpcError } = await createClient().rpc("record_sale_payment", { p_sale_id: saleId, p_amount: amount, p_payment_date: paymentDate });
    if (rpcError) return { error: saleErrorMessage(rpcError) };
    return refreshAfterMutation(saleId);
  }, [refreshAfterMutation]);

  const correctSale = useCallback(async (saleId: string, input: SaleCorrectionInput): Promise<MutationResult> => {
    const { error: rpcError } = await createClient().rpc("correct_sale", correctSaleArgs(saleId, input) as never);
    if (rpcError) return { error: saleErrorMessage(rpcError) };
    return refreshAfterMutation(saleId);
  }, [refreshAfterMutation]);

  const cancelSale = useCallback(async (saleId: string, reason: string): Promise<MutationResult> => {
    const { error: rpcError } = await createClient().rpc("cancel_sale", { p_sale_id: saleId, p_reason: reason.trim() });
    if (rpcError) return { error: saleErrorMessage(rpcError) };
    return refreshAfterMutation(saleId);
  }, [refreshAfterMutation]);

  const deleteSale = useCallback(async (saleId: string): Promise<MutationResult> => {
    const { error: rpcError } = await createClient().rpc("delete_sale_without_payments", { p_sale_id: saleId });
    if (rpcError) return { error: saleErrorMessage(rpcError) };
    await Promise.all([refresh(), refreshStock()]);
    return {};
  }, [refresh, refreshStock]);

  const value = useMemo(() => ({ sales, isLoading, error, refresh, createSale, recordSalePayment, correctSale, cancelSale, deleteSale }), [cancelSale, correctSale, createSale, deleteSale, error, isLoading, recordSalePayment, refresh, sales]);
  return <SalesContext.Provider value={value}>{children}</SalesContext.Provider>;
}

export function useSales() {
  const context = useContext(SalesContext);
  if (!context) throw new Error("useSales harus digunakan di dalam SalesProvider.");
  return context;
}
