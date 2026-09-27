"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { calculateKasbonBalances, readKasbonEntries, type KasbonEntry } from "@/lib/kasbons";
import { createClient } from "@/lib/supabase/client";
type AddKasbonInput = { farmerId: string; date: string; amount: number; note?: string };
type Result = { error?: string };
type Value = { entries: KasbonEntry[]; balances: Record<string, number>; isLoading: boolean; error: string | null; refresh: () => Promise<boolean>; getBalance: (farmerId: string) => number; getEntries: (farmerId: string) => KasbonEntry[]; addKasbon: (input: AddKasbonInput) => Promise<Result> };
const Context = createContext<Value | null>(null);
const message = (error: { message: string } | null) => error?.message.includes("INVALID_KASBON_AMOUNT") ? "Nominal kasbon harus lebih dari Rp0." : error?.message.includes("INVALID_FARMER") ? "Petani tidak valid." : "Kasbon belum dapat disimpan. Coba lagi.";
export function KasbonsProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<KasbonEntry[]>([]); const [isLoading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => { setLoading(true); setError(null); const result = await readKasbonEntries(createClient()); setLoading(false); if (result.error) { setError(result.error); return false; } setEntries(result.data ?? []); return true; }, []);
  useEffect(() => { void Promise.resolve().then(refresh); }, [refresh]);
  const balances = useMemo(() => calculateKasbonBalances(entries), [entries]);
  const getBalance = useCallback((farmerId: string) => balances[farmerId] ?? 0, [balances]);
  const getEntries = useCallback((farmerId: string) => entries.filter((entry) => entry.farmerId === farmerId), [entries]);
  const addKasbon = useCallback(async (input: AddKasbonInput): Promise<Result> => { const { error: rpcError } = await createClient().rpc("create_kasbon_advance", { p_farmer_id: input.farmerId, p_entry_date: input.date, p_amount: input.amount, p_notes: input.note?.trim() ?? "" }); if (rpcError) return { error: message(rpcError) }; return await refresh() ? {} : { error: "Kasbon tersimpan, tetapi riwayat terbaru belum dapat dimuat." }; }, [refresh]);
  const value = useMemo(() => ({ entries, balances, isLoading, error, refresh, getBalance, getEntries, addKasbon }), [addKasbon, balances, entries, error, getBalance, getEntries, isLoading, refresh]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useKasbons() { const value = useContext(Context); if (!value) throw new Error("useKasbons harus digunakan di dalam KasbonsProvider."); return value; }
