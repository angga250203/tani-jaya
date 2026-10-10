"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ClipboardList, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input, SelectField } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatTransactionDate, resolvedTransactionPaymentStatus, sellerTypeLabel, transactionPaymentStatusLabel, type PaymentStatus, type TransactionRecord } from "@/lib/transactions";
import { cn, formatRupiah } from "@/lib/utils";
import { useTransactions } from "./transactions-provider";

type PurchaseFilter = "ALL" | PaymentStatus;

function SummaryCard({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return <Card><CardContent className="min-h-[96px] p-3.5 lg:p-4"><p className="text-xs font-medium text-tj-muted">{label}</p><p className="mt-3 text-xl font-bold leading-none tracking-[-0.025em] text-tj-primary-strong lg:text-2xl">{value}</p><p className="mt-1.5 text-xs text-tj-muted">{detail}</p></CardContent></Card>;
}

function PurchaseBadge({ transaction }: { transaction: TransactionRecord }) {
  const paid = resolvedTransactionPaymentStatus(transaction) === "PAID";
  return <StatusBadge status={paid ? "paid" : "pending"}>{transactionPaymentStatusLabel(transaction)}</StatusBadge>;
}

function commodityGradeList(transaction: TransactionRecord) { return transaction.items.map((item) => `${item.commodity} · ${item.grade}`).join(" • "); }

function PurchaseCard({ transaction }: { transaction: TransactionRecord }) {
  const number = transaction.transactionNumber ?? transaction.id;
  return <Link aria-label={`Buka Pembelian ${number}`} className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tj-primary" href={`/transaksi/${transaction.id}`}><Card className="transition-[border-color,box-shadow,transform] hover:border-tj-primary hover:shadow-[var(--tj-shadow-md)] active:scale-[0.99]"><CardContent className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold text-tj-primary">{number}</p><p className="mt-1 truncate text-base font-bold text-tj-text">{transaction.sellerName}</p><p className="mt-0.5 text-xs text-tj-muted">{sellerTypeLabel(transaction.sellerType)} · {formatTransactionDate(transaction.transactionDate)}</p></div><PurchaseBadge transaction={transaction} /></div><div className="mt-3 border-t border-tj-border pt-3"><p className="truncate text-sm font-semibold text-tj-text">{commodityGradeList(transaction)}</p><div className="mt-2 flex items-center justify-between gap-3"><span className="text-xs text-tj-muted">{transaction.totalNetWeight} kg bersih</span><strong className="text-sm text-tj-primary-strong">{formatRupiah(transaction.totalAmount)}</strong></div></div></CardContent></Card></Link>;
}

function PurchaseTable({ transactions }: { transactions: TransactionRecord[] }) {
  return <Card className="hidden overflow-hidden lg:block"><div className="overflow-x-auto"><table className="min-w-full text-left"><thead className="border-b border-tj-border bg-tj-canvas text-xs font-semibold text-tj-muted"><tr><th className="px-4 py-3">Pembelian</th><th className="px-4 py-3">Penjual</th><th className="px-4 py-3">Komoditas & grade</th><th className="px-4 py-3 text-right">Berat Bersih</th><th className="px-4 py-3 text-right">Nilai Pembelian</th><th className="px-4 py-3">Pembayaran</th><th className="px-4 py-3">Jenis</th><th className="px-4 py-3"><span className="sr-only">Aksi</span></th></tr></thead><tbody className="divide-y divide-tj-border">{transactions.map((transaction) => <tr className="hover:bg-tj-canvas" key={transaction.id}><td className="whitespace-nowrap px-4 py-4"><p className="text-sm font-semibold text-tj-primary">{transaction.transactionNumber ?? transaction.id}</p><p className="mt-0.5 text-xs text-tj-muted">{formatTransactionDate(transaction.transactionDate)}</p></td><td className="px-4 py-4 text-sm font-semibold text-tj-text">{transaction.sellerName}</td><td className="max-w-[240px] px-4 py-4 text-sm text-tj-text">{commodityGradeList(transaction)}</td><td className="whitespace-nowrap px-4 py-4 text-right text-sm font-semibold text-tj-text">{transaction.totalNetWeight} kg</td><td className="whitespace-nowrap px-4 py-4 text-right text-sm font-bold text-tj-primary-strong">{formatRupiah(transaction.totalAmount)}</td><td className="px-4 py-4"><PurchaseBadge transaction={transaction} /></td><td className="whitespace-nowrap px-4 py-4 text-sm text-tj-muted">{sellerTypeLabel(transaction.sellerType)}</td><td className="px-4 py-4 text-right"><Link className="inline-flex h-10 items-center rounded-lg px-3 text-sm font-semibold text-tj-primary hover:bg-tj-primary-soft" href={`/transaksi/${transaction.id}`}>Detail</Link></td></tr>)}</tbody></table></div></Card>;
}

export function PurchaseHistory() {
  const { error, isLoading, transactions } = useTransactions();
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<PurchaseFilter>("ALL");
  const [sellerType, setSellerType] = useState("ALL");
  const reduceMotion = useReducedMotion();
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("id-ID");
    return transactions.filter((transaction) => (!query || [transaction.id, transaction.transactionNumber ?? "", transaction.sellerName, ...transaction.items.map((item) => item.commodity)].some((value) => value.toLocaleLowerCase("id-ID").includes(query))) && (paymentFilter === "ALL" || resolvedTransactionPaymentStatus(transaction) === paymentFilter) && (sellerType === "ALL" || transaction.sellerType === sellerType));
  }, [paymentFilter, search, sellerType, transactions]);
  const summary = useMemo(() => transactions.reduce((result, transaction) => ({ count: result.count + 1, amount: result.amount + transaction.totalAmount, paid: result.paid + (resolvedTransactionPaymentStatus(transaction) === "PAID" ? transaction.totalAmount : 0), unpaid: result.unpaid + (resolvedTransactionPaymentStatus(transaction) === "UNPAID" ? transaction.totalAmount : 0) }), { count: 0, amount: 0, paid: 0, unpaid: 0 }), [transactions]);
  const motionProps = { animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: reduceMotion ? 0 : -6 }, initial: { opacity: 0, y: reduceMotion ? 0 : 6 }, transition: { duration: reduceMotion ? 0.01 : 0.18, ease: "easeOut" as const } };

  return <div className="mt-5 space-y-5 lg:mt-7 lg:space-y-6"><section aria-labelledby="purchase-summary-title"><div className="mb-3 flex items-center gap-2"><ClipboardList aria-hidden="true" className="text-tj-primary" size={19} /><h2 className="text-base font-bold text-tj-text lg:text-lg" id="purchase-summary-title">Ringkasan Pembelian</h2></div><div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3 lg:gap-4"><SummaryCard detail="transaksi tercatat" label="Jumlah Transaksi" value={summary.count} /><SummaryCard detail="nilai Pembelian" label="Total Pembelian" value={formatRupiah(summary.amount)} /><SummaryCard detail="tunai / Totalan selesai" label="Sudah Dibayar" value={formatRupiah(summary.paid)} /><SummaryCard detail="menunggu pembayaran" label="Sisa Pembayaran" value={formatRupiah(summary.unpaid)} /></div></section><section aria-label="Cari dan filter Pembelian" className="space-y-3"><div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px]"><div className="relative"><Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-tj-muted" size={18} /><Input aria-label="Cari nomor Pembelian, penjual, atau komoditas" className="pl-10" onChange={(event) => setSearch(event.target.value)} placeholder="Cari nomor Pembelian, penjual, atau komoditas" type="search" value={search} /></div><SelectField aria-label="Filter jenis penjual" onChange={(event) => setSellerType(event.target.value)} value={sellerType}><option value="ALL">Semua penjual</option><option value="PETANI_MITRA">Petani Mitra</option><option value="PENJUAL_UMUM">Penjual Umum</option></SelectField></div><div className="flex gap-2 overflow-x-auto pb-1">{(["ALL", "UNPAID", "PAID"] as PurchaseFilter[]).map((filter) => <button aria-pressed={paymentFilter === filter} className={cn("min-h-10 shrink-0 rounded-full border px-3 text-sm font-semibold transition-colors", paymentFilter === filter ? "border-tj-primary bg-tj-primary text-white" : "border-tj-border bg-tj-surface text-tj-muted hover:bg-tj-primary-soft hover:text-tj-primary-strong")} key={filter} onClick={() => setPaymentFilter(filter)} type="button">{filter === "ALL" ? "Semua" : filter === "PAID" ? "Lunas / Ditotal" : "Menunggu Totalan"}</button>)}</div></section><section aria-live="polite" aria-labelledby="purchase-list-title"><div className="mb-3"><h2 className="text-lg font-bold tracking-[-0.015em] text-tj-text" id="purchase-list-title">Riwayat Pembelian</h2><p className="mt-0.5 text-sm text-tj-muted">{isLoading ? "Memuat Pembelian..." : `${filtered.length} transaksi ditemukan`}</p></div>{isLoading ? <Card><CardContent className="p-6 text-center text-sm text-tj-muted">Memuat data Pembelian...</CardContent></Card> : error ? <Card><CardContent className="p-6 text-center text-sm text-tj-danger">{error}</CardContent></Card> : filtered.length ? <><motion.div className="space-y-3 lg:hidden" layout><AnimatePresence initial={false} mode="popLayout">{filtered.map((transaction) => <motion.div {...motionProps} key={transaction.id} layout><PurchaseCard transaction={transaction} /></motion.div>)}</AnimatePresence></motion.div><PurchaseTable transactions={filtered} /></> : <Card><CardContent className="p-6 text-center text-sm text-tj-muted">{transactions.length ? "Tidak ada Pembelian yang sesuai pencarian atau filter." : "Belum ada Pembelian tercatat."}</CardContent></Card>}</section></div>;
}
