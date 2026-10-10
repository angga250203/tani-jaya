import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { businessInfo } from "@/config/business";
import { StatusBadge } from "@/components/ui/status-badge";
import { ContainerWeightList } from "@/components/notas/container-weight-list";
import { formatKasbonDate } from "@/lib/kasbons";
import { type NotaRecord } from "@/lib/notas";
import { formatTotalanDate, type TotalanRecord } from "@/lib/totalans";
import { resolvedTransactionPaymentStatus, sellerTypeLabel, transactionPaymentStatusLabel, type TransactionItem, type TransactionRecord, weighingMethodLabel } from "@/lib/transactions";
import { cn, formatRupiah } from "@/lib/utils";

function DocumentHeader({ nota }: { nota: NotaRecord }) {
  const documentTitle = nota.type === "TRANSACTION" ? "NOTA PEMBELIAN" : "NOTA TOTALAN";

  return (
    <header className="border-b-2 border-tj-text pb-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <div className="flex items-start gap-3.5">
          <Image alt={businessInfo.name} className="receipt-logo h-16 w-16 shrink-0 object-contain sm:h-20 sm:w-20" height={500} sizes="(max-width: 639px) 64px, 80px" src={businessInfo.logo} width={500} />
          <div className="min-w-0 pt-0.5">
            <p className="text-base font-extrabold tracking-[0.08em] text-tj-text sm:text-lg">{businessInfo.name.toUpperCase()}</p>
            <p className="mt-1 text-xs font-semibold text-tj-text">WhatsApp: {businessInfo.whatsapp}</p>
            <p className="mt-1 text-xs text-tj-muted">{businessInfo.websiteLabel}</p>
            <address className="mt-1.5 max-w-lg text-xs leading-5 not-italic text-tj-muted">{businessInfo.address}</address>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-tj-border bg-tj-canvas p-3.5 text-sm">
          <div className="col-span-2"><dt className="text-xs font-semibold tracking-[0.1em] text-tj-muted">{documentTitle}</dt><dd className="mt-1 break-words text-lg font-bold tracking-[-0.02em] text-tj-text">{nota.number}</dd></div>
          <div><dt className="text-xs text-tj-muted">Tanggal</dt><dd className="mt-0.5 font-semibold text-tj-text">{formatKasbonDate(nota.date)}</dd></div>
          <div><dt className="text-xs text-tj-muted">ID Sumber</dt><dd className="mt-0.5 break-all font-semibold text-tj-text">{nota.sourceId}</dd></div>
        </dl>
      </div>
    </header>
  );
}

function DetailRow({ label, value, emphasis = false }: { label: string; value: React.ReactNode; emphasis?: boolean }) {
  return <div className="flex items-start justify-between gap-5 py-3"><dt className="text-sm text-tj-muted">{label}</dt><dd className={cn("text-right text-sm font-semibold text-tj-text", emphasis && "text-base font-bold text-tj-primary-strong")}>{value}</dd></div>;
}

function ItemWeightDetail({ item }: { item: TransactionItem }) {
  return <p className="mt-1 text-xs leading-5 text-tj-muted">Grade {item.grade} · Kotor {item.grossWeight} kg · Potongan {item.deduction} kg · Bersih {item.netWeight} kg · {formatRupiah(item.pricePerKg)}/kg</p>;
}

function TransactionItemList({ transaction }: { transaction: TransactionRecord }) {
  return <section className="mt-6"><h2 className="text-sm font-bold text-tj-text">Rincian Komoditas</h2><div className="mt-2 space-y-2.5 sm:hidden">{transaction.items.map((item) => <article className="rounded-xl border border-tj-border p-3.5" key={item.id}><div className="flex items-start justify-between gap-4"><div className="min-w-0"><h3 className="font-bold text-tj-text">{item.commodity}</h3><ItemWeightDetail item={item} /></div><p className="shrink-0 text-sm font-bold text-tj-primary-strong">{formatRupiah(item.subtotal)}</p></div><ContainerWeightList grossWeightKg={item.grossWeight} weighingMethod={item.weighingMethod} weights={item.containerWeights} /></article>)}</div><div className="mt-2 hidden overflow-hidden rounded-xl border border-tj-border sm:block"><table className="min-w-full text-left text-sm"><thead className="bg-tj-canvas text-xs font-semibold text-tj-muted"><tr><th className="px-4 py-3">Komoditas</th><th className="px-4 py-3 text-right">Berat Bersih</th><th className="px-4 py-3 text-right">Harga / kg</th><th className="px-4 py-3 text-right">Subtotal</th></tr></thead><tbody className="divide-y divide-tj-border">{transaction.items.map((item) => <tr key={item.id}><td className="px-4 py-3.5"><p className="font-semibold text-tj-text">{item.commodity}</p><p className="mt-0.5 text-xs text-tj-muted">Grade {item.grade} · {weighingMethodLabel(item.weighingMethod)} · Kotor {item.grossWeight} kg{item.deduction > 0 && ` · potongan ${item.deduction} kg`}</p><ContainerWeightList grossWeightKg={item.grossWeight} weighingMethod={item.weighingMethod} weights={item.containerWeights} /></td><td className="whitespace-nowrap px-4 py-3.5 text-right font-semibold text-tj-text">{item.netWeight} kg</td><td className="whitespace-nowrap px-4 py-3.5 text-right font-semibold text-tj-text">{formatRupiah(item.pricePerKg)}</td><td className="whitespace-nowrap px-4 py-3.5 text-right font-bold text-tj-primary-strong">{formatRupiah(item.subtotal)}</td></tr>)}</tbody></table></div></section>;
}

function DocumentFooter() {
  return <footer className="mt-7 border-t border-tj-border pt-4 text-center text-xs leading-5 text-tj-muted">Dokumen digital {businessInfo.name} · {businessInfo.websiteLabel}<br />Terima kasih atas kerja sama Anda.</footer>;
}

function TransactionDocument({ nota, transaction }: { nota: NotaRecord; transaction: TransactionRecord }) {
  const paid = resolvedTransactionPaymentStatus(transaction) === "PAID";
  return <><DocumentHeader nota={nota} /><section className="mt-6 rounded-xl border border-tj-border p-4"><h2 className="text-sm font-bold text-tj-text">Informasi Penjual</h2><dl className="mt-2 divide-y divide-tj-border"><DetailRow label="Nama Penjual" value={transaction.sellerName} /><DetailRow label="Jenis Penjual" value={sellerTypeLabel(transaction.sellerType)} /><DetailRow label="Tanggal Pembelian" value={formatKasbonDate(transaction.transactionDate)} /></dl></section><TransactionItemList transaction={transaction} /><section className="mt-6 ml-auto max-w-md rounded-xl border border-tj-border bg-tj-canvas px-4"><h2 className="pt-4 text-sm font-bold text-tj-text">Ringkasan Pembayaran</h2><dl className="mt-1 divide-y divide-tj-border"><DetailRow label="Total Berat Bersih" value={`${transaction.totalNetWeight} kg`} /><DetailRow label="Nilai Pembelian" value={formatRupiah(transaction.totalAmount)} emphasis /><DetailRow label="Status Pembayaran" value={<StatusBadge status={paid ? "paid" : "pending"}>{transactionPaymentStatusLabel(transaction)}</StatusBadge>} /></dl></section><div className="mt-5 print:hidden"><Link className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-tj-primary hover:underline" href={`/transaksi/${transaction.id}`}>Lihat Pembelian <ExternalLink aria-hidden="true" size={16} /></Link></div><DocumentFooter /></>;
}

function TotalanTransactionList({ totalan }: { totalan: TotalanRecord }) {
  return <section className="mt-6"><h2 className="text-sm font-bold text-tj-text">Transaksi yang Ditotal</h2><div className="mt-2 space-y-2.5 sm:hidden">{totalan.transactions.map((transaction) => <article className="rounded-xl border border-tj-border p-3.5" key={transaction.transactionId}><div className="flex items-start justify-between gap-4"><div><p className="text-xs text-tj-muted">{formatTotalanDate(transaction.transactionDate)}</p><h3 className="mt-1 font-bold text-tj-text">{transaction.commoditySummary}</h3><p className="mt-1 text-xs text-tj-muted">{transaction.totalNetWeight} kg bersih</p></div><p className="shrink-0 text-sm font-bold text-tj-primary-strong">{formatRupiah(transaction.totalAmount)}</p></div></article>)}</div><div className="mt-2 hidden overflow-hidden rounded-xl border border-tj-border sm:block"><table className="min-w-full text-left text-sm"><thead className="bg-tj-canvas text-xs font-semibold text-tj-muted"><tr><th className="px-4 py-3">Tanggal</th><th className="px-4 py-3">Komoditas</th><th className="px-4 py-3 text-right">Berat Bersih</th><th className="px-4 py-3 text-right">Nilai Transaksi</th></tr></thead><tbody className="divide-y divide-tj-border">{totalan.transactions.map((transaction) => <tr key={transaction.transactionId}><td className="whitespace-nowrap px-4 py-3.5 text-tj-muted">{formatTotalanDate(transaction.transactionDate)}</td><td className="px-4 py-3.5 font-semibold text-tj-text">{transaction.commoditySummary}</td><td className="whitespace-nowrap px-4 py-3.5 text-right font-semibold text-tj-text">{transaction.totalNetWeight} kg</td><td className="whitespace-nowrap px-4 py-3.5 text-right font-bold text-tj-primary-strong">{formatRupiah(transaction.totalAmount)}</td></tr>)}</tbody></table></div></section>;
}

function TotalanDocument({ nota, totalan }: { nota: NotaRecord; totalan: TotalanRecord }) {
  return <><DocumentHeader nota={nota} /><section className="mt-6 rounded-xl border border-tj-border p-4"><h2 className="text-sm font-bold text-tj-text">Informasi Petani</h2><dl className="mt-2 divide-y divide-tj-border"><DetailRow label="Nama Petani" value={totalan.farmerName} /><DetailRow label="Tanggal Totalan" value={formatKasbonDate(totalan.totalanDate)} /></dl></section><TotalanTransactionList totalan={totalan} /><section className="mt-6 ml-auto max-w-md rounded-xl border border-tj-border bg-tj-canvas px-4"><h2 className="pt-4 text-sm font-bold text-tj-text">Ringkasan Pembayaran</h2><dl className="mt-1 divide-y divide-tj-border"><DetailRow label="Jumlah Transaksi" value={`${totalan.totalTransactions} transaksi`} /><DetailRow label="Total Berat" value={`${totalan.totalNetWeight} kg`} /><DetailRow label="Total Pembelian" value={formatRupiah(totalan.totalHarvestValue)} /><DetailRow label="Potongan Kasbon" value={formatRupiah(totalan.kasbonDeduction)} /><DetailRow label="Jumlah Dibayar" value={formatRupiah(totalan.finalPayment)} emphasis /></dl></section><div className="mt-5 print:hidden"><Link className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-tj-primary hover:underline" href={`/totalan/${totalan.id}`}>Lihat Totalan <ExternalLink aria-hidden="true" size={16} /></Link></div><DocumentFooter /></>;
}

export function NotaDocument({ nota, transaction, totalan, className }: { nota: NotaRecord; transaction?: TransactionRecord; totalan?: TotalanRecord; className?: string }) {
  return <article className={cn("nota-print-document rounded-2xl border border-tj-border bg-tj-surface p-5 shadow-[var(--tj-shadow-sm)] sm:p-7", className)}>{transaction ? <TransactionDocument nota={nota} transaction={transaction} /> : totalan ? <TotalanDocument nota={nota} totalan={totalan} /> : null}</article>;
}
