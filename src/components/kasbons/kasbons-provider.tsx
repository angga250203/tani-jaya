"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { calculateKasbonBalance, calculateKasbonBalances, initialKasbonEntries, type KasbonEntry } from "@/lib/kasbons";

type AddKasbonInput = {
  farmerId: string;
  date: string;
  amount: number;
  note?: string;
};

type KasbonsContextValue = {
  entries: KasbonEntry[];
  balances: Record<string, number>;
  getBalance: (farmerId: string) => number;
  getEntries: (farmerId: string) => KasbonEntry[];
  addKasbon: (input: AddKasbonInput) => KasbonEntry;
  recordTotalanDeduction: (input: { farmerId: string; totalanId: string; date: string; amount: number }) => KasbonEntry | undefined;
};

const KasbonsContext = createContext<KasbonsContextValue | null>(null);

export function KasbonsProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<KasbonEntry[]>(initialKasbonEntries);
  const balances = useMemo(() => calculateKasbonBalances(entries), [entries]);

  const getBalance = useCallback((farmerId: string) => balances[farmerId] ?? 0, [balances]);
  const getEntries = useCallback(
    (farmerId: string) => entries.filter((entry) => entry.farmerId === farmerId).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [entries],
  );

  const addKasbon = useCallback((input: AddKasbonInput) => {
    const entry: KasbonEntry = {
      id: `kasbon-local-${Date.now()}`,
      farmerId: input.farmerId,
      date: input.date,
      type: "GIVEN",
      amount: input.amount,
      note: input.note?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    setEntries((current) => [entry, ...current]);
    return entry;
  }, []);

  const recordTotalanDeduction = useCallback((input: { farmerId: string; totalanId: string; date: string; amount: number }) => {
    if (input.amount <= 0 || input.amount > calculateKasbonBalance(entries.filter((entry) => entry.farmerId === input.farmerId))) return undefined;
    const entry: KasbonEntry = {
      id: `kasbon-totalan-${input.totalanId}`,
      farmerId: input.farmerId,
      date: input.date,
      type: "TOTALAN_DEDUCTION",
      amount: input.amount,
      relatedTotalanId: input.totalanId,
      createdAt: new Date().toISOString(),
    };
    setEntries((current) => [entry, ...current]);
    return entry;
  }, [entries]);

  const value = useMemo(() => ({ entries, balances, getBalance, getEntries, addKasbon, recordTotalanDeduction }), [addKasbon, balances, entries, getBalance, getEntries, recordTotalanDeduction]);
  return <KasbonsContext.Provider value={value}>{children}</KasbonsContext.Provider>;
}

export function useKasbons() {
  const context = useContext(KasbonsContext);
  if (!context) throw new Error("useKasbons harus digunakan di dalam KasbonsProvider.");
  return context;
}
