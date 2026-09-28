"use client";

import Link from "next/link";
import { ArrowLeft, ChevronRight, HandCoins, ReceiptText, Scale, UserRound } from "lucide-react";
import { ContentContainer } from "@/components/layout/content-container";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatTotalanDate, type TotalanRecord } from "@/lib/totalans";
import { formatRupiah } from "@/lib/utils";
import { useTotalans } from "./totalans-provider";

export function DetailTotalanPage({ initialTotalan, totalanId }: { initialTotalan?: TotalanRecord; totalanId: string }) {
  const { totalans, isLoading, error, refresh } = useTotalans();
  const totalan = totalans.find((item) => item.id === totalanId) ?? initialTotalan;

  if (isLoading && !totalan) return <div className="py-5"><ContentContainer><Card className="max-w-xl"><CardContent className="p-5 text-sm text-tj-muted">Memuat Totalan…</CardContent></Card></ContentContainer></div>;

  if (error && !totalan) return <div className="py-5"><ContentContainer><Card className="max-w-xl"><CardContent className="p-5"><h1 className="text-lg font-bold text-tj-text">Totalan belum dapat dimuat</h1><button className="mt-3 text-sm font-semibold text-tj-primary" onClick={() => void refresh()} type="button">Coba lagi</button></CardContent></Card></ContentContainer></div>;

  if (!totalan) {
    return <div className="py-5"><ContentContainer><Card className="max-w-xl"><CardContent className="p-5"><h1 className="text-lg font-bold text-tj-text">Totalan tidak ditemukan</h1><Link className="mt-3 inline-flex text-sm font-semibold text-tj-primary hover:underline" href="/totalan">Kembali ke Totalan</Link></CardContent></Card></ContentContainer></div>;
  }

  return (
    <div className="py-5 sm:py-6 lg:py-8">
      <ContentContainer>
        <header className="flex items-center gap-3 border-b border-tj-border pb-5 lg:pb-6">
          <Link aria-label="Kembali ke Totalan" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-tj-muted hover:bg-tj-primary-soft hover:text-tj-primary" href="/totalan"><ArrowLeft aria-hidden="true" size={21} /></Link>
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-tj-muted sm:text-sm">{totalan.number}</p><h1 className="truncate text-[19px] font-bold leading-6 tracking-[-0.02em] text-tj-text lg:text-[28px] lg:leading-8">Detail Totalan</h1></div>
          <div className="flex shrink-0 items-center gap-2"><Link className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-tj-primary hover:bg-tj-primary-soft" href={`/totalan/${totalan.id}/nota`}><ReceiptText aria-hidden="true" size={18} />Lihat Nota</Link><StatusBadge status="paid">Selesai</StatusBadge></div>
        </header>

        <div className="mt-5 space-y-5 lg:mt-7 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6 lg:space-y-0">
          <Card className="lg:col-span-2"><CardContent className="flex items-start gap-3 p-4 lg:p-5"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tj-primary-soft text-tj-primary"><UserRound aria-hidden="true" size={20} /></span><div className="min-w-0 flex-1"><h2 className="text-lg font-bold text-tj-text">{totalan.farmerName}</h2><p className="mt-1 text-sm text-tj-muted">{formatTotalanDate(totalan.totalanDate)} · {totalan.totalTransactions} transaksi</p></div></CardContent></Card>
          <section className="space-y-3 lg:col-start-1 lg:row-start-2"><h2 className="text-base font-bold text-tj-text">Transaksi yang Ditotal</h2><div className="space-y-3">{totalan.transactions.map((transaction) => <Link className="block" href={`/transaksi/${transaction.transactionId}`} key={transaction.transactionId}><Card className="transition-colors hover:border-tj-primary"><CardContent className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs text-tj-muted">{formatTotalanDate(transaction.transactionDate)}</p><p className="mt-1 truncate text-sm font-bold text-tj-text">{transaction.commoditySummary}</p><p className="mt-1 text-sm text-tj-muted">{transaction.totalNetWeight} kg bersih</p></div><div className="flex shrink-0 items-center gap-1 text-right"><strong className="text-sm text-tj-primary-strong">{formatRupiah(transaction.totalAmount)}</strong><ChevronRight aria-hidden="true" className="text-tj-primary" size={17} /></div></div></CardContent></Card></Link>)}</div></section>
          <aside className="space-y-3 lg:col-start-2 lg:row-start-2 lg:sticky lg:top-8"><Card><CardContent className="p-4 lg:p-5"><div className="flex items-center gap-2"><Scale aria-hidden="true" className="text-tj-primary" size={19} /><h2 className="text-base font-bold text-tj-text">Perhitungan</h2></div><dl className="mt-4 space-y-3"><div><dt className="text-sm text-tj-muted">Total Transaksi</dt><dd className="mt-0.5 text-base font-bold text-tj-text">{totalan.totalTransactions} transaksi</dd></div><div><dt className="text-sm text-tj-muted">Total Berat</dt><dd className="mt-0.5 text-base font-bold text-tj-text">{totalan.totalNetWeight} kg</dd></div><div><dt className="text-sm text-tj-muted">Total Hasil Panen</dt><dd className="mt-0.5 text-base font-bold text-tj-text">{formatRupiah(totalan.totalHarvestValue)}</dd></div><div><dt className="text-sm text-tj-muted">Potongan Kasbon</dt><dd className="mt-0.5 text-base font-bold text-tj-text">{totalan.kasbonDeduction ? formatRupiah(totalan.kasbonDeduction) : "—"}</dd></div><div className="border-t border-tj-border pt-3"><dt className="text-sm text-tj-muted">Jumlah Dibayar</dt><dd className="mt-1 text-xl font-bold tracking-[-0.025em] text-tj-primary-strong">{formatRupiah(totalan.finalPayment)}</dd></div></dl></CardContent></Card><Card><CardContent className="flex items-start gap-2 p-4"><HandCoins aria-hidden="true" className="mt-0.5 shrink-0 text-tj-primary" size={18} /><p className="text-sm leading-6 text-tj-muted">Totalan yang selesai disimpan sebagai riwayat keuangan dan tidak dapat diubah dari halaman ini.</p></CardContent></Card></aside>
        </div>
      </ContentContainer>
    </div>
  );
}
