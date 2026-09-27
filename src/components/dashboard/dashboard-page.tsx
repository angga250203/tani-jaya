"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, CalendarDays, ClipboardList, PackageCheck, ReceiptText, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { useSchedules } from "@/components/schedules/schedules-provider";
import { useSales } from "@/components/transactions/sales-provider";
import { useStocks } from "@/components/stocks/stocks-provider";
import { useTransactions } from "@/components/transactions/transactions-provider";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { deriveSaleTotals, formatSaleDate, saleCommoditySummary, sortSalesNewest, type SaleRecord } from "@/lib/sales";
import { stockSummary } from "@/lib/stocks";
import { getOperationalDateISO, isSameOperationalDay } from "@/lib/operational-date";
import { paymentStatusLabel, sellerTypeLabel, type TransactionRecord } from "@/lib/transactions";
import { cn, formatRupiah } from "@/lib/utils";

type ActivitySelection = "HARVEST_TODAY" | "HARVEST_TOMORROW" | "PURCHASES" | "SALES";

function MetricCard({ icon: Icon, label, value, detail }: { icon: typeof CalendarDays; label: string; value: string | number; detail: string }) {
  return <Card><CardContent className="min-h-[108px] p-3.5 sm:p-4"><Icon aria-hidden="true" className="text-tj-primary" size={19} /><p className="mt-3 text-xs font-medium text-tj-muted">{label}</p><p className="mt-1 text-lg font-bold leading-tight tracking-[-0.025em] text-tj-primary-strong sm:text-xl">{value}</p><p className="mt-1 text-xs text-tj-muted">{detail}</p></CardContent></Card>;
}

function ActivityButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return <button aria-pressed={active} className={cn("min-h-10 shrink-0 rounded-full border px-3 text-sm font-semibold transition-colors", active ? "border-tj-primary bg-tj-primary text-white" : "border-tj-border bg-tj-surface text-tj-muted hover:bg-tj-primary-soft hover:text-tj-primary-strong")} onClick={onClick} type="button">{children}</button>;
}

function PurchaseActivity({ transaction }: { transaction: TransactionRecord }) {
  return <Link className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tj-primary" href={`/transaksi/${transaction.id}`}><Card className="transition-[border-color,box-shadow,transform] hover:border-tj-primary hover:shadow-[var(--tj-shadow-md)] active:scale-[0.99]"><CardContent className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold text-tj-primary">Pembelian · {transaction.id}</p><p className="mt-1 truncate font-bold text-tj-text">{transaction.sellerName}</p><p className="mt-0.5 text-xs text-tj-muted">{sellerTypeLabel(transaction.sellerType)} · {transaction.items.map((item) => item.commodity).join(" • ")}</p></div><StatusBadge status={transaction.paymentStatus === "PAID" ? "paid" : "pending"}>{paymentStatusLabel(transaction.paymentStatus)}</StatusBadge></div><div className="mt-3 flex items-center justify-between border-t border-tj-border pt-3 text-sm"><span className="text-tj-muted">{transaction.totalNetWeight} kg bersih</span><strong className="text-tj-primary-strong">{formatRupiah(transaction.totalAmount)}</strong></div></CardContent></Card></Link>;
}

function SaleActivity({ sale }: { sale: SaleRecord }) {
  const totals = deriveSaleTotals(sale);
  return <Link className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tj-primary" href={`/transaksi/penjualan/${sale.id}`}><Card className="transition-[border-color,box-shadow,transform] hover:border-tj-primary hover:shadow-[var(--tj-shadow-md)] active:scale-[0.99]"><CardContent className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold text-tj-primary">{sale.saleNumber}</p><p className="mt-1 truncate font-bold text-tj-text">{sale.buyerName}</p><p className="mt-0.5 truncate text-xs text-tj-muted">{saleCommoditySummary(sale.items)} · {formatSaleDate(sale.saleDate)}</p></div><StatusBadge status={totals.paymentState === "PAID" ? "paid" : "pending"}>{totals.paymentState === "PAID" ? "Lunas" : "Belum Lunas"}</StatusBadge></div><div className="mt-3 flex items-center justify-between border-t border-tj-border pt-3 text-sm"><span className="text-tj-muted">{totals.totalGrossWeightKg} kg fisik</span><strong className="text-tj-primary-strong">{formatRupiah(totals.totalAmount)}</strong></div></CardContent></Card></Link>;
}

export function DashboardPage() {
  const { schedules, isLoading: schedulesLoading, error: schedulesError } = useSchedules();
  const { sales, isLoading: salesLoading, error: salesError } = useSales();
  const { sources, isLoading: stocksLoading, error: stocksError } = useStocks();
  const { transactions, isLoading: purchasesLoading, error: purchasesError } = useTransactions();
  const reduceMotion = useReducedMotion();
  const [selection, setSelection] = useState<ActivitySelection>("HARVEST_TODAY");
  const operationalDate = getOperationalDateISO();
  const todayPurchases = useMemo(() => transactions.filter((transaction) => transaction.transactionDate === operationalDate), [operationalDate, transactions]);
  const todaySales = useMemo(() => sales.filter((sale) => sale.saleDate === operationalDate && sale.lifecycleStatus === "ACTIVE"), [operationalDate, sales]);
  const activeSales = useMemo(() => sales.filter((sale) => sale.lifecycleStatus === "ACTIVE"), [sales]);
  const receivable = useMemo(() => activeSales.reduce((total, sale) => total + deriveSaleTotals(sale).remainingBalance, 0), [activeSales]);
  const availableStock = useMemo(() => stockSummary(sources).totalAvailableWeightKg, [sources]);
  const todaySchedules = useMemo(() => schedules.filter((schedule) => isSameOperationalDay(schedule.dateISO, 0, operationalDate)), [operationalDate, schedules]);
  const tomorrowSchedules = useMemo(() => schedules.filter((schedule) => isSameOperationalDay(schedule.dateISO, 1, operationalDate)), [operationalDate, schedules]);
  const activity = selection === "HARVEST_TODAY" ? todaySchedules : selection === "HARVEST_TOMORROW" ? tomorrowSchedules : selection === "PURCHASES" ? todayPurchases : sortSalesNewest(todaySales);
  const labels: Record<ActivitySelection, { title: string; subtitle: string; href: string; action: string }> = {
    HARVEST_TODAY: { title: "Panen hari ini", subtitle: `${todaySchedules.length} jadwal perlu ditindaklanjuti`, href: "/jadwal", action: "Lihat jadwal" },
    HARVEST_TOMORROW: { title: "Panen besok", subtitle: `${tomorrowSchedules.length} jadwal terjadwal`, href: "/jadwal", action: "Lihat jadwal" },
    PURCHASES: { title: "Pembelian hari ini", subtitle: `${todayPurchases.length} transaksi tercatat`, href: "/transaksi", action: "Lihat pembelian" },
    SALES: { title: "Penjualan hari ini", subtitle: `${todaySales.length} nota aktif tercatat`, href: "/transaksi?tab=penjualan", action: "Lihat penjualan" },
  };
  const current = labels[selection];
  const dashboardError = schedulesError ?? salesError ?? stocksError ?? purchasesError;
  if (schedulesLoading || salesLoading || stocksLoading || purchasesLoading) return <div className="py-5 sm:py-6 lg:py-8"><ContentContainer><PageHeader mobileTitle="Dashboard" showAvatar subtitle="Ringkasan operasional Tani Jaya" title="Dashboard" /><Card className="mt-5"><CardContent className="p-6 text-center text-sm text-tj-muted">Memuat ringkasan operasional…</CardContent></Card></ContentContainer></div>;
  if (dashboardError) return <div className="py-5 sm:py-6 lg:py-8"><ContentContainer><PageHeader mobileTitle="Dashboard" showAvatar subtitle="Ringkasan operasional Tani Jaya" title="Dashboard" /><Card className="mt-5"><CardContent className="p-6 text-center text-sm text-tj-danger">Dashboard belum dapat dimuat. {dashboardError}</CardContent></Card></ContentContainer></div>;

  return <div className="py-5 sm:py-6 lg:py-8"><ContentContainer><PageHeader actionHref="/transaksi/baru" actionLabel="Pembelian Baru" mobileTitle="Dashboard" showAvatar subtitle="Ringkasan operasional Tani Jaya" title="Dashboard" /><div className="mt-5 space-y-6 lg:mt-7 lg:space-y-7"><section aria-labelledby="operation-summary-title"><div className="mb-3 flex items-center gap-2"><PackageCheck aria-hidden="true" className="text-tj-primary" size={19} /><h2 className="text-base font-bold text-tj-text lg:text-lg" id="operation-summary-title">Ringkasan operasional</h2></div><div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3 lg:gap-4"><MetricCard detail={`${todayPurchases.length} transaksi hari ini`} icon={ClipboardList} label="Pembelian Hari Ini" value={formatRupiah(todayPurchases.reduce((total, record) => total + record.totalAmount, 0))} /><MetricCard detail={`${todaySales.length} nota hari ini`} icon={ReceiptText} label="Penjualan Hari Ini" value={formatRupiah(todaySales.reduce((total, record) => total + deriveSaleTotals(record).totalAmount, 0))} /><MetricCard detail="berat fisik tersedia" icon={PackageCheck} label="Stok Tersedia" value={`${availableStock} kg`} /><MetricCard detail="tagihan nota aktif" icon={WalletCards} label="Piutang Pembeli" value={formatRupiah(receivable)} /></div></section><section aria-labelledby="activity-title"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-bold tracking-[-0.015em] text-tj-text" id="activity-title">Aktivitas operasional</h2><p className="mt-0.5 text-sm text-tj-muted">Pantau panen, Pembelian, dan Penjualan terkini.</p></div><Link className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-tj-primary hover:bg-tj-primary-soft" href={current.href}>{current.action}<ArrowRight aria-hidden="true" size={16} /></Link></div><div className="mt-4 flex gap-2 overflow-x-auto pb-1"><ActivityButton active={selection === "HARVEST_TODAY"} onClick={() => setSelection("HARVEST_TODAY")}>Panen Hari Ini</ActivityButton><ActivityButton active={selection === "HARVEST_TOMORROW"} onClick={() => setSelection("HARVEST_TOMORROW")}>Panen Besok</ActivityButton><ActivityButton active={selection === "PURCHASES"} onClick={() => setSelection("PURCHASES")}>Pembelian</ActivityButton><ActivityButton active={selection === "SALES"} onClick={() => setSelection("SALES")}>Penjualan</ActivityButton></div><AnimatePresence initial={false} mode="wait"><motion.div animate={{ opacity: 1, y: 0 }} className="mt-4" exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }} initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }} key={selection} transition={{ duration: reduceMotion ? 0.01 : 0.18, ease: "easeOut" }}>{(selection === "HARVEST_TODAY" || selection === "HARVEST_TOMORROW") ? (activity as typeof schedules).length ? <div className="grid gap-3 lg:grid-cols-2">{(activity as typeof schedules).map((schedule) => <Link className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tj-primary" href={`/jadwal/${schedule.id}`} key={schedule.id}><Card className="transition-[border-color,box-shadow] hover:border-tj-primary hover:shadow-[var(--tj-shadow-sm)]"><CardContent className="p-4"><div className="flex justify-between gap-3"><div><p className="font-bold text-tj-text">{schedule.farmer}</p><p className="mt-1 text-sm text-tj-muted">{schedule.commodity} · {schedule.field}</p></div><StatusBadge status={schedule.status === "today" ? "today" : "upcoming"}>{schedule.statusLabel}</StatusBadge></div></CardContent></Card></Link>)}</div> : <Card><CardContent className="p-6 text-center text-sm text-tj-muted">Tidak ada jadwal pada periode ini.</CardContent></Card> : selection === "PURCHASES" ? (activity as TransactionRecord[]).length ? <div className="grid gap-3 lg:grid-cols-2">{(activity as TransactionRecord[]).map((transaction) => <PurchaseActivity key={transaction.id} transaction={transaction} />)}</div> : <Card><CardContent className="p-6 text-center text-sm text-tj-muted">Belum ada Pembelian hari ini.</CardContent></Card> : (activity as SaleRecord[]).length ? <div className="grid gap-3 lg:grid-cols-2">{(activity as SaleRecord[]).map((sale) => <SaleActivity key={sale.id} sale={sale} />)}</div> : <Card><CardContent className="p-6 text-center text-sm text-tj-muted">Belum ada Penjualan hari ini.</CardContent></Card>}</motion.div></AnimatePresence></section></div></ContentContainer></div>;
}
