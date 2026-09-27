"use client";

import { ArrowLeft, LoaderCircle, PackageSearch, Save } from "lucide-react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ContentContainer } from "@/components/layout/content-container";
import { UnsavedChangesDialog } from "@/components/farmers/farmer-form";
import { SaleStockPicker } from "@/components/transactions/sale-stock-picker";
import { useSales } from "@/components/transactions/sales-provider";
import { useStocks } from "@/components/stocks/stocks-provider";
import { Button } from "@/components/ui/button";
import { Input, SelectField } from "@/components/ui/input";
import { buyerTypeLabel, deriveSaleTotals, formatSaleDate, type BuyerType, type SaleCorrectionInput, type SaleDeliveryMethod, type SaleRecord, type SaleStockAllocation } from "@/lib/sales";
import { formatRupiah } from "@/lib/utils";

type DraftLine = { key: string; commodity: string; grade: "SP" | "TG" | "BR"; grossWeightKg: number; deduction: string; price: string };

function buildLines(allocations: SaleStockAllocation[], sale: SaleRecord, previous: DraftLine[] = []) {
  const byKey = new Map<string, DraftLine>();
  allocations.forEach((allocation) => {
    const key = `${allocation.commodity}::${allocation.grade}`;
    const oldLine = previous.find((line) => line.key === key);
    const stored = sale.items.find((item) => item.commodity === allocation.commodity && item.grade === allocation.grade);
    const current = byKey.get(key) ?? {
      key,
      commodity: allocation.commodity,
      grade: allocation.grade,
      grossWeightKg: 0,
      deduction: oldLine?.deduction ?? (stored ? String(stored.deductionWeightKg) : ""),
      price: oldLine?.price ?? (stored ? String(stored.pricePerKg) : ""),
    };
    current.grossWeightKg += allocation.allocatedGrossWeightKg;
    byKey.set(key, current);
  });
  return [...byKey.values()];
}

function parseWhole(value: string) {
  return /^\d+$/.test(value) ? Number(value) : null;
}

export function SaleCorrectionForm({ saleId }: { saleId: string }) {
  const router = useRouter();
  const { correctSale, sales, isLoading: salesLoading, error: salesError } = useSales();
  const { getSourcesForSaleCorrection, isLoading: stockLoading, error: stockError } = useStocks();
  const sale = sales.find((record) => record.id === saleId);
  const [selectedAllocations, setSelectedAllocations] = useState<SaleStockAllocation[]>(() => sale?.allocations.filter((allocation) => !allocation.releasedAt) ?? []);
  const [lines, setLines] = useState<DraftLine[]>(() => sale ? buildLines(sale.allocations ?? [], sale) : []);
  const [buyerName, setBuyerName] = useState(() => sale?.buyerName ?? "");
  const [buyerType, setBuyerType] = useState<BuyerType>(() => sale?.buyerType ?? "GENERAL_BUYER");
  const [deliveryMethod, setDeliveryMethod] = useState<SaleDeliveryMethod>(() => sale?.deliveryMethod ?? "BUYER_PICKUP");
  const [expeditionName, setExpeditionName] = useState(() => sale?.expeditionName ?? "");
  const [expeditionRate, setExpeditionRate] = useState(() => sale?.expeditionRatePerKg === undefined ? "" : String(sale.expeditionRatePerKg));
  const [reason, setReason] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  const totals = useMemo(() => {
    const mapped = lines.map((line) => {
      const deduction = parseWhole(line.deduction) ?? 0;
      const price = parseWhole(line.price) ?? 0;
      const netWeightKg = Math.max(0, line.grossWeightKg - deduction);
      return { grossWeightKg: line.grossWeightKg, deductionWeightKg: deduction, netWeightKg, pricePerKg: price, subtotal: netWeightKg * price };
    });
    return {
      gross: mapped.reduce((total, line) => total + line.grossWeightKg, 0),
      amount: mapped.reduce((total, line) => total + line.subtotal, 0),
    };
  }, [lines]);

  if (salesLoading || stockLoading) {
    return <div className="py-5 sm:py-6 lg:py-8"><ContentContainer><div className="rounded-2xl border border-tj-border bg-tj-surface p-6 text-center text-sm text-tj-muted">Memuat data Penjualan dan stok...</div></ContentContainer></div>;
  }
  if (salesError || stockError) {
    return <div className="py-5 sm:py-6 lg:py-8"><ContentContainer><div className="rounded-2xl border border-tj-danger/20 bg-tj-danger-soft p-6 text-center text-sm text-tj-danger">{salesError ?? stockError}</div></ContentContainer></div>;
  }
  if (!sale || sale.lifecycleStatus !== "ACTIVE") {
    return <div className="py-5 sm:py-6 lg:py-8"><ContentContainer><div className="rounded-2xl border border-tj-border bg-tj-surface p-6 text-center"><h1 className="text-lg font-bold text-tj-text">Penjualan tidak dapat dikoreksi</h1><p className="mt-2 text-sm text-tj-muted">Transaksi tidak ditemukan atau sudah dibatalkan.</p><Link className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-tj-primary px-4 text-sm font-semibold text-white" href="/transaksi?tab=penjualan">Kembali ke Penjualan</Link></div></ContentContainer></div>;
  }

  const paid = deriveSaleTotals(sale).totalPaid;
  const correctionSources = getSourcesForSaleCorrection(sale.allocations ?? []);
  const isDirty = buyerName !== sale.buyerName || buyerType !== sale.buyerType || deliveryMethod !== sale.deliveryMethod || expeditionName !== (sale.expeditionName ?? "") || expeditionRate !== (sale.expeditionRatePerKg === undefined ? "" : String(sale.expeditionRatePerKg)) || reason.trim().length > 0 || JSON.stringify(selectedAllocations) !== JSON.stringify(sale.allocations ?? []) || JSON.stringify(lines) !== JSON.stringify(buildLines(sale.allocations ?? [], sale));

  const setLine = (key: string, field: "deduction" | "price", value: string) => {
    if (value !== "" && !/^\d*$/.test(value)) return;
    setLines((current) => current.map((line) => line.key === key ? { ...line, [field]: value } : line));
  };

  const receiveStock = (allocations: SaleStockAllocation[]) => {
    setSelectedAllocations(allocations);
    setLines((current) => buildLines(allocations, sale, current));
    setPickerOpen(false);
  };

  const submit = async () => {
    const priceOrDeductionInvalid = lines.some((line) => {
      const deduction = parseWhole(line.deduction);
      const price = parseWhole(line.price);
      return deduction === null || price === null || deduction > line.grossWeightKg;
    });
    const expeditionRateValue = parseWhole(expeditionRate);
    if (!buyerName.trim()) { setError("Nama pembeli wajib diisi."); return; }
    if (!selectedAllocations.length || !lines.length) { setError("Pilih stok untuk Penjualan."); return; }
    if (priceOrDeductionInvalid) { setError("Isi potongan dan harga per kg dengan angka bulat yang valid."); return; }
    if (deliveryMethod === "EXPEDITION" && (!expeditionName.trim() || expeditionRateValue === null)) { setError("Nama ekspedisi dan tarif per kg wajib diisi."); return; }
    if (!reason.trim()) { setError("Alasan koreksi wajib diisi."); return; }

    const items: SaleCorrectionInput["items"] = lines.map((line) => {
      const deductionWeightKg = parseWhole(line.deduction)!;
      const pricePerKg = parseWhole(line.price)!;
      const netWeightKg = line.grossWeightKg - deductionWeightKg;
      return { commodity: line.commodity, grade: line.grade, grossWeightKg: line.grossWeightKg, deductionWeightKg, netWeightKg, pricePerKg, subtotal: netWeightKg * pricePerKg };
    });
    setIsSubmitting(true);
    const result = await correctSale(sale.id, { buyerName, buyerType, deliveryMethod, expeditionName, expeditionRatePerKg: deliveryMethod === "EXPEDITION" ? expeditionRateValue ?? undefined : undefined, items, allocations: selectedAllocations, reason });
    setIsSubmitting(false);
    if (result.error) { setError(result.error); return; }
    setToast("Penjualan berhasil dikoreksi.");
    window.setTimeout(() => router.push(`/transaksi/penjualan/${sale.id}`), 420);
  };

  const navigateBack = () => {
    if (isDirty) { setDiscardOpen(true); return; }
    router.push(`/transaksi/penjualan/${sale.id}`);
  };

  return <div className="py-5 sm:py-6 lg:py-8"><ContentContainer className="max-w-5xl"><header className="flex items-center gap-3 border-b border-tj-border pb-5"><Button aria-label="Kembali ke detail Penjualan" onClick={navigateBack} size="icon" variant="secondary"><ArrowLeft aria-hidden="true" size={20} /></Button><div className="min-w-0"><p className="truncate text-sm text-tj-muted">Koreksi {sale.saleNumber} · {formatSaleDate(sale.saleDate)}</p><h1 className="text-xl font-bold tracking-[-0.02em] text-tj-text lg:text-[28px]">Koreksi Penjualan</h1></div></header>
    <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div className="space-y-5">
        <section className="rounded-2xl border border-tj-border bg-tj-surface p-4 sm:p-5"><h2 className="text-base font-bold text-tj-text">Data Pembeli</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="space-y-1.5 sm:col-span-2"><span className="text-sm font-semibold text-tj-text">Nama pembeli</span><Input onChange={(event) => setBuyerName(event.target.value)} value={buyerName} /></label><label className="space-y-1.5"><span className="text-sm font-semibold text-tj-text">Jenis pembeli</span><SelectField onChange={(event) => setBuyerType(event.target.value as BuyerType)} value={buyerType}>{(["GENERAL_BUYER", "WEIGHER_COLLECTOR", "MARKET"] as BuyerType[]).map((type) => <option key={type} value={type}>{buyerTypeLabel(type)}</option>)}</SelectField></label><label className="space-y-1.5"><span className="text-sm font-semibold text-tj-text">Metode pengiriman</span><SelectField onChange={(event) => setDeliveryMethod(event.target.value as SaleDeliveryMethod)} value={deliveryMethod}><option value="BUYER_PICKUP">Diambil Pembeli</option><option value="EXPEDITION">Ekspedisi</option></SelectField></label>{deliveryMethod === "EXPEDITION" && <><label className="space-y-1.5"><span className="text-sm font-semibold text-tj-text">Nama ekspedisi/truk</span><Input onChange={(event) => setExpeditionName(event.target.value)} value={expeditionName} /></label><label className="space-y-1.5"><span className="text-sm font-semibold text-tj-text">Tarif ekspedisi/kg</span><Input inputMode="numeric" onChange={(event) => { if (/^\d*$/.test(event.target.value)) setExpeditionRate(event.target.value); }} placeholder="Contoh: 200" value={expeditionRate} /></label></>}</div></section>
        <section className="rounded-2xl border border-tj-border bg-tj-surface p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-bold text-tj-text">Stok & Barang</h2><p className="mt-1 text-sm text-tj-muted">Alokasi lama dihitung tersedia saat koreksi sampai data baru disimpan.</p></div><Button onClick={() => setPickerOpen(true)} variant="secondary"><PackageSearch aria-hidden="true" size={18} />Ubah Stok</Button></div><div className="mt-4 space-y-3">{lines.map((line) => <div className="rounded-xl bg-tj-canvas p-3.5" key={line.key}><div className="flex items-center justify-between"><p className="font-bold text-tj-text">{line.commodity} <span className="text-tj-primary">{line.grade}</span></p><span className="text-sm font-semibold text-tj-primary-strong">{line.grossWeightKg} kg fisik</span></div><div className="mt-3 grid grid-cols-2 gap-3"><label className="space-y-1.5"><span className="text-xs font-semibold text-tj-muted">Potongan (kg)</span><Input inputMode="numeric" onChange={(event) => setLine(line.key, "deduction", event.target.value)} placeholder="0" value={line.deduction} /></label><label className="space-y-1.5"><span className="text-xs font-semibold text-tj-muted">Harga jual/kg</span><Input inputMode="numeric" onChange={(event) => setLine(line.key, "price", event.target.value)} placeholder="Contoh: 15000" value={line.price} /></label></div><p className="mt-3 text-sm text-tj-muted">Berat bersih {Math.max(0, line.grossWeightKg - (parseWhole(line.deduction) ?? 0))} kg · {formatRupiah(Math.max(0, line.grossWeightKg - (parseWhole(line.deduction) ?? 0)) * (parseWhole(line.price) ?? 0))}</p></div>)}</div></section>
        <section className="rounded-2xl border border-tj-border bg-tj-surface p-4 sm:p-5"><h2 className="text-base font-bold text-tj-text">Catatan Koreksi</h2><label className="mt-3 block space-y-1.5"><span className="text-sm font-semibold text-tj-text">Alasan koreksi</span><textarea className="min-h-24 w-full rounded-xl border border-tj-border bg-tj-surface px-3.5 py-3 text-sm text-tj-text outline-none focus:border-tj-primary" onChange={(event) => setReason(event.target.value)} placeholder="Contoh: Harga jual disesuaikan setelah timbang ulang." value={reason} /></label></section>
      </div>
      <aside className="rounded-2xl border border-tj-border bg-tj-surface p-4 shadow-[var(--tj-shadow-sm)] lg:sticky lg:top-6"><h2 className="text-base font-bold text-tj-text">Ringkasan Koreksi</h2><div className="mt-4 space-y-3 text-sm"><div className="flex justify-between gap-3"><span className="text-tj-muted">Berat fisik</span><strong>{totals.gross} kg</strong></div><div className="flex justify-between gap-3"><span className="text-tj-muted">Total nota baru</span><strong>{formatRupiah(totals.amount)}</strong></div><div className="flex justify-between gap-3 border-t border-tj-border pt-3"><span className="text-tj-muted">Sudah dibayar</span><strong className="text-tj-primary-strong">{formatRupiah(paid)}</strong></div><p className="rounded-xl bg-tj-info-soft px-3 py-2.5 text-xs leading-5 text-tj-info">Riwayat pembayaran tidak dapat diubah. Total nota baru tidak boleh lebih kecil dari pembayaran yang sudah diterima.</p></div>{error && <p className="mt-4 rounded-xl bg-tj-danger-soft px-3 py-2.5 text-sm font-medium text-tj-danger" role="alert">{error}</p>}{toast && <p className="mt-4 rounded-xl bg-tj-primary-soft px-3 py-2.5 text-sm font-semibold text-tj-primary-strong" role="status">{toast}</p>}<Button className="mt-5 w-full" disabled={isSubmitting} onClick={submit}>{isSubmitting ? <LoaderCircle aria-hidden="true" className="animate-spin" size={18} /> : <Save aria-hidden="true" size={18} />}Simpan Koreksi</Button></aside>
    </div><SaleStockPicker onClose={() => setPickerOpen(false)} onConfirm={receiveStock} open={pickerOpen} selectedAllocations={selectedAllocations} sources={correctionSources} /><UnsavedChangesDialog onClose={() => setDiscardOpen(false)} onDiscard={() => router.push(`/transaksi/penjualan/${sale.id}`)} open={discardOpen} /></ContentContainer></div>;
}
