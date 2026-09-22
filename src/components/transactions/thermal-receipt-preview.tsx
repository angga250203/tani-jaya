"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Printer } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { businessInfo } from "@/config/business";
import { ContentContainer } from "@/components/layout/content-container";
import { NotaDocument } from "@/components/notas/nota-document";
import { ContainerWeightList } from "@/components/notas/container-weight-list";
import { Button } from "@/components/ui/button";
import { getTransactionNota } from "@/lib/notas";
import { formatKasbonDate } from "@/lib/kasbons";
import { sellerTypeLabel, transactionPaymentStatusLabel, weighingMethodLabel } from "@/lib/transactions";
import { cn, formatRupiah } from "@/lib/utils";
import { useTransactions } from "./transactions-provider";

type NotaMode = "DIGITAL" | "THERMAL";

function Separator() { return <div aria-hidden="true" className="border-t border-dashed border-black" />; }

function ThermalPurchaseNota({ transactionId }: { transactionId: string }) {
  const { transactions } = useTransactions();
  const transaction = transactions.find((item) => item.id === transactionId);
  if (!transaction) return null;
  const nota = getTransactionNota(transaction);
  return <article className="thermal-receipt w-full max-w-[340px] border border-tj-border bg-white px-5 py-6 font-mono text-[#111] shadow-[var(--tj-shadow-md)]"><header className="text-center"><Image alt={businessInfo.name} className="receipt-logo mx-auto h-14 w-14 object-contain" height={500} sizes="56px" src={businessInfo.logo} width={500} /><p className="mt-2 text-base font-extrabold tracking-[0.1em]">{businessInfo.name.toUpperCase()}</p><address className="mt-2 text-[11px] leading-4 not-italic">{businessInfo.thermalAddressLines.map((line) => <span className="block" key={line}>{line}</span>)}</address><p className="mt-2 text-[11px]">WhatsApp: {businessInfo.whatsapp}</p></header><div className="my-4"><Separator /></div><section className="text-center"><p className="text-xs font-bold tracking-[0.12em]">NOTA PEMBELIAN</p><p className="mt-2 text-xs">No. Nota: {nota.number}</p></section><div className="my-4"><Separator /></div><dl className="space-y-2 text-xs"><div className="flex justify-between gap-4"><dt>Tanggal</dt><dd className="text-right font-bold">{formatKasbonDate(transaction.transactionDate)}</dd></div><div className="flex justify-between gap-4"><dt>Penjual</dt><dd className="max-w-[58%] text-right font-bold">{transaction.sellerName}</dd></div><div className="flex justify-between gap-4"><dt>Jenis</dt><dd className="text-right font-bold">{sellerTypeLabel(transaction.sellerType)}</dd></div></dl><div className="my-4"><Separator /></div><section className="space-y-3">{transaction.items.map((item) => <article key={item.id}><div className="flex justify-between gap-3 text-sm"><h2 className="font-bold">{item.commodity}</h2><p className="shrink-0 font-bold">{formatRupiah(item.subtotal)}</p></div><p className="mt-1 text-[11px]">Kotor {item.grossWeight} kg · Potongan {item.deduction} kg · Bersih {item.netWeight} kg</p><p className="mt-0.5 text-[11px]">{formatRupiah(item.pricePerKg)}/kg · {weighingMethodLabel(item.weighingMethod)}</p><ContainerWeightList grossWeightKg={item.grossWeight} thermal weighingMethod={item.weighingMethod} weights={item.containerWeights} /></article>)}</section><div className="my-4"><Separator /></div><dl className="space-y-2 text-xs"><div className="flex justify-between gap-4"><dt>Total Berat Bersih</dt><dd className="font-bold">{transaction.totalNetWeight} kg</dd></div><div className="flex justify-between gap-4 text-sm"><dt className="font-extrabold">NILAI PEMBELIAN</dt><dd className="font-extrabold">{formatRupiah(transaction.totalAmount)}</dd></div><div className="flex justify-between gap-4"><dt>Status Pembayaran</dt><dd className="text-right font-bold">{transactionPaymentStatusLabel(transaction).toUpperCase()}</dd></div></dl><div className="my-4"><Separator /></div><p className="text-center text-[11px]">Terima kasih atas kerja sama Anda.</p></article>;
}

export function ThermalReceiptPreview({ transactionId }: { transactionId: string }) {
  const router = useRouter();
  const { transactions } = useTransactions();
  const [mode, setMode] = useState<NotaMode>("DIGITAL");
  const reduceMotion = useReducedMotion();
  const transaction = transactions.find((item) => item.id === transactionId);
  const nota = useMemo(() => transaction ? getTransactionNota(transaction) : null, [transaction]);
  if (!transaction || !nota) return <div className="py-5 sm:py-6 lg:py-8"><ContentContainer><p className="text-sm text-tj-muted">Pembelian tidak ditemukan.</p></ContentContainer></div>;
  const motionProps = { animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: reduceMotion ? 0 : 8 }, initial: { opacity: 0, y: reduceMotion ? 0 : 8 }, transition: { duration: reduceMotion ? 0.01 : 0.2, ease: "easeOut" as const } };
  return <div className="py-5 pb-28 sm:py-6 lg:py-8 lg:pb-8"><ContentContainer><header className="flex items-center justify-between gap-3 border-b border-tj-border pb-5 print:hidden lg:pb-6"><button aria-label="Kembali ke detail Pembelian" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-tj-muted hover:bg-tj-primary-soft hover:text-tj-primary" onClick={() => router.push(`/transaksi/${transaction.id}`)} type="button"><ArrowLeft aria-hidden="true" size={21} /></button><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-tj-muted sm:text-sm">{nota.number}</p><h1 className="truncate text-[19px] font-bold leading-6 tracking-[-0.02em] text-tj-text lg:text-[28px] lg:leading-8">Nota Pembelian</h1></div><Button aria-label="Cetak atau simpan nota" className="shrink-0 px-3.5 sm:px-4" onClick={() => window.print()} variant="secondary"><Printer aria-hidden="true" size={18} /><span className="hidden sm:inline">Cetak / Simpan</span><span className="sm:hidden">Cetak</span></Button></header><div className="mt-5 flex flex-col items-center lg:mt-7"><div className="mb-5 inline-flex rounded-xl border border-tj-border bg-tj-surface p-1 print:hidden" role="group" aria-label="Pilih tampilan nota"><button aria-pressed={mode === "DIGITAL"} className={cn("min-h-10 rounded-lg px-4 text-sm font-semibold", mode === "DIGITAL" ? "bg-tj-primary text-white" : "text-tj-muted hover:bg-tj-primary-soft")} onClick={() => setMode("DIGITAL")} type="button">Digital</button><button aria-pressed={mode === "THERMAL"} className={cn("min-h-10 rounded-lg px-4 text-sm font-semibold", mode === "THERMAL" ? "bg-tj-primary text-white" : "text-tj-muted hover:bg-tj-primary-soft")} onClick={() => setMode("THERMAL")} type="button">Thermal</button></div><AnimatePresence initial={false} mode="wait">{mode === "DIGITAL" ? <motion.div className="w-full max-w-[860px]" key="digital" {...motionProps}><NotaDocument nota={nota} transaction={transaction} /></motion.div> : <motion.div className="flex w-full justify-center" key="thermal" {...motionProps}><ThermalPurchaseNota transactionId={transaction.id} /></motion.div>}</AnimatePresence></div></ContentContainer></div>;
}
