"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronRight, HandCoins, Search, Truck } from "lucide-react";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { deriveSaleTotals, formatSaleDate, saleCommoditySummary, saleDeliveryLabel, sortSalesNewest, type SaleRecord } from "@/lib/sales";
import { cn, formatRupiah } from "@/lib/utils";
import { useSales } from "./sales-provider";

type PaymentFilter = "ALL" | "UNPAID" | "PAID";

const paymentFilters: { value: PaymentFilter; label: string }[] = [
  { value: "ALL", label: "Semua" },
  { value: "UNPAID", label: "Belum Lunas" },
  { value: "PAID", label: "Lunas" },
];

function SaleLifecycleBadge({ sale }: { sale: SaleRecord }) {
  const totals = deriveSaleTotals(sale);
  if (totals.paymentState === "CANCELLED") return <span className="inline-flex min-h-6 items-center rounded-full bg-tj-danger-soft px-2.5 text-xs font-semibold text-tj-danger">Dibatalkan</span>;
  return <StatusBadge status={totals.paymentState === "PAID" ? "paid" : "pending"}>{totals.paymentState === "PAID" ? "Lunas" : "Belum Lunas"}</StatusBadge>;
}

function SummaryCard({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return <Card><CardContent className="min-h-[96px] p-3.5 lg:p-4"><p className="text-xs font-medium text-tj-muted">{label}</p><p className="mt-3 text-xl font-bold leading-none tracking-[-0.025em] text-tj-primary-strong lg:text-2xl">{value}</p><p className="mt-1.5 text-xs text-tj-muted">{detail}</p></CardContent></Card>;
}

function SalesCard({ sale }: { sale: SaleRecord }) {
  const totals = deriveSaleTotals(sale);
  const cancelled = totals.paymentState === "CANCELLED";
  return <Link aria-label={`Buka nota ${sale.saleNumber}`} className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tj-primary" href={`/transaksi/penjualan/${sale.id}`}><Card className={cn("transition-[border-color,box-shadow,transform] duration-150 hover:border-tj-primary hover:shadow-[var(--tj-shadow-md)] active:scale-[0.99]", cancelled && "bg-tj-canvas/60 opacity-85")}><CardContent className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold text-tj-primary">{sale.saleNumber}</p><p className="mt-1 text-base font-bold text-tj-text">{sale.buyerName}</p><p className="mt-0.5 text-xs text-tj-muted">{formatSaleDate(sale.saleDate)}</p></div><SaleLifecycleBadge sale={sale} /></div><p className="mt-3 truncate text-sm font-semibold text-tj-text">{saleCommoditySummary(sale.items)}</p><div className="mt-3 grid grid-cols-2 gap-3 border-y border-tj-border py-3"><div><p className="text-xs text-tj-muted">Berat fisik</p><p className="mt-0.5 text-sm font-bold text-tj-text">{totals.totalGrossWeightKg} kg</p></div><div><p className="text-xs text-tj-muted">Total nota</p><p className="mt-0.5 text-sm font-bold text-tj-primary-strong">{formatRupiah(totals.totalAmount)}</p></div></div>{!cancelled && totals.paymentState === "UNPAID" && <div className="mt-3 grid grid-cols-2 gap-3 text-sm"><p className="text-tj-muted">Dibayar <span className="font-semibold text-tj-text">{formatRupiah(totals.totalPaid)}</span></p><p className="text-right text-tj-muted">Sisa <span className="font-semibold text-tj-warning">{formatRupiah(totals.remainingBalance)}</span></p></div>}{!cancelled && totals.initialPaymentContext && <p className="mt-2 text-xs font-medium text-tj-muted">{totals.initialPaymentContext}</p>}<div className="mt-3 flex items-center justify-between border-t border-tj-border pt-3"><span className="inline-flex items-center gap-1.5 text-xs font-medium text-tj-muted"><Truck aria-hidden="true" size={15} />{saleDeliveryLabel(sale.deliveryMethod)}</span><span className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-tj-primary">Detail<ChevronRight aria-hidden="true" size={15} /></span></div></CardContent></Card></Link>;
}

function SalesTable({ sales }: { sales: SaleRecord[] }) {
  return <Card className="hidden overflow-hidden lg:block"><div className="overflow-x-auto"><table className="min-w-full text-left"><thead className="border-b border-tj-border bg-tj-canvas text-xs font-semibold text-tj-muted"><tr><th className="px-4 py-3">Nota</th><th className="px-4 py-3">Pembeli</th><th className="px-4 py-3">Komoditas</th><th className="px-4 py-3 text-right">Berat fisik</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3">Pembayaran</th><th className="px-4 py-3">Pengiriman</th><th className="px-4 py-3"><span className="sr-only">Aksi</span></th></tr></thead><tbody className="divide-y divide-tj-border">{sales.map((sale) => { const totals = deriveSaleTotals(sale); const cancelled = totals.paymentState === "CANCELLED"; return <tr className={cn("hover:bg-tj-canvas", cancelled && "bg-tj-canvas/50")} key={sale.id}><td className="whitespace-nowrap px-4 py-4"><p className="text-sm font-semibold text-tj-primary">{sale.saleNumber}</p><p className="mt-0.5 text-xs text-tj-muted">{formatSaleDate(sale.saleDate)}</p></td><td className="px-4 py-4 text-sm font-semibold text-tj-text">{sale.buyerName}</td><td className="max-w-[250px] px-4 py-4 text-sm text-tj-text">{saleCommoditySummary(sale.items)}</td><td className="whitespace-nowrap px-4 py-4 text-right text-sm font-semibold text-tj-text">{totals.totalGrossWeightKg} kg</td><td className="whitespace-nowrap px-4 py-4 text-right text-sm font-bold text-tj-primary-strong">{formatRupiah(totals.totalAmount)}</td><td className="px-4 py-4"><SaleLifecycleBadge sale={sale} />{!cancelled && totals.paymentState === "UNPAID" && <p className="mt-1 text-xs text-tj-muted">Sisa {formatRupiah(totals.remainingBalance)}</p>}</td><td className="whitespace-nowrap px-4 py-4 text-sm text-tj-muted">{saleDeliveryLabel(sale.deliveryMethod)}</td><td className="px-4 py-4 text-right"><Link aria-label={`Buka nota ${sale.saleNumber}`} className="inline-flex h-10 items-center rounded-lg px-3 text-sm font-semibold text-tj-primary hover:bg-tj-primary-soft" href={`/transaksi/penjualan/${sale.id}`}>Detail</Link></td></tr>; })}</tbody></table></div></Card>;
}

function EmptySalesState({ filter, hasQuery }: { filter: PaymentFilter; hasQuery: boolean }) {
  const title = hasQuery ? "Tidak ada transaksi yang sesuai pencarian." : filter === "UNPAID" ? "Semua transaksi aktif sudah lunas." : filter === "PAID" ? "Belum ada transaksi penjualan yang lunas." : "Belum ada transaksi penjualan.";
  return <Card><CardContent className="flex min-h-52 flex-col items-center justify-center px-6 py-8 text-center"><HandCoins aria-hidden="true" className="mb-3 text-tj-primary" size={28} /><h2 className="text-base font-bold text-tj-text">{title}</h2><p className="mt-1 max-w-sm text-sm leading-6 text-tj-muted">Coba ubah filter atau pencarian Anda.</p></CardContent></Card>;
}

export function SalesHistory() {
  const { sales } = useSales();
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("ALL");
  const reduceMotion = useReducedMotion();
  const filteredSales = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("id-ID");
    return sortSalesNewest(sales).filter((sale) => {
      const totals = deriveSaleTotals(sale);
      const matchesSearch = !query || [sale.saleNumber, sale.buyerName, ...sale.items.map((saleItem) => saleItem.commodity)].some((value) => value.toLocaleLowerCase("id-ID").includes(query));
      const matchesPayment = paymentFilter === "ALL" || (totals.paymentState !== "CANCELLED" && totals.paymentState === paymentFilter);
      return matchesSearch && matchesPayment;
    });
  }, [paymentFilter, sales, search]);
  const activeRelevantSales = useMemo(() => filteredSales.filter((sale) => sale.lifecycleStatus === "ACTIVE"), [filteredSales]);
  const summary = useMemo(() => activeRelevantSales.reduce((current, sale) => { const totals = deriveSaleTotals(sale); return { count: current.count + 1, amount: current.amount + totals.totalAmount, paid: current.paid + totals.totalPaid, receivable: current.receivable + totals.remainingBalance }; }, { count: 0, amount: 0, paid: 0, receivable: 0 }), [activeRelevantSales]);
  const motionProps = { animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: reduceMotion ? 0 : -6 }, initial: { opacity: 0, y: reduceMotion ? 0 : 6 }, transition: { duration: reduceMotion ? 0.01 : 0.18, ease: "easeOut" as const } };

  return <div className="mt-5 space-y-5 lg:mt-7 lg:space-y-6"><section aria-labelledby="sales-summary-title"><div className="mb-3 flex items-center gap-2"><HandCoins aria-hidden="true" className="text-tj-primary" size={19} /><h2 className="text-base font-bold text-tj-text lg:text-lg" id="sales-summary-title">Ringkasan penjualan aktif</h2></div><div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3 lg:gap-4"><SummaryCard detail="nota aktif" label="Jumlah Nota" value={summary.count} /><SummaryCard detail="nilai nota aktif" label="Total Penjualan" value={formatRupiah(summary.amount)} /><SummaryCard detail="tunai diterima" label="Sudah Diterima" value={formatRupiah(summary.paid)} /><SummaryCard detail="tagihan aktif" label="Total Piutang" value={formatRupiah(summary.receivable)} /></div></section><section aria-label="Cari dan filter penjualan" className="space-y-3"><div className="relative"><Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-tj-muted" size={18} /><input aria-label="Cari nomor nota, pembeli, atau komoditas" className="h-12 w-full rounded-xl border border-tj-border bg-tj-surface pl-10 pr-3.5 text-sm text-tj-text outline-none placeholder:text-tj-muted focus:border-tj-primary" onChange={(event) => setSearch(event.target.value)} placeholder="Cari nomor nota, pembeli, atau komoditas" type="search" value={search} /></div><div className="flex gap-2 overflow-x-auto pb-1">{paymentFilters.map((filter) => <button aria-pressed={paymentFilter === filter.value} className={cn("min-h-10 shrink-0 rounded-full border px-3 text-sm font-semibold transition-colors", paymentFilter === filter.value ? "border-tj-primary bg-tj-primary text-white" : "border-tj-border bg-tj-surface text-tj-muted hover:bg-tj-primary-soft hover:text-tj-primary-strong")} key={filter.value} onClick={() => setPaymentFilter(filter.value)} type="button">{filter.label}</button>)}</div></section><section aria-live="polite" aria-labelledby="sales-list-title"><div className="mb-3"><h2 className="text-lg font-bold tracking-[-0.015em] text-tj-text" id="sales-list-title">Riwayat Penjualan</h2><p className="mt-0.5 text-sm text-tj-muted">{filteredSales.length} nota ditemukan</p></div>{filteredSales.length ? <><motion.div className="space-y-3 lg:hidden" layout><AnimatePresence initial={false} mode="popLayout">{filteredSales.map((sale) => <motion.div {...motionProps} key={sale.id} layout><SalesCard sale={sale} /></motion.div>)}</AnimatePresence></motion.div><SalesTable sales={filteredSales} /></> : <EmptySalesState filter={paymentFilter} hasQuery={Boolean(search.trim())} />}</section></div>;
}
