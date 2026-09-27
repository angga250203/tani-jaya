"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { purchaseErrorMessage, readPurchases, toPurchasePayload } from "@/lib/purchases";
import { createClient } from "@/lib/supabase/client";
import type { TransactionRecord } from "@/lib/transactions";
import type { TransactionFormValues } from "@/lib/validations";

type PurchaseMutationResult = { record?: TransactionRecord; error?: string };

type TransactionsContextValue = {
  transactions: TransactionRecord[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<boolean>;
  createTransaction: (values: TransactionFormValues) => Promise<PurchaseMutationResult>;
  updateTransaction: (id: string, values: TransactionFormValues) => Promise<PurchaseMutationResult>;
  /** Totalan is finalized by its own RPC and must never mutate Purchases locally. */
  settleTransactionsInTotalan: (transactionIds: string[], totalanId: string) => void;
};

const TransactionsContext = createContext<TransactionsContextValue | null>(null);

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++requestVersion.current;
    setIsLoading(true);
    setError(null);
    const result = await readPurchases(createClient());
    if (request !== requestVersion.current) return false;

    setIsLoading(false);
    if (result.error) {
      setError(result.error);
      return false;
    }

    setTransactions(result.data ?? []);
    return true;
  }, []);

  useEffect(() => {
    let active = true;
    const loadInitialPurchases = async () => {
      const result = await readPurchases(createClient());
      if (!active) return;
      setIsLoading(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      setTransactions(result.data ?? []);
    };
    void loadInitialPurchases();
    return () => { active = false; };
  }, []);

  const reloadAfterMutation = useCallback(async (transactionId: string): Promise<PurchaseMutationResult> => {
    const request = ++requestVersion.current;
    setIsLoading(true);
    setError(null);
    const result = await readPurchases(createClient());
    if (request !== requestVersion.current) return { error: "Pembaruan data Pembelian dibatalkan." };

    setIsLoading(false);
    if (result.error) {
      setError(result.error);
      return { error: result.error };
    }

    const refreshed = result.data ?? [];
    setTransactions(refreshed);
    const record = refreshed.find((transaction) => transaction.id === transactionId);
    return record ? { record } : { error: "Pembelian sudah tersimpan, tetapi data terbaru belum dapat dimuat." };
  }, []);

  const createTransaction = useCallback(async (values: TransactionFormValues): Promise<PurchaseMutationResult> => {
    const { data, error: rpcError } = await createClient().rpc("create_purchase", { p_payload: toPurchasePayload(values) });
    if (rpcError) return { error: purchaseErrorMessage(rpcError) };
    const result = data?.[0];
    if (!result?.transaction_id) return { error: "Pembelian belum dapat disimpan. Coba lagi." };
    return reloadAfterMutation(result.transaction_id);
  }, [reloadAfterMutation]);

  const updateTransaction = useCallback(async (id: string, values: TransactionFormValues): Promise<PurchaseMutationResult> => {
    const { data, error: rpcError } = await createClient().rpc("update_purchase", {
      p_transaction_id: id,
      p_payload: toPurchasePayload(values),
    });
    if (rpcError) return { error: purchaseErrorMessage(rpcError) };
    const result = data?.[0];
    if (!result?.transaction_id) return { error: "Pembelian belum dapat diperbarui. Coba lagi." };
    return reloadAfterMutation(result.transaction_id);
  }, [reloadAfterMutation]);

  const settleTransactionsInTotalan = useCallback((_transactionIds: string[], _totalanId: string) => {
    // Intentionally empty: Totalan is still a mock module and cannot alter the
    // real Purchase source of truth before its own Supabase integration.
    void _transactionIds;
    void _totalanId;
  }, []);

  const value = useMemo(() => ({
    transactions,
    isLoading,
    error,
    refresh,
    createTransaction,
    updateTransaction,
    settleTransactionsInTotalan,
  }), [createTransaction, error, isLoading, refresh, settleTransactionsInTotalan, transactions, updateTransaction]);

  return <TransactionsContext.Provider value={value}>{children}</TransactionsContext.Provider>;
}

export function useTransactions() {
  const context = useContext(TransactionsContext);
  if (!context) throw new Error("useTransactions harus digunakan di dalam TransactionsProvider.");
  return context;
}
