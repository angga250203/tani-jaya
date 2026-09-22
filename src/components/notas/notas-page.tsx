"use client";

import Link from "next/link";
import { ChevronRight, Printer, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useTotalans } from "@/components/totalans/totalans-provider";
import { useTransactions } from "@/components/transactions/transactions-provider";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatKasbonDate } from "@/lib/kasbons";
import { getAvailableNotas, notaTypeLabel, type NotaType } from "@/lib/notas";
import { cn, formatRupiah } from "@/lib/utils";

type NotaFilter = "ALL" | NotaType;
const filterLabels: Record<NotaFilter, string> = { ALL: "Semua", TRANSACTION: "Transaksi", TOTALAN: "Totalan" };

export function NotasPage() {
  const { transactions } = useTransactions();
  const { totalans } = useTotalans();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<NotaFilter>("ALL");
  const notas = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("id-ID");
    return getAvailableNotas(transactions, totalans).filter((nota) => (
      (filter === "ALL" || nota.type === filter)
      && (!normalized || [nota.number, nota.recipientName, nota.sourceId].some((value) => value.toLocaleLowerCase("id-ID").includes(normalized)))
    ));
  }, [filter, query, totalans, transactions]);

  return <div className="py-5 sm:py-6 lg:py-8"><ContentContainer>
    <PageHeader subtitle="Dokumen transaksi dan pembayaran" title="Nota Digital" />
    <Card className="mt-5 lg:mt-7"><CardContent className="space-y-3 p-4 lg:flex lg:items-center lg:justify-between lg:gap-5 lg:space-y-0 lg:p-5"><div className="relative w-full lg:max-w-xl"><Search aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-tj-muted" size={18} /><Input aria-label="Cari nomor nota atau nama" className="pl-10" onChange={(event) => setQuery(event.target.value)} placeholder="Cari nomor nota atau nama" value={query} /></div><div aria-label="Filter jenis nota" className="flex gap-2 overflow-x-auto pb-0.5 lg:shrink-0" role="group">{(Object.keys(filterLabels) as NotaFilter[]).map((value) => <button className={cn("min-h-10 shrink-0 rounded-xl px-3 text-sm font-semibold", filter === value ? "bg-tj-primary text-white" : "border border-tj-border bg-tj-surface text-tj-muted hover:bg-tj-primary-soft")} key={value} onClick={() => setFilter(value)} type="button">{filterLabels[value]}</button>)}</div></CardContent></Card>
    <div className="mt-4 space-y-3 lg:hidden">{notas.map((nota) => <Link aria-label={`Buka ${nota.number}`} className="block" href={`/nota/${nota.id}`} key={nota.id}><Card className="transition-colors hover:border-tj-primary"><CardContent className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-medium text-tj-muted">{nota.number}</p><p className="mt-1 truncate text-base font-bold text-tj-text">{nota.recipientName}</p><p className="mt-1 text-xs text-tj-muted">{formatKasbonDate(nota.date)}</p></div><ChevronRight aria-hidden="true" className="mt-1 shrink-0 text-tj-primary" size={20} /></div><div className="mt-4 flex items-center justify-between gap-3 border-t border-tj-border pt-3"><StatusBadge status={nota.type === "TRANSACTION" ? "upcoming" : "paid"}>{notaTypeLabel(nota.type)}</StatusBadge><p className="text-sm font-bold text-tj-primary-strong">{formatRupiah(nota.amount)}</p></div></CardContent></Card></Link>)}</div>
    <Card className="mt-4 hidden overflow-hidden lg:block"><div className="overflow-x-auto"><table className="min-w-full text-left"><thead className="border-b border-tj-border bg-tj-canvas text-xs font-semibold text-tj-muted"><tr><th className="px-5 py-3">Nomor Nota</th><th className="px-5 py-3">Tanggal</th><th className="px-5 py-3">Jenis</th><th className="px-5 py-3">Nama</th><th className="px-5 py-3 text-right">Nilai</th><th className="px-5 py-3"><span className="sr-only">Aksi</span></th></tr></thead><tbody className="divide-y divide-tj-border">{notas.map((nota) => <tr className="hover:bg-tj-canvas" key={nota.id}><td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-tj-text">{nota.number}</td><td className="whitespace-nowrap px-5 py-4 text-sm text-tj-muted">{formatKasbonDate(nota.date)}</td><td className="px-5 py-4"><StatusBadge status={nota.type === "TRANSACTION" ? "upcoming" : "paid"}>{notaTypeLabel(nota.type)}</StatusBadge></td><td className="px-5 py-4 text-sm font-semibold text-tj-text">{nota.recipientName}</td><td className="whitespace-nowrap px-5 py-4 text-right text-sm font-bold text-tj-primary-strong">{formatRupiah(nota.amount)}</td><td className="whitespace-nowrap px-5 py-4 text-right"><Link className="inline-flex h-10 items-center gap-1 rounded-lg px-3 text-sm font-semibold text-tj-primary hover:bg-tj-primary-soft" href={`/nota/${nota.id}`}>Buka <ChevronRight aria-hidden="true" size={16} /></Link><Link aria-label={`Cetak ${nota.number}`} className="ml-1 inline-flex h-10 w-10 items-center justify-center rounded-lg text-tj-primary hover:bg-tj-primary-soft" href={`/nota/${nota.id}/cetak`}><Printer aria-hidden="true" size={17} /></Link></td></tr>)}{!notas.length && <tr><td className="px-5 py-8 text-center text-sm text-tj-muted" colSpan={6}>Belum ada nota. Nota transaksi dan totalan akan tersedia setelah data dicatat.</td></tr>}</tbody></table></div></Card>
    {!notas.length && <Card className="mt-4 lg:hidden"><CardContent className="p-5 text-center text-sm leading-6 text-tj-muted">Belum ada nota. Nota transaksi dan totalan akan tersedia setelah data dicatat.</CardContent></Card>}
  </ContentContainer></div>;
}
