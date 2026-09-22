"use client";

import { Printer } from "lucide-react";
import { useTotalans } from "@/components/totalans/totalans-provider";
import { useTransactions } from "@/components/transactions/transactions-provider";
import { Button } from "@/components/ui/button";
import { getNotaSource } from "@/lib/notas";
import { NotaDocument } from "./nota-document";

export function NotaPrintPage({ notaId }: { notaId: string }) {
  const { transactions } = useTransactions();
  const { totalans } = useTotalans();
  const source = getNotaSource(notaId, transactions, totalans);
  if (!source) return <main className="mx-auto max-w-3xl p-6"><p className="text-sm text-slate-700">Nota tidak ditemukan.</p></main>;
  return <main className="min-h-dvh bg-white px-4 py-6 sm:px-8 sm:py-10"><div className="mx-auto max-w-[820px]"><div className="mb-5 flex justify-end print:hidden"><Button aria-label="Cetak atau simpan PDF" onClick={() => window.print()}><Printer aria-hidden="true" size={18} />Cetak / Simpan PDF</Button></div><NotaDocument className="rounded-none shadow-none print:border-0 print:p-0" nota={source.nota} totalan={"totalan" in source ? source.totalan : undefined} transaction={"transaction" in source ? source.transaction : undefined} /></div></main>;
}
