"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { useTotalans } from "@/components/totalans/totalans-provider";
import { useTransactions } from "@/components/transactions/transactions-provider";
import { ContentContainer } from "@/components/layout/content-container";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getNotaSource } from "@/lib/notas";
import { cn } from "@/lib/utils";
import { NotaDocument } from "./nota-document";

export function NotaDetailPage({ notaId }: { notaId: string }) {
  const { transactions } = useTransactions();
  const { totalans } = useTotalans();
  const source = getNotaSource(notaId, transactions, totalans);
  if (!source) return <div className="py-5"><ContentContainer><Card className="mx-auto max-w-xl"><CardContent className="p-5"><h1 className="text-lg font-bold text-tj-text">Nota tidak ditemukan</h1><Link className="mt-3 inline-flex text-sm font-semibold text-tj-primary hover:underline" href="/nota">Kembali ke Nota Digital</Link></CardContent></Card></ContentContainer></div>;
  return <div className="py-5 sm:py-6 lg:py-8"><ContentContainer><header className="flex items-center gap-3 border-b border-tj-border pb-5 print:hidden lg:pb-6"><Link aria-label="Kembali ke Nota Digital" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-tj-muted hover:bg-tj-primary-soft hover:text-tj-primary" href="/nota"><ArrowLeft aria-hidden="true" size={21} /></Link><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-tj-muted sm:text-sm">Dokumen hanya-baca</p><h1 className="truncate text-[19px] font-bold leading-6 tracking-[-0.02em] text-tj-text lg:text-[28px] lg:leading-8">Nota Digital</h1></div><Link className={cn(buttonVariants({ variant: "secondary" }), "h-11 px-3.5 sm:px-4")} href={`/nota/${source.nota.id}/cetak`}><Printer aria-hidden="true" size={18} />Cetak</Link></header><div className="mx-auto mt-5 max-w-[860px] lg:mt-7"><NotaDocument nota={source.nota} totalan={"totalan" in source ? source.totalan : undefined} transaction={"transaction" in source ? source.transaction : undefined} /></div></ContentContainer></div>;
}
