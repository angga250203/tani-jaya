"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Printer } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { businessInfo } from "@/config/business";
import { ContentContainer } from "@/components/layout/content-container";
import { NotaDocument } from "@/components/notas/nota-document";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getTotalanNota } from "@/lib/notas";
import { formatTotalanDate, type TotalanRecord } from "@/lib/totalans";
import { cn, formatRupiah } from "@/lib/utils";
import { useTotalans } from "./totalans-provider";

type NotaMode = "DIGITAL" | "THERMAL";

function Separator() { return <div aria-hidden="true" className="border-t border-dashed border-black" />; }

function ThermalTotalanNota({ totalan }: { totalan: TotalanRecord }) {
  const nota = getTotalanNota(totalan);

  return <article className="thermal-receipt w-full max-w-[340px] border border-tj-border bg-white px-5 py-6 font-mono text-[#111] shadow-[var(--tj-shadow-md)]"><header className="text-center"><Image alt={businessInfo.name} className="receipt-logo mx-auto h-14 w-14 object-contain" height={500} sizes="56px" src={businessInfo.logo} width={500} /><p className="mt-2 text-base font-extrabold tracking-[0.1em]">{businessInfo.name.toUpperCase()}</p><address className="mt-2 text-[11px] leading-4 not-italic">{businessInfo.thermalAddressLines.map((line) => <span className="block" key={line}>{line}</span>)}</address><p className="mt-2 text-[11px]">WhatsApp: {businessInfo.whatsapp}</p></header><div className="my-4"><Separator /></div><section className="text-center"><p className="text-xs font-bold tracking-[0.12em]">NOTA TOTALAN</p><p className="mt-2 text-xs">No. Nota: {nota.number}</p></section><div className="my-4"><Separator /></div><dl className="space-y-2 text-xs"><div className="flex justify-between gap-4"><dt>Tanggal</dt><dd className="text-right font-bold">{formatTotalanDate(totalan.totalanDate)}</dd></div><div className="flex justify-between gap-4"><dt>Petani</dt><dd className="max-w-[58%] text-right font-bold">{totalan.farmerName}</dd></div></dl><div className="my-4"><Separator /></div><section className="space-y-3"><h2 className="text-xs font-bold">PEMBELIAN DITOTAL</h2>{totalan.transactions.map((transaction) => <article key={transaction.transactionId}><div className="flex justify-between gap-3 text-xs"><h3 className="font-bold">{transaction.transactionNumber ?? "Pembelian"}</h3><p className="shrink-0 font-bold">{formatRupiah(transaction.totalAmount)}</p></div><p className="mt-1 text-[11px]">{formatTotalanDate(transaction.transactionDate)}{transaction.commoditySummary ? ` · ${transaction.commoditySummary}` : ""}</p></article>)}</section><div className="my-4"><Separator /></div><dl className="space-y-2 text-xs"><div className="flex justify-between gap-4"><dt>Total Pembelian</dt><dd className="font-bold">{formatRupiah(totalan.totalHarvestValue)}</dd></div><div className="flex justify-between gap-4"><dt>Potongan Kasbon</dt><dd className="font-bold">{formatRupiah(totalan.kasbonDeduction)}</dd></div><div className="flex justify-between gap-4 text-sm"><dt className="font-extrabold">DIBAYARKAN</dt><dd className="font-extrabold">{formatRupiah(totalan.finalPayment)}</dd></div></dl><div className="my-4"><Separator /></div><p className="text-center text-[11px]">Terima kasih atas kerja sama Anda.</p></article>;
}

function NotaNotFound() {
  const router = useRouter();
  return <div className="py-8 lg:py-12"><ContentContainer><Card><CardContent className="flex min-h-60 flex-col items-center justify-center px-6 text-center"><h1 className="text-lg font-bold text-tj-text">Nota Totalan tidak ditemukan.</h1><p className="mt-1 text-sm text-tj-muted">Pastikan Totalan sudah selesai dan tautannya benar.</p><Button className="mt-5" onClick={() => router.push("/totalan")} variant="secondary">Kembali ke Totalan</Button></CardContent></Card></ContentContainer></div>;
}

export function TotalanNotaPage({ initialMode = "DIGITAL", totalanId }: { initialMode?: NotaMode; totalanId: string }) {
  const router = useRouter();
  const { totalans, isLoading, error } = useTotalans();
  const [mode, setMode] = useState<NotaMode>(initialMode);
  const reduceMotion = useReducedMotion();
  const totalan = totalans.find((record) => record.id === totalanId);

  if (isLoading) return <div className="py-8 lg:py-12"><ContentContainer><Card><CardContent className="py-10 text-center text-sm text-tj-muted">Memuat nota Totalan...</CardContent></Card></ContentContainer></div>;
  if (error) return <div className="py-8 lg:py-12"><ContentContainer><Card><CardContent className="py-10 text-center text-sm text-tj-danger">{error}</CardContent></Card></ContentContainer></div>;
  if (!totalan) return <NotaNotFound />;

  const nota = getTotalanNota(totalan);
  const motionProps = { animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: reduceMotion ? 0 : 8 }, initial: { opacity: 0, y: reduceMotion ? 0 : 8 }, transition: { duration: reduceMotion ? 0.01 : 0.2, ease: "easeOut" as const } };

  return <div className="py-5 pb-28 sm:py-6 lg:py-8 lg:pb-8"><ContentContainer><header className="flex items-center justify-between gap-3 border-b border-tj-border pb-5 print:hidden lg:pb-6"><button aria-label="Kembali ke detail Totalan" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-tj-muted hover:bg-tj-primary-soft hover:text-tj-primary" onClick={() => router.push(`/totalan/${totalan.id}`)} type="button"><ArrowLeft aria-hidden="true" size={21} /></button><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-tj-muted sm:text-sm">{nota.number}</p><h1 className="truncate text-[19px] font-bold leading-6 tracking-[-0.02em] text-tj-text lg:text-[28px] lg:leading-8">Nota Totalan</h1></div><Button aria-label="Cetak atau simpan nota" className="shrink-0 px-3.5 sm:px-4" onClick={() => window.print()} variant="secondary"><Printer aria-hidden="true" size={18} /><span className="hidden sm:inline">Cetak / Simpan</span><span className="sm:hidden">Cetak</span></Button></header><div className="mt-5 flex flex-col items-center lg:mt-7"><div className="mb-5 inline-flex rounded-xl border border-tj-border bg-tj-surface p-1 print:hidden" role="group" aria-label="Pilih tampilan nota"><button aria-pressed={mode === "DIGITAL"} className={cn("min-h-10 rounded-lg px-4 text-sm font-semibold", mode === "DIGITAL" ? "bg-tj-primary text-white" : "text-tj-muted hover:bg-tj-primary-soft")} onClick={() => setMode("DIGITAL")} type="button">Digital</button><button aria-pressed={mode === "THERMAL"} className={cn("min-h-10 rounded-lg px-4 text-sm font-semibold", mode === "THERMAL" ? "bg-tj-primary text-white" : "text-tj-muted hover:bg-tj-primary-soft")} onClick={() => setMode("THERMAL")} type="button">Thermal</button></div><AnimatePresence initial={false} mode="wait">{mode === "DIGITAL" ? <motion.div className="w-full max-w-[860px]" key="digital" {...motionProps}><NotaDocument nota={nota} totalan={totalan} /></motion.div> : <motion.div className="flex w-full justify-center" key="thermal" {...motionProps}><ThermalTotalanNota totalan={totalan} /></motion.div>}</AnimatePresence></div></ContentContainer></div>;
}
