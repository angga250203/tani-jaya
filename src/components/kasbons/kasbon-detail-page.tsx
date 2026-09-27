"use client";

import Link from "next/link";
import { ArrowLeft, ChevronRight, HandCoins, Plus, WalletCards } from "lucide-react";
import { useMemo } from "react";
import { useFarmers } from "@/components/farmers/farmers-provider";
import { useKasbons } from "@/components/kasbons/kasbons-provider";
import { ContentContainer } from "@/components/layout/content-container";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatKasbonDate, getKasbonTotals, isKasbonCredit } from "@/lib/kasbons";
import type { Farmer } from "@/lib/farmers";
import { cn, formatRupiah } from "@/lib/utils";

function Summary({ label, value }: { label: string; value: string }) { return <Card><CardContent className="p-3.5"><p className="text-xs text-tj-muted">{label}</p><p className="mt-1.5 text-base font-bold tracking-[-0.02em] text-tj-text">{value}</p></CardContent></Card>; }

export function KasbonDetailPage({ farmerId, initialFarmer }: { farmerId: string; initialFarmer?: Farmer }) {
  const { records } = useFarmers();
  const { getBalance, getEntries, isLoading, error, refresh } = useKasbons();
  const farmer = records.find((record) => record.id === farmerId) ?? initialFarmer;
  const entries = getEntries(farmerId);
  const balance = getBalance(farmerId);
  const totals = useMemo(() => getKasbonTotals(entries), [entries]);
  if (isLoading && !farmer) return <div className="py-5"><ContentContainer><Card className="max-w-xl"><CardContent className="p-5 text-sm text-tj-muted">Memuat Kasbon…</CardContent></Card></ContentContainer></div>;
  if (error && !farmer) return <div className="py-5"><ContentContainer><Card className="max-w-xl"><CardContent className="p-5"><h1 className="text-lg font-bold text-tj-text">Kasbon belum dapat dimuat</h1><button className="mt-3 text-sm font-semibold text-tj-primary" onClick={() => void refresh()} type="button">Coba lagi</button></CardContent></Card></ContentContainer></div>;
  if (!farmer) {
    return <div className="py-5"><ContentContainer><Card className="max-w-xl"><CardContent className="p-5"><h1 className="text-lg font-bold text-tj-text">Petani tidak ditemukan</h1><Link className="mt-3 inline-flex text-sm font-semibold text-tj-primary hover:underline" href="/kasbon">Kembali ke Kasbon</Link></CardContent></Card></ContentContainer></div>;
  }
  const canAddKasbon = farmer.status === "active";

  return <div className="py-5 sm:py-6 lg:py-8"><ContentContainer>
    <header className="flex items-center gap-3 border-b border-tj-border pb-5 lg:pb-6"><Link aria-label="Kembali ke Kasbon" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-tj-muted hover:bg-tj-primary-soft hover:text-tj-primary" href="/kasbon"><ArrowLeft aria-hidden="true" size={21} /></Link><div className="min-w-0 flex-1"><p className="text-xs font-medium text-tj-muted sm:text-sm">Kasbon</p><h1 className="truncate text-[19px] font-bold leading-6 tracking-[-0.02em] text-tj-text lg:text-[28px] lg:leading-8">Detail Kasbon</h1></div>{canAddKasbon && <Link className={cn(buttonVariants({ size: "default" }), "h-11 px-3.5 sm:px-4")} href={`/kasbon/${farmer.id}/baru`}><Plus aria-hidden="true" size={18} strokeWidth={2.5} />Tambah Kasbon</Link>}</header>
    <div className="mt-5 space-y-5 lg:mt-7 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6 lg:space-y-0">
      <Card className="lg:col-span-2"><CardContent className="flex items-start gap-3 p-4 lg:p-5"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tj-primary-soft text-sm font-bold text-tj-primary-strong">{farmer.initials}</span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-tj-text">{farmer.name}</h2><p className="mt-1 text-sm text-tj-muted">{farmer.landmark}</p></div><StatusBadge status={farmer.status === "active" ? "today" : "neutral"}>{farmer.status === "active" ? "Aktif" : "Nonaktif"}</StatusBadge></div></div></CardContent></Card>
      <aside className="space-y-4 lg:col-start-2 lg:row-start-2 lg:sticky lg:top-8"><Card><CardContent className="p-4 lg:p-5"><p className="text-sm text-tj-muted">Saldo Kasbon Saat Ini</p><p className="mt-1 text-[28px] font-bold tracking-[-0.03em] text-tj-primary-strong">{formatRupiah(balance)}</p>{canAddKasbon ? <Link className={cn(buttonVariants({ size: "default" }), "mt-4 w-full")} href={`/kasbon/${farmer.id}/baru`}><Plus aria-hidden="true" size={18} />Tambah Kasbon</Link> : <p className="mt-4 rounded-xl bg-tj-info-soft p-3 text-sm leading-5 text-tj-info">Petani nonaktif tetap memiliki riwayat kasbon, tetapi penambahan kasbon baru dinonaktifkan. {/* TODO: konfirmasi aturan bisnis final untuk kasbon petani nonaktif. */}</p>}</CardContent></Card><div className="grid grid-cols-2 gap-3 lg:grid-cols-1"><Summary label="Total Kasbon Diberikan" value={formatRupiah(totals.given)} /><Summary label="Total Potongan/Pembayaran" value={formatRupiah(totals.deducted)} /></div></aside>
      <section className="lg:col-start-1 lg:row-start-2"><div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="text-base font-bold text-tj-text">Riwayat Kasbon</h2><p className="mt-0.5 text-sm text-tj-muted">Catatan tidak dapat diubah atau dihapus dari halaman ini.</p></div><WalletCards aria-hidden="true" className="shrink-0 text-tj-primary" size={20} /></div><Card><CardContent className="divide-y divide-tj-border p-0">{entries.map((entry) => { const credit = isKasbonCredit(entry); return <div className="flex items-start gap-3 p-4" key={entry.id}><span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", credit ? "bg-tj-primary-soft text-tj-primary" : "bg-tj-warning-soft text-tj-warning")}><HandCoins aria-hidden="true" size={18} /></span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-tj-text">{credit ? "Kasbon diberikan" : "Potongan totalan"}</p><p className="mt-0.5 text-xs text-tj-muted">{formatKasbonDate(entry.date)}</p></div><p className={cn("shrink-0 text-sm font-bold", credit ? "text-tj-primary-strong" : "text-tj-warning")}>{credit ? "+" : "−"}{formatRupiah(entry.amount)}</p></div>{entry.note && <p className="mt-2 text-sm leading-5 text-tj-muted">{entry.note}</p>}{entry.relatedTotalanId && <Link className="mt-2 inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-tj-primary hover:underline" href={`/totalan/${entry.relatedTotalanId}`}>Lihat Totalan <ChevronRight aria-hidden="true" size={15} /></Link>}</div></div>; })}{!entries.length && <div className="p-5 text-center text-sm text-tj-muted">Belum ada riwayat kasbon untuk petani ini.</div>}</CardContent></Card></section>
    </div>
  </ContentContainer></div>;
}
