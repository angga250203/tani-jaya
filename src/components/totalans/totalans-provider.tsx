"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useKasbons } from "@/components/kasbons/kasbons-provider";
import { readTotalans, type TotalanRecord } from "@/lib/totalans";
import { createClient } from "@/lib/supabase/client";
type Input = { farmerId: string; transactionIds: string[]; requestedKasbonDeduction: number; totalanDate: string };
type Result = { record?: TotalanRecord; error?: string };
type Value = { totalans: TotalanRecord[]; kasbonBalances: Record<string, number>; isLoading: boolean; error: string | null; refresh: () => Promise<boolean>; isPurchaseFinanciallyLocked: (transactionId: string) => boolean; finalizeTotalan: (input: Input) => Promise<Result> };
const Context = createContext<Value | null>(null);
function rpcMessage(error: { message: string }) { const source = error.message; if (source.includes("KASBON_INSUFFICIENT_BALANCE")) return "Potongan kasbon melebihi saldo kasbon saat ini."; if (source.includes("PURCHASE_ALREADY_IN_TOTALAN")) return "Salah satu transaksi baru saja masuk Totalan lain. Data telah diperbarui."; if (source.includes("TOTALAN_FARMER_MISMATCH")) return "Semua transaksi harus berasal dari petani yang sama."; if (source.includes("PURCHASE_NOT_ELIGIBLE")) return "Ada transaksi yang tidak lagi memenuhi syarat Totalan."; if (source.includes("INVALID_KASBON_DEDUCTION")) return "Potongan kasbon tidak valid."; return "Totalan belum dapat diselesaikan. Coba muat ulang data."; }
export function TotalansProvider({ children }: { children: ReactNode }) {
  const { balances: kasbonBalances, refresh: refreshKasbons } = useKasbons(); const [totalans, setTotalans] = useState<TotalanRecord[]>([]); const [isLoading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => { setLoading(true); setError(null); const result = await readTotalans(createClient()); setLoading(false); if (result.error) { setError(result.error); return false; } setTotalans(result.data ?? []); return true; }, []);
  useEffect(() => { void Promise.resolve().then(refresh); }, [refresh]);
  const finalizeTotalan = useCallback(async (input: Input): Promise<Result> => { const { data, error: rpcError } = await createClient().rpc("finalize_totalan", { p_farmer_id: input.farmerId, p_transaction_ids: input.transactionIds, p_totalan_date: input.totalanDate, p_kasbon_deduction_amount: input.requestedKasbonDeduction }); if (rpcError) { await refresh(); return { error: rpcMessage(rpcError) }; } if (!data) return { error: "Totalan belum dapat diselesaikan." }; const [ok] = await Promise.all([refresh(), refreshKasbons()]); if (!ok) return { error: "Totalan tersimpan, tetapi data terbaru belum dapat dimuat." }; const record = (await readTotalans(createClient())).data?.find((row) => row.id === data); return record ? { record } : { error: "Totalan tersimpan, tetapi detail belum dapat dimuat." }; }, [refresh, refreshKasbons]);
  const isPurchaseFinanciallyLocked = useCallback((transactionId: string) => totalans.some((totalan) => totalan.transactions.some((transaction) => transaction.transactionId === transactionId)), [totalans]);
  const value = useMemo(() => ({ totalans, kasbonBalances, isLoading, error, refresh, isPurchaseFinanciallyLocked, finalizeTotalan }), [error, finalizeTotalan, isLoading, isPurchaseFinanciallyLocked, kasbonBalances, refresh, totalans]); return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useTotalans() { const value = useContext(Context); if (!value) throw new Error("useTotalans harus digunakan di dalam TotalansProvider."); return value; }
