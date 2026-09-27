"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, CheckCircle2, ChevronDown, CircleAlert, CreditCard, Truck, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { ContentContainer } from "@/components/layout/content-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { getOperationalDateISO } from "@/lib/operational-date";
import { buyerTypeLabel, deriveSaleTotals, formatSaleDate, saleDeliveryLabel, type SaleItem, type SaleRecord } from "@/lib/sales";
import { cn, formatRupiah } from "@/lib/utils";
import { useSales } from "./sales-provider";

type PaymentDialogMode = "INSTALLMENT" | "SETTLE" | null;

function paymentLabel(sale: SaleRecord) {
  const state = deriveSaleTotals(sale).paymentState;
  return state === "CANCELLED" ? "Dibatalkan" : state === "PAID" ? "Lunas" : "Belum Lunas";
}

function PaymentBadge({ sale }: { sale: SaleRecord }) {
  const state = deriveSaleTotals(sale).paymentState;
  if (state === "CANCELLED") return <span className="inline-flex min-h-6 items-center rounded-full bg-tj-danger-soft px-2.5 text-xs font-semibold text-tj-danger">Dibatalkan</span>;
  return <StatusBadge status={state === "PAID" ? "paid" : "pending"}>{state === "PAID" ? "Lunas" : "Belum Lunas"}</StatusBadge>;
}

function gradeClass(grade: SaleItem["grade"]) {
  return grade === "SP" ? "bg-tj-primary-soft text-tj-primary-strong" : grade === "TG" ? "bg-tj-info-soft text-tj-info" : "bg-tj-warning-soft text-tj-warning";
}

function SummaryRow({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return <div className="flex items-start justify-between gap-4"><dt className="text-sm text-tj-muted">{label}</dt><dd className={cn("text-right text-sm font-semibold text-tj-text", emphasis && "text-base font-bold text-tj-primary-strong")}>{value}</dd></div>;
}

function PaymentDialog({ mode, remaining, onClose, onConfirm }: { mode: PaymentDialogMode; remaining: number; onClose: () => void; onConfirm: (amount: number) => Promise<string | undefined> }) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();
  const isOpen = mode !== null;

  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();
    const oldBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = oldBodyOverflow; };
  }, [isOpen]);

  const close = () => {
    setAmount("");
    setError(null);
    setIsSaving(false);
    onClose();
  };

  const complete = async (value: number) => {
    const message = await onConfirm(value);
    setIsSaving(false);
    if (message) { setError(message); return; }
    setAmount("");
    setError(null);
  };

  const trapFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") { close(); return; }
    if (event.key !== "Tab") return;
    const controls = dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled])");
    if (!controls?.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  const submitInstallment = () => {
    if (!/^\d+$/.test(amount)) { setError("Nominal pembayaran wajib diisi."); return; }
    const value = Number(amount);
    if (value <= 0) { setError("Nominal pembayaran harus lebih dari Rp0."); return; }
    if (value > remaining) { setError("Pembayaran tidak boleh melebihi sisa piutang."); return; }
    setIsSaving(true);
    window.setTimeout(() => { void complete(value); }, reduceMotion ? 20 : 220);
  };

  const submit = () => {
    if (isSaving) return;
    if (mode === "SETTLE") { setIsSaving(true); window.setTimeout(() => { void complete(remaining); }, reduceMotion ? 20 : 220); }
    else submitInstallment();
  };
  const title = mode === "SETTLE" ? "Lunasi Penjualan" : "Catat Cicilan";
  const start = reduceMotion ? { opacity: 0 } : { opacity: 0, y: 42 };

  return <AnimatePresence initial={false}>{isOpen && <motion.div animate={{ opacity: 1 }} className="fixed inset-0 z-[80]" exit={{ opacity: 0 }} initial={{ opacity: 0 }}><button aria-label={`Tutup ${title}`} className="absolute inset-0 cursor-default bg-tj-text/35" onClick={close} type="button" /><motion.div animate={{ opacity: 1, y: 0 }} aria-labelledby="payment-dialog-title" aria-modal="true" className="absolute inset-x-0 bottom-0 rounded-t-[24px] bg-tj-surface px-4 pt-3 shadow-[0_-12px_32px_rgb(14_61_35_/_0.18)] lg:inset-x-auto lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:w-full lg:max-w-md lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl lg:shadow-[var(--tj-shadow-md)]" exit={start} initial={start} onKeyDown={trapFocus} ref={dialogRef} role="dialog" transition={{ duration: reduceMotion ? 0.01 : 0.2, ease: "easeOut" }}><div aria-hidden="true" className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-tj-border lg:hidden" /><div className="flex min-h-11 items-center justify-between gap-4"><div><h2 className="text-lg font-bold text-tj-text" id="payment-dialog-title">{title}</h2><p className="mt-0.5 text-xs text-tj-muted">Pembayaran tunai untuk nota ini</p></div><button aria-label={`Tutup ${title}`} className="flex h-11 w-11 items-center justify-center rounded-xl text-tj-muted hover:bg-tj-canvas" onClick={close} ref={closeRef} type="button"><X aria-hidden="true" size={21} /></button></div><div className="space-y-4 py-5"><div className="rounded-xl bg-tj-canvas p-3"><p className="text-xs text-tj-muted">Sisa Piutang Saat Ini</p><p className="mt-1 text-xl font-bold text-tj-primary-strong">{formatRupiah(remaining)}</p></div>{mode === "INSTALLMENT" ? <div className="space-y-1.5"><label className="text-sm font-semibold text-tj-text" htmlFor="payment-amount">Nominal Pembayaran</label><Input aria-invalid={Boolean(error)} id="payment-amount" inputMode="numeric" onChange={(event) => setAmount(event.target.value)} placeholder="Rp" type="text" value={amount} />{error && <p className="text-xs text-tj-danger" role="alert">{error}</p>}</div> : <div className="rounded-xl bg-tj-primary-soft p-3 text-sm text-tj-primary-strong"><p>Pembayaran yang akan dicatat</p><p className="mt-1 text-lg font-bold">{formatRupiah(remaining)}</p></div>}</div><div className="flex gap-2 border-t border-tj-border pb-[max(1rem,env(safe-area-inset-bottom))] pt-3"><Button className="flex-1" disabled={isSaving} onClick={close} variant="secondary">Batal</Button><Button className="flex-1" disabled={isSaving} onClick={submit}>{isSaving ? "Menyimpan..." : mode === "SETTLE" ? "Konfirmasi Pelunasan" : "Simpan Pembayaran"}</Button></div></motion.div></motion.div>}</AnimatePresence>;
}

function NotFoundSale() {
  const router = useRouter();
  return <div className="py-8 lg:py-12"><ContentContainer><Card><CardContent className="flex min-h-60 flex-col items-center justify-center px-6 text-center"><CircleAlert aria-hidden="true" className="mb-3 text-tj-warning" size={30} /><h1 className="text-lg font-bold text-tj-text">Transaksi penjualan tidak ditemukan.</h1><p className="mt-1 text-sm text-tj-muted">Periksa kembali tautan atau nomor nota yang ingin dibuka.</p><Button className="mt-5" onClick={() => router.push("/transaksi?tab=penjualan")} variant="secondary">Kembali ke Penjualan</Button></CardContent></Card></ContentContainer></div>;
}

export function SaleDetail({ saleId }: { saleId: string }) {
  const router = useRouter();
  const { recordSalePayment, sales, isLoading, error: readError } = useSales();
  const [dialogMode, setDialogMode] = useState<PaymentDialogMode>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const sale = sales.find((record) => record.id === saleId);
  const totals = useMemo(() => sale ? deriveSaleTotals(sale) : null, [sale]);
  if (isLoading) return <div className="py-8 lg:py-12"><ContentContainer><Card><CardContent className="py-10 text-center text-sm text-tj-muted">Memuat detail Penjualan...</CardContent></Card></ContentContainer></div>;
  if (readError) return <div className="py-8 lg:py-12"><ContentContainer><Card><CardContent className="py-10 text-center text-sm text-tj-danger">{readError}</CardContent></Card></ContentContainer></div>;
  if (!sale || !totals) return <NotFoundSale />;
  const isUnpaid = sale.lifecycleStatus === "ACTIVE" && totals.remainingBalance > 0;
  const expeditionCost = sale.deliveryMethod === "EXPEDITION" ? totals.totalGrossWeightKg * (sale.expeditionRatePerKg ?? 0) : 0;

  const recordPayment = async (amount: number) => {
    const today = getOperationalDateISO();
    const result = await recordSalePayment(sale.id, amount, today);
    if (result.error) return result.error;
    setDialogMode(null);
    setToast(amount === totals.remainingBalance ? "Penjualan berhasil dilunasi." : "Pembayaran berhasil dicatat.");
    window.setTimeout(() => setToast(null), 2800);
    return undefined;
  };

  return <div className="py-5 pb-28 sm:py-6 lg:py-8 lg:pb-8"><ContentContainer><header className="border-b border-tj-border pb-5 lg:pb-6"><button aria-label="Kembali ke riwayat Penjualan" className="mb-3 flex h-11 items-center gap-1 rounded-xl px-2 text-sm font-semibold text-tj-primary hover:bg-tj-primary-soft" onClick={() => router.push("/transaksi?tab=penjualan")} type="button"><ArrowLeft aria-hidden="true" size={19} />Kembali</button><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold text-tj-primary">{sale.saleNumber}</p><h1 className="mt-1 text-xl font-bold tracking-[-0.02em] text-tj-text lg:text-[28px]">Detail Penjualan</h1><p className="mt-1 text-sm text-tj-muted">{formatSaleDate(sale.saleDate)} · {sale.buyerName} · {buyerTypeLabel(sale.buyerType)}</p></div><PaymentBadge sale={sale} /></div>{sale.lifecycleStatus === "CANCELLED" && <div className="mt-4 rounded-xl border border-tj-danger/20 bg-tj-danger-soft px-3 py-3 text-sm text-tj-danger"><strong>Dibatalkan.</strong>{sale.cancellationReason && ` ${sale.cancellationReason}`}</div>}</header><div className="mt-5 grid gap-5 lg:mt-7 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6"><main className="order-2 space-y-5 lg:order-1"><section aria-labelledby="buyer-note-title"><div className="mb-3"><p className="text-xs font-semibold uppercase tracking-[0.08em] text-tj-muted">Informasi untuk pembeli</p><h2 className="mt-1 text-lg font-bold text-tj-text" id="buyer-note-title">Rincian Nota</h2></div><div className="space-y-3">{sale.items.map((saleItem) => <Card key={saleItem.id}><CardContent className="p-4 lg:p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="text-base font-bold text-tj-text">{saleItem.commodity}</h3><span className={cn("mt-1 inline-flex rounded-full px-2 py-1 text-xs font-semibold", gradeClass(saleItem.grade))}>{saleItem.grade}</span></div><p className="text-right text-base font-bold text-tj-primary-strong">{formatRupiah(saleItem.subtotal)}</p></div><dl className="mt-4 grid grid-cols-2 gap-3 border-t border-tj-border pt-3 text-sm sm:grid-cols-4"><div><dt className="text-xs text-tj-muted">Berat Kotor</dt><dd className="mt-1 font-semibold text-tj-text">{saleItem.grossWeightKg} kg</dd></div><div><dt className="text-xs text-tj-muted">Potongan</dt><dd className="mt-1 font-semibold text-tj-text">{saleItem.deductionWeightKg} kg</dd></div><div><dt className="text-xs text-tj-muted">Berat Bersih</dt><dd className="mt-1 font-semibold text-tj-text">{saleItem.netWeightKg} kg</dd></div><div><dt className="text-xs text-tj-muted">Harga/kg</dt><dd className="mt-1 font-semibold text-tj-text">{formatRupiah(saleItem.pricePerKg)}</dd></div></dl></CardContent></Card>)}</div></section><section aria-labelledby="payment-history-title"><div className="mb-3 flex items-center gap-2"><CreditCard aria-hidden="true" className="text-tj-primary" size={19} /><h2 className="text-lg font-bold text-tj-text" id="payment-history-title">Riwayat Pembayaran</h2></div>{sale.payments.length ? <div className="space-y-2.5">{[...sale.payments].reverse().map((payment) => <motion.div animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-tj-border bg-tj-surface p-4 shadow-[var(--tj-shadow-sm)]" initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }} key={payment.id} transition={{ duration: reduceMotion ? 0.01 : 0.18 }}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-tj-text">{formatSaleDate(payment.paymentDate)}</p><p className="mt-1 text-xs text-tj-muted">Pembayaran tunai</p></div><p className="text-base font-bold text-tj-primary-strong">{formatRupiah(payment.amount)}</p></div><div className="mt-3 flex justify-between border-t border-tj-border pt-3 text-sm"><span className="text-tj-muted">Sisa setelah pembayaran</span><strong className="text-tj-text">{formatRupiah(payment.remainingBalanceAfter)}</strong></div></motion.div>)}</div> : <Card><CardContent className="py-6 text-center text-sm text-tj-muted">Belum ada pembayaran untuk nota ini.</CardContent></Card>}</section><section aria-labelledby="stock-source-title"><Card><CardContent className="p-4 lg:p-5"><button aria-expanded={sourcesOpen} className="flex min-h-11 w-full items-center justify-between gap-3 text-left" onClick={() => setSourcesOpen((current) => !current)} type="button"><span><span className="block text-xs font-semibold uppercase tracking-[0.08em] text-tj-muted">Admin Tani Jaya</span><span className="mt-1 block text-lg font-bold text-tj-text" id="stock-source-title">Sumber Stok</span></span><ChevronDown aria-hidden="true" className={cn("text-tj-primary transition-transform", sourcesOpen && "rotate-180")} size={20} /></button><AnimatePresence initial={false}>{sourcesOpen && <motion.div animate={{ height: "auto", opacity: 1 }} className="overflow-hidden" exit={{ height: 0, opacity: 0 }} initial={{ height: 0, opacity: 0 }} transition={{ duration: reduceMotion ? 0.01 : 0.18 }}><p className="mt-3 rounded-xl bg-tj-canvas px-3 py-2 text-xs leading-5 text-tj-muted">Data ini hanya untuk penelusuran internal dan tidak muncul pada nota pembeli.</p>{sale.items.map((saleItem) => { const allocations = sale.allocations?.filter((entry) => entry.commodity.toLocaleLowerCase("id-ID") === saleItem.commodity.toLocaleLowerCase("id-ID") && entry.grade === saleItem.grade) ?? []; return <div className="mt-4" key={saleItem.id}><p className="text-sm font-bold text-tj-text">{saleItem.commodity} {saleItem.grade} · {saleItem.grossWeightKg} kg</p>{allocations.length ? <ul className="mt-2 divide-y divide-tj-border rounded-xl border border-tj-border px-3">{allocations.map((entry) => <li className="flex items-center justify-between gap-3 py-2.5 text-sm" key={entry.id}><span><span className="block font-semibold text-tj-text">{entry.sellerType === "PETANI_MITRA" ? "Petani Mitra" : "Penjual Umum"} — {entry.sellerName}</span>{entry.purchaseContainerLabel && <span className="mt-0.5 block text-xs text-tj-muted">{entry.purchaseContainerLabel}</span>}</span><strong className="shrink-0 text-tj-primary-strong">{entry.allocatedGrossWeightKg} kg</strong></li>)}</ul> : <p className="mt-2 text-sm text-tj-muted">Rincian alokasi tidak tersedia pada fixture lama.</p>}</div>; })}</motion.div>}</AnimatePresence></CardContent></Card></section></main><aside className="order-1 space-y-4 lg:order-2 lg:sticky lg:top-8 lg:self-start"><Card><CardContent className="space-y-4 p-4 lg:p-5"><div className="flex items-center justify-between"><h2 className="text-lg font-bold text-tj-text">Ringkasan</h2><PaymentBadge sale={sale} /></div><dl className="space-y-3 border-y border-tj-border py-3"><SummaryRow label="Total Berat Fisik" value={`${totals.totalGrossWeightKg} kg`} /><SummaryRow label="Total Potongan" value={`${totals.totalDeductionWeightKg} kg`} /><SummaryRow label="Total Berat Bersih" value={`${totals.totalNetWeightKg} kg`} /><SummaryRow emphasis label="Total Nota" value={formatRupiah(totals.totalAmount)} /><SummaryRow label="Total Dibayar" value={formatRupiah(totals.totalPaid)} /><SummaryRow label="Sisa Piutang" value={formatRupiah(totals.remainingBalance)} /><SummaryRow label="Status" value={paymentLabel(sale)} /></dl>{isUnpaid ? <div className="grid grid-cols-2 gap-2"><Button onClick={() => setDialogMode("INSTALLMENT")} variant="secondary">Cicil</Button><Button onClick={() => setDialogMode("SETTLE")}>Lunasi</Button></div> : <div className={cn("rounded-xl px-3 py-3 text-sm font-semibold", sale.lifecycleStatus === "CANCELLED" ? "bg-tj-danger-soft text-tj-danger" : "bg-tj-primary-soft text-tj-primary-strong")}>{sale.lifecycleStatus === "CANCELLED" ? "Aksi pembayaran tidak tersedia untuk transaksi dibatalkan." : "Lunas — tidak ada sisa piutang."}</div>}</CardContent></Card><Card><CardContent className="space-y-3 p-4 lg:p-5"><div className="flex items-center gap-2"><Truck aria-hidden="true" className="text-tj-primary" size={19} /><h2 className="text-base font-bold text-tj-text">Pengiriman</h2></div><div><p className="text-xs text-tj-muted">Metode</p><p className="mt-1 text-sm font-semibold text-tj-text">{saleDeliveryLabel(sale.deliveryMethod)}</p></div>{sale.deliveryMethod === "EXPEDITION" && <div className="space-y-2 rounded-xl bg-tj-canvas p-3"><p className="text-xs font-semibold text-tj-muted">Internal Tani Jaya</p><SummaryRow label="Ekspedisi / Truk" value={sale.expeditionName || "—"} /><SummaryRow label="Tarif/kg" value={formatRupiah(sale.expeditionRatePerKg ?? 0)} /><SummaryRow label="Berat dikirim" value={`${totals.totalGrossWeightKg} kg`} /><SummaryRow label="Biaya Ekspedisi" value={formatRupiah(expeditionCost)} /></div>}</CardContent></Card></aside></div></ContentContainer><PaymentDialog mode={dialogMode} onClose={() => setDialogMode(null)} onConfirm={recordPayment} remaining={totals.remainingBalance} /><AnimatePresence initial={false}>{toast && <motion.div animate={{ opacity: 1, y: 0 }} className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[90] mx-auto flex max-w-md items-center gap-2 rounded-xl bg-tj-text px-4 py-3 text-sm font-semibold text-white shadow-[var(--tj-shadow-md)] lg:bottom-6" exit={{ opacity: 0, y: reduceMotion ? 0 : 8 }} initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }} role="status" transition={{ duration: reduceMotion ? 0.01 : 0.2 }}><CheckCircle2 aria-hidden="true" className="text-[#bce7c9]" size={20} />{toast}<button aria-label="Tutup notifikasi" className="ml-auto flex h-8 w-8 items-center justify-center" onClick={() => setToast(null)} type="button"><X aria-hidden="true" size={17} /></button></motion.div>}</AnimatePresence></div>;
}
