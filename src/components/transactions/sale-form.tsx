"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, CheckCircle2, ChevronDown, PackagePlus, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UnsavedChangesDialog } from "@/components/farmers/farmer-form";
import { ContentContainer } from "@/components/layout/content-container";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, SelectField } from "@/components/ui/input";
import { useStocks } from "@/components/stocks/stocks-provider";
import { getOperationalDateISO } from "@/lib/operational-date";
import { gradeLabels } from "@/lib/stocks";
import { type BuyerType, type SaleCreateInput, type SaleStockAllocation, type SaleDeliveryMethod, type SaleItem } from "@/lib/sales";
import { cn, formatRupiah } from "@/lib/utils";
import { SaleStockPicker } from "./sale-stock-picker";
import { useSales } from "./sales-provider";

type PaymentChoice = "PAID" | "DP" | "DEBT";
type ItemInputs = Record<string, { deduction: string; price: string }>;
type ValidationErrors = Record<string, string>;

function parseWhole(value: string) {
  return /^\d+$/.test(value) ? Number(value) : null;
}

function groupKey(allocation: SaleStockAllocation) {
  return `${allocation.commodity.trim().toLocaleLowerCase("id-ID")}:${allocation.grade}`;
}

function gradeClass(grade: SaleItem["grade"]) {
  return grade === "SP" ? "bg-tj-primary-soft text-tj-primary-strong" : grade === "TG" ? "bg-tj-info-soft text-tj-info" : "bg-tj-warning-soft text-tj-warning";
}

export function SaleForm() {
  const router = useRouter();
  const { sources } = useStocks();
  const { createSale } = useSales();
  const reduceMotion = useReducedMotion();
  const buyerRef = useRef<HTMLInputElement>(null);
  const [buyerName, setBuyerName] = useState("");
  const [buyerType, setBuyerType] = useState<BuyerType | "">("");
  const [allocations, setAllocations] = useState<SaleStockAllocation[]>([]);
  const [itemInputs, setItemInputs] = useState<ItemInputs>({});
  const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>("PAID");
  const [dpAmount, setDpAmount] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<SaleDeliveryMethod>("BUYER_PICKUP");
  const [expeditionName, setExpeditionName] = useState("");
  const [expeditionRate, setExpeditionRate] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [openSources, setOpenSources] = useState<string[]>([]);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const leaveDestinationRef = useRef("/transaksi?tab=penjualan");

  const groupedItems = useMemo(() => {
    const grouped = new Map<string, { key: string; commodity: string; grade: SaleItem["grade"]; allocations: SaleStockAllocation[]; grossWeightKg: number }>();
    allocations.forEach((allocation) => {
      const key = groupKey(allocation);
      const existing = grouped.get(key);
      if (existing) { existing.allocations.push(allocation); existing.grossWeightKg += allocation.allocatedGrossWeightKg; }
      else grouped.set(key, { key, commodity: allocation.commodity, grade: allocation.grade, allocations: [allocation], grossWeightKg: allocation.allocatedGrossWeightKg });
    });
    return [...grouped.values()].sort((a, b) => a.commodity.localeCompare(b.commodity, "id-ID") || a.grade.localeCompare(b.grade));
  }, [allocations]);

  const calculatedItems = useMemo(() => groupedItems.map((item) => {
    const fields = itemInputs[item.key] ?? { deduction: "", price: "" };
    const enteredDeduction = parseWhole(fields.deduction);
    const enteredPrice = parseWhole(fields.price);
    const deductionWeightKg = enteredDeduction ?? 0;
    const netWeightKg = Math.max(0, item.grossWeightKg - deductionWeightKg);
    const subtotal = enteredPrice === null ? 0 : netWeightKg * enteredPrice;
    return { ...item, fields, enteredDeduction, enteredPrice, deductionWeightKg, netWeightKg, subtotal };
  }), [groupedItems, itemInputs]);

  const totals = useMemo(() => {
    const gross = calculatedItems.reduce((total, item) => total + item.grossWeightKg, 0);
    const deduction = calculatedItems.reduce((total, item) => total + item.deductionWeightKg, 0);
    const net = calculatedItems.reduce((total, item) => total + item.netWeightKg, 0);
    const amount = calculatedItems.reduce((total, item) => total + item.subtotal, 0);
    const rate = parseWhole(expeditionRate);
    const expeditionCost = deliveryMethod === "EXPEDITION" && rate !== null ? gross * rate : 0;
    const enteredPayment = paymentChoice === "PAID" ? amount : paymentChoice === "DEBT" ? 0 : parseWhole(dpAmount) ?? 0;
    return { gross, deduction, net, amount, rate, expeditionCost, initialPayment: enteredPayment, remaining: Math.max(0, amount - enteredPayment) };
  }, [calculatedItems, deliveryMethod, dpAmount, expeditionRate, paymentChoice]);

  const isDirty = Boolean(buyerName || buyerType || allocations.length || dpAmount || deliveryMethod === "EXPEDITION" || Object.values(itemInputs).some((item) => item.deduction || item.price));
  const setItemField = (key: string, field: "deduction" | "price", value: string) => setItemInputs((current) => ({ ...current, [key]: { deduction: current[key]?.deduction ?? "", price: current[key]?.price ?? "", [field]: value } }));
  const requestLeave = () => { if (isDirty) setLeaveDialogOpen(true); else router.push(leaveDestinationRef.current); };
  const removeItem = (key: string) => setAllocations((current) => current.filter((allocation) => groupKey(allocation) !== key));

  const validate = () => {
    const next: ValidationErrors = {};
    if (!buyerName.trim()) next.buyer = "Nama pembeli wajib diisi.";
    if (!buyerType) next.buyerType = "Pilih jenis pembeli.";
    if (!allocations.length) next.stock = "Pilih minimal satu stok untuk dijual.";
    calculatedItems.forEach((item) => {
      if (item.enteredDeduction !== null && item.enteredDeduction > item.grossWeightKg) next[`deduction-${item.key}`] = "Potongan tidak boleh melebihi berat kotor.";
      if (item.fields.deduction && item.enteredDeduction === null) next[`deduction-${item.key}`] = "Potongan harus berupa kg bulat.";
      if (item.enteredPrice === null) next[`price-${item.key}`] = "Harga jual per kg wajib diisi sebagai Rupiah bulat.";
    });
    if (paymentChoice === "DP") { const payment = parseWhole(dpAmount); if (payment === null || payment <= 0 || payment >= totals.amount) next.payment = "DP/Titip harus lebih dari Rp0 dan lebih kecil dari Total Nota."; }
    if (deliveryMethod === "EXPEDITION") { if (!expeditionName.trim()) next.expeditionName = "Nama ekspedisi atau truk wajib diisi."; if (totals.rate === null) next.expeditionRate = "Tarif ekspedisi per kg wajib diisi sebagai Rupiah bulat."; }
    setErrors(next);
    if (Object.keys(next).length) { if (next.buyer || next.buyerType) buyerRef.current?.focus(); else if (next.stock) setPickerOpen(true); else document.querySelector<HTMLInputElement>("[aria-invalid='true']")?.focus(); }
    return !Object.keys(next).length;
  };

  const submit = async () => {
    if (isSubmitting || !validate()) return;
    const saleDate = getOperationalDateISO();
    const input: SaleCreateInput = { saleDate, buyerName, buyerType: buyerType as BuyerType, deliveryMethod, expeditionName: deliveryMethod === "EXPEDITION" ? expeditionName : undefined, expeditionRatePerKg: deliveryMethod === "EXPEDITION" ? totals.rate ?? undefined : undefined, allocations, items: calculatedItems.map((item) => ({ commodity: item.commodity, grade: item.grade, grossWeightKg: item.grossWeightKg, deductionWeightKg: item.deductionWeightKg, netWeightKg: item.netWeightKg, pricePerKg: item.enteredPrice ?? 0, subtotal: item.subtotal })), initialPayment: totals.initialPayment };
    setIsSubmitting(true);
    const result = await createSale(input);
    if (result.error || !result.sale) { setErrors({ submit: result.error ?? "Stok berubah atau alokasi tidak lagi tersedia. Pilih ulang stok Anda." }); setIsSubmitting(false); return; }
    setToast("Penjualan berhasil disimpan.");
    window.setTimeout(() => router.push(`/transaksi/penjualan/${result.sale!.id}`), reduceMotion ? 20 : 420);
  };

  return <div className="py-5 pb-28 sm:py-6 lg:py-8 lg:pb-8"><ContentContainer><header className="flex items-center gap-3 border-b border-tj-border pb-5 lg:pb-6"><button aria-label="Kembali ke Penjualan" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-tj-muted hover:bg-tj-primary-soft hover:text-tj-primary" onClick={requestLeave} type="button"><ArrowLeft aria-hidden="true" size={21} /></button><div className="min-w-0"><p className="text-xs font-medium text-tj-muted sm:text-sm">Penjualan</p><h1 className="text-[19px] font-bold leading-6 tracking-[-0.02em] text-tj-text lg:text-[28px] lg:leading-8">Penjualan Baru</h1></div></header><div className="mt-5 lg:mt-7 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6"><main className="space-y-5"><Card><CardContent className="space-y-4 p-4 lg:p-5"><h2 className="text-base font-bold text-tj-text">1. Pembeli</h2><div className="space-y-1.5"><label className="text-sm font-semibold text-tj-text" htmlFor="sale-buyer-name">Nama Pembeli</label><Input aria-invalid={Boolean(errors.buyer)} id="sale-buyer-name" onChange={(event) => setBuyerName(event.target.value)} placeholder="Contoh: Pak Ahmad" ref={buyerRef} value={buyerName} />{errors.buyer && <p className="text-xs text-tj-danger">{errors.buyer}</p>}</div><div className="space-y-1.5"><label className="text-sm font-semibold text-tj-text" htmlFor="sale-buyer-type">Jenis Pembeli</label><SelectField aria-invalid={Boolean(errors.buyerType)} id="sale-buyer-type" onChange={(event) => setBuyerType(event.target.value as BuyerType | "")} value={buyerType}><option value="">Pilih jenis pembeli</option><option value="GENERAL_BUYER">Pembeli Umum</option><option value="WEIGHER_COLLECTOR">Penimbang/Pengepul</option><option value="MARKET">Pasar</option></SelectField>{errors.buyerType && <p className="text-xs text-tj-danger">{errors.buyerType}</p>}</div></CardContent></Card><Card><CardContent className="p-4 lg:p-5"><div className="flex items-start justify-between gap-4"><div><h2 className="text-base font-bold text-tj-text">2. Pilih Stok</h2><p className="mt-1 text-sm leading-6 text-tj-muted">Stok fisik berasal dari Pembelian dan tidak dapat diubah manual.</p></div><Button className="shrink-0" onClick={() => setPickerOpen(true)} variant="secondary"><PackagePlus aria-hidden="true" size={18} />Pilih Stok</Button></div>{errors.stock && <p className="mt-3 text-xs text-tj-danger">{errors.stock}</p>}{allocations.length > 0 && <p className="mt-3 rounded-xl bg-tj-primary-soft px-3 py-2 text-sm font-semibold text-tj-primary-strong">{allocations.length} alokasi stok dipilih · {totals.gross} kg fisik</p>}</CardContent></Card><section className="space-y-3" aria-labelledby="sale-items-title"><div className="flex items-center justify-between gap-3"><div><h2 className="text-base font-bold text-tj-text" id="sale-items-title">3. Detail Penjualan</h2><p className="mt-1 text-sm text-tj-muted">Stok keluar memakai berat kotor; nilai nota memakai berat bersih.</p></div>{allocations.length > 0 && <button className="min-h-10 rounded-lg px-2.5 text-sm font-semibold text-tj-primary hover:bg-tj-primary-soft" onClick={() => setPickerOpen(true)} type="button">Ubah stok</button>}</div><AnimatePresence initial={false}>{calculatedItems.map((item) => { const isSourcesOpen = openSources.includes(item.key); return <motion.div animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }} initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }} key={item.key} transition={{ duration: reduceMotion ? 0.01 : 0.18 }}><Card><CardContent className="p-4 lg:p-5"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-bold text-tj-text">{item.commodity}</h3><span className={cn("rounded-full px-2 py-1 text-xs font-semibold", gradeClass(item.grade))}>{item.grade} · {gradeLabels[item.grade]}</span></div><p className="mt-1 text-sm text-tj-muted">Berat fisik {item.grossWeightKg} kg · {item.allocations.length} sumber internal</p></div><button aria-label={`Hapus ${item.commodity} ${item.grade}`} className="min-h-10 rounded-lg px-2 text-sm font-semibold text-tj-danger hover:bg-tj-danger-soft" onClick={() => removeItem(item.key)} type="button">Hapus</button></div><button aria-expanded={isSourcesOpen} className="mt-3 inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-tj-primary" onClick={() => setOpenSources((current) => current.includes(item.key) ? current.filter((key) => key !== item.key) : [...current, item.key])} type="button">Lihat sumber stok<ChevronDown aria-hidden="true" className={cn("transition-transform", isSourcesOpen && "rotate-180")} size={15} /></button><AnimatePresence initial={false}>{isSourcesOpen && <motion.ul animate={{ height: "auto", opacity: 1 }} className="mt-2 overflow-hidden rounded-xl border border-tj-border bg-tj-canvas px-3" exit={{ height: 0, opacity: 0 }} initial={{ height: 0, opacity: 0 }} transition={{ duration: reduceMotion ? 0.01 : 0.18 }}>{item.allocations.map((allocation) => <li className="flex justify-between gap-3 border-b border-tj-border py-2 text-xs last:border-0" key={allocation.id}><span className="text-tj-muted">{allocation.sellerName} · {allocation.sellerType === "PETANI_MITRA" ? "Petani Mitra" : "Penjual Umum"}</span><strong className="text-tj-text">{allocation.allocatedGrossWeightKg} kg</strong></li>)}</motion.ul>}</AnimatePresence><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="space-y-1.5"><label className="text-sm font-semibold text-tj-text" htmlFor={`deduction-${item.key}`}>Potongan Jual (kg)</label><Input aria-invalid={Boolean(errors[`deduction-${item.key}`])} id={`deduction-${item.key}`} inputMode="numeric" onChange={(event) => setItemField(item.key, "deduction", event.target.value)} placeholder="Opsional" type="text" value={item.fields.deduction} />{errors[`deduction-${item.key}`] && <p className="text-xs text-tj-danger">{errors[`deduction-${item.key}`]}</p>}</div><div className="space-y-1.5"><label className="text-sm font-semibold text-tj-text" htmlFor={`price-${item.key}`}>Harga Jual / kg</label><Input aria-invalid={Boolean(errors[`price-${item.key}`])} id={`price-${item.key}`} inputMode="numeric" onChange={(event) => setItemField(item.key, "price", event.target.value)} placeholder="Rp per kg" type="text" value={item.fields.price} />{errors[`price-${item.key}`] && <p className="text-xs text-tj-danger">{errors[`price-${item.key}`]}</p>}</div></div><div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-tj-canvas p-3 text-center"><div><p className="text-[11px] text-tj-muted">Kotor</p><p className="mt-0.5 text-sm font-bold text-tj-text">{item.grossWeightKg} kg</p></div><div><p className="text-[11px] text-tj-muted">Bersih</p><p className="mt-0.5 text-sm font-bold text-tj-text">{item.netWeightKg} kg</p></div><div><p className="text-[11px] text-tj-muted">Subtotal</p><p className="mt-0.5 text-sm font-bold text-tj-primary-strong">{item.enteredPrice === null ? "—" : formatRupiah(item.subtotal)}</p></div></div></CardContent></Card></motion.div>; })}</AnimatePresence>{!calculatedItems.length && <Card><CardContent className="p-5 text-center text-sm text-tj-muted">Pilih stok untuk membentuk item Penjualan.</CardContent></Card>}</section><Card><CardContent className="space-y-4 p-4 lg:p-5"><h2 className="text-base font-bold text-tj-text">4. Pembayaran</h2><fieldset className="space-y-2"><legend className="sr-only">Status pembayaran awal</legend>{([{ value: "PAID", label: "Lunas", description: "Uang diterima sama dengan Total Nota." }, { value: "DP", label: "DP / Titip", description: "Masukkan sebagian pembayaran awal." }, { value: "DEBT", label: "Utang", description: "Belum ada pembayaran awal." }] as const).map((choice) => <label className="flex min-h-12 cursor-pointer items-start gap-2 rounded-xl border border-tj-border px-3 py-2.5 text-sm has-[:checked]:border-tj-primary has-[:checked]:bg-tj-primary-soft" key={choice.value}><input checked={paymentChoice === choice.value} className="mt-0.5 h-4 w-4 accent-[#176b3a]" name="payment-choice" onChange={() => setPaymentChoice(choice.value)} type="radio" /><span><span className="font-semibold text-tj-text">{choice.label}</span><span className="mt-0.5 block text-xs text-tj-muted">{choice.description}</span></span></label>)}</fieldset><AnimatePresence initial={false}>{paymentChoice === "DP" && <motion.div animate={{ opacity: 1, height: "auto" }} className="space-y-1.5 overflow-hidden" exit={{ opacity: 0, height: 0 }} initial={{ opacity: 0, height: 0 }} transition={{ duration: reduceMotion ? 0.01 : 0.18 }}><label className="text-sm font-semibold text-tj-text" htmlFor="initial-payment">Pembayaran Awal</label><Input aria-invalid={Boolean(errors.payment)} id="initial-payment" inputMode="numeric" onChange={(event) => setDpAmount(event.target.value)} placeholder="Rp" type="text" value={dpAmount} />{errors.payment && <p className="text-xs text-tj-danger">{errors.payment}</p>}</motion.div>}</AnimatePresence><div className="grid grid-cols-2 gap-3 rounded-xl bg-tj-canvas p-3 text-sm"><span className="text-tj-muted">Dibayar <strong className="block text-tj-text">{formatRupiah(totals.initialPayment)}</strong></span><span className="text-right text-tj-muted">Sisa Piutang <strong className="block text-tj-warning">{formatRupiah(totals.remaining)}</strong></span></div></CardContent></Card><Card><CardContent className="space-y-4 p-4 lg:p-5"><h2 className="text-base font-bold text-tj-text">5. Pengiriman</h2><fieldset className="grid grid-cols-2 gap-2"><legend className="sr-only">Metode pengiriman</legend><label className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-tj-border px-3 text-sm font-semibold has-[:checked]:border-tj-primary has-[:checked]:bg-tj-primary-soft"><input checked={deliveryMethod === "BUYER_PICKUP"} className="h-4 w-4 accent-[#176b3a]" name="delivery" onChange={() => setDeliveryMethod("BUYER_PICKUP")} type="radio" />Diambil Pembeli</label><label className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-tj-border px-3 text-sm font-semibold has-[:checked]:border-tj-primary has-[:checked]:bg-tj-primary-soft"><input checked={deliveryMethod === "EXPEDITION"} className="h-4 w-4 accent-[#176b3a]" name="delivery" onChange={() => setDeliveryMethod("EXPEDITION")} type="radio" />Ekspedisi</label></fieldset><AnimatePresence initial={false}>{deliveryMethod === "EXPEDITION" && <motion.div animate={{ opacity: 1, height: "auto" }} className="grid gap-3 overflow-hidden sm:grid-cols-2" exit={{ opacity: 0, height: 0 }} initial={{ opacity: 0, height: 0 }} transition={{ duration: reduceMotion ? 0.01 : 0.18 }}><div className="space-y-1.5"><label className="text-sm font-semibold text-tj-text" htmlFor="expedition-name">Nama Ekspedisi / Truk</label><Input aria-invalid={Boolean(errors.expeditionName)} id="expedition-name" onChange={(event) => setExpeditionName(event.target.value)} placeholder="Contoh: Truk Pak Darto" value={expeditionName} />{errors.expeditionName && <p className="text-xs text-tj-danger">{errors.expeditionName}</p>}</div><div className="space-y-1.5"><label className="text-sm font-semibold text-tj-text" htmlFor="expedition-rate">Tarif Ekspedisi / kg</label><Input aria-invalid={Boolean(errors.expeditionRate)} id="expedition-rate" inputMode="numeric" onChange={(event) => setExpeditionRate(event.target.value)} placeholder="Rp per kg" type="text" value={expeditionRate} />{errors.expeditionRate && <p className="text-xs text-tj-danger">{errors.expeditionRate}</p>}</div></motion.div>}</AnimatePresence>{deliveryMethod === "EXPEDITION" && <p className="rounded-xl bg-tj-info-soft px-3 py-2 text-sm text-tj-info">Biaya ekspedisi internal: <strong>{totals.rate === null ? "—" : formatRupiah(totals.expeditionCost)}</strong>. Tidak menambah Total Nota pembeli.</p>}</CardContent></Card></main><aside className="mt-5 space-y-3 lg:sticky lg:top-8 lg:mt-0 lg:self-start"><Card><CardContent className="space-y-4 p-4 lg:p-5"><h2 className="text-base font-bold text-tj-text">6. Ringkasan</h2><dl className="space-y-3 border-y border-tj-border py-3"><div className="flex justify-between gap-4"><dt className="text-sm text-tj-muted">Berat fisik</dt><dd className="text-sm font-bold text-tj-text">{totals.gross} kg</dd></div><div className="flex justify-between gap-4"><dt className="text-sm text-tj-muted">Total potongan</dt><dd className="text-sm font-semibold text-tj-text">{totals.deduction} kg</dd></div><div className="flex justify-between gap-4"><dt className="text-sm text-tj-muted">Berat bersih</dt><dd className="text-sm font-bold text-tj-text">{totals.net} kg</dd></div><div className="flex justify-between gap-4"><dt className="text-sm text-tj-muted">Total Nota</dt><dd className="text-base font-bold text-tj-primary-strong">{formatRupiah(totals.amount)}</dd></div><div className="flex justify-between gap-4"><dt className="text-sm text-tj-muted">Uang Diterima</dt><dd className="text-sm font-semibold text-tj-text">{formatRupiah(totals.initialPayment)}</dd></div><div className="flex justify-between gap-4"><dt className="text-sm text-tj-muted">Sisa Piutang</dt><dd className="text-sm font-bold text-tj-warning">{formatRupiah(totals.remaining)}</dd></div>{deliveryMethod === "EXPEDITION" && <div className="flex justify-between gap-4"><dt className="text-sm text-tj-muted">Biaya Ekspedisi <span className="block text-xs">internal</span></dt><dd className="text-sm font-semibold text-tj-text">{totals.rate === null ? "—" : formatRupiah(totals.expeditionCost)}</dd></div>}</dl><p className="text-xs leading-5 text-tj-muted">Stok berkurang dari berat kotor. Nilai nota dihitung dari berat bersih × harga/kg.</p>{errors.submit && <p className="rounded-xl bg-tj-danger-soft px-3 py-2 text-sm font-medium text-tj-danger" role="alert">{errors.submit}</p>}<div className="space-y-2"><Button className="w-full" disabled={isSubmitting} onClick={submit}>{isSubmitting ? "Menyimpan..." : "Simpan Penjualan"}</Button><button className={cn(buttonVariants({ variant: "secondary" }), "w-full")} onClick={requestLeave} type="button">Batal</button></div></CardContent></Card></aside></div></ContentContainer><SaleStockPicker onClose={() => setPickerOpen(false)} onConfirm={(nextAllocations) => { setAllocations(nextAllocations); setErrors((current) => ({ ...current, stock: "" })); setPickerOpen(false); }} open={pickerOpen} selectedAllocations={allocations} sources={sources} /><UnsavedChangesDialog onClose={() => setLeaveDialogOpen(false)} onDiscard={() => router.push(leaveDestinationRef.current)} open={leaveDialogOpen} /><AnimatePresence initial={false}>{toast && <motion.div animate={{ opacity: 1, y: 0 }} className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[80] mx-auto flex max-w-md items-center gap-2 rounded-xl bg-tj-text px-4 py-3 text-sm font-semibold text-white shadow-[var(--tj-shadow-md)] lg:bottom-6" exit={{ opacity: 0, y: reduceMotion ? 0 : 8 }} initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }} role="status" transition={{ duration: reduceMotion ? 0.01 : 0.2 }}><CheckCircle2 aria-hidden="true" className="text-[#bce7c9]" size={20} />{toast}<button aria-label="Tutup notifikasi" className="ml-auto flex h-8 w-8 items-center justify-center" onClick={() => setToast(null)} type="button"><X aria-hidden="true" size={17} /></button></motion.div>}</AnimatePresence></div>;
}
