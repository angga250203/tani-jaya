"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, CheckCircle2, PackagePlus, Plus, Trash2, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { FormProvider, useFieldArray, useForm, useFormContext, useWatch, type FieldErrors } from "react-hook-form";
import { UnsavedChangesDialog } from "@/components/farmers/farmer-form";
import { useFarmers } from "@/components/farmers/farmers-provider";
import { useSchedules } from "@/components/schedules/schedules-provider";
import { useTotalans } from "@/components/totalans/totalans-provider";
import { ContentContainer } from "@/components/layout/content-container";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, SelectField } from "@/components/ui/input";
import { commodities } from "@/lib/commodities";
import { emptyNumericValue, toOptionalInteger } from "@/lib/form-numbers";
import { toPurchaseScheduleContext } from "@/lib/harvest-schedules";
import { calculateCommoditySubtotal, calculateGrossWeight, calculateNetWeight, calculateTransactionTotal, calculateTransactionWeight, type TransactionRecord, type WeighingMethod } from "@/lib/transactions";
import { cn, formatRupiah } from "@/lib/utils";
import { transactionFormSchema, type TransactionFormValues } from "@/lib/validations";
import { hasRetainedPurchaseAllocation } from "@/lib/sales";
import { useTransactions } from "./transactions-provider";
import { useSales } from "./sales-provider";

type TransactionFormProps = { mode: "create" | "edit"; transactionId?: string; initialTransaction?: TransactionRecord };
const emptyItem = (): TransactionFormValues["items"][number] => ({ commodity: "", grade: "" as never, weighingMethod: "TOTAL_LANGSUNG", grossWeight: emptyNumericValue, deduction: undefined, pricePerKg: emptyNumericValue, containers: [] });

export function transactionToFormValues(transaction: TransactionRecord): TransactionFormValues {
  return { transactionDate: transaction.transactionDate, sellerType: transaction.sellerType, farmerId: transaction.farmerId, sellerName: transaction.sellerType === "PENJUAL_UMUM" ? transaction.sellerName : "", scheduleId: transaction.scheduleId, fieldId: transaction.fieldId, cycleId: transaction.cycleId, paymentStatus: transaction.paymentStatus, notes: transaction.notes, items: transaction.items.map((item) => ({ commodity: item.commodity, grade: item.grade, weighingMethod: item.weighingMethod, grossWeight: item.grossWeight, deduction: item.deduction, pricePerKg: item.pricePerKg, containers: item.containerWeights.map((weight) => ({ weight })) })) };
}

function NumberInput({ label, name, min = 0 }: { label: string; name: `items.${number}.${"grossWeight" | "deduction" | "pricePerKg"}`; min?: number }) {
  const { register, formState: { errors } } = useFormContext<TransactionFormValues>();
  const [, itemIndex, key] = name.split(".");
  const error = errors.items?.[Number(itemIndex)]?.[key as "grossWeight"]?.message;
  return <div className="space-y-1.5"><label className="text-sm font-semibold text-tj-text" htmlFor={name}>{label}</label><Input aria-invalid={Boolean(error)} className={cn(error && "border-tj-danger")} id={name} inputMode="numeric" min={min} placeholder="0" type="number" {...register(name, { setValueAs: toOptionalInteger })} />{error && <p className="text-xs text-tj-danger">{String(error)}</p>}</div>;
}

function ContainerWeightList({ itemIndex, method }: { itemIndex: number; method: WeighingMethod }) {
  const { control, formState: { errors }, register } = useFormContext<TransactionFormValues>();
  const name = `items.${itemIndex}.containers` as const;
  const { append, fields, remove } = useFieldArray({ control, name });
  const label = method === "PER_KARUNG" ? "Karung" : "Peti";
  const containerErrors = errors.items?.[itemIndex]?.containers;
  return <div className="rounded-xl border border-tj-border bg-tj-canvas p-3"><div className="mb-3 flex items-center justify-between gap-3"><p className="text-sm font-semibold text-tj-text">Berat per {label}</p><Button className="shrink-0" onClick={() => append({ weight: emptyNumericValue })} size="sm" variant="secondary"><Plus aria-hidden="true" size={15} />Tambah {label}</Button></div><div className="space-y-2.5">{fields.map((field, index) => <div className="flex items-end gap-2" key={field.id}><div className="min-w-0 flex-1 space-y-1"><label className="text-xs font-medium text-tj-muted" htmlFor={`items.${itemIndex}.containers.${index}.weight`}>{label} {index + 1}</label><Input aria-invalid={Boolean(containerErrors?.[index]?.weight)} className={cn(containerErrors?.[index]?.weight && "border-tj-danger")} id={`items.${itemIndex}.containers.${index}.weight`} inputMode="numeric" min={1} placeholder="0" type="number" {...register(`items.${itemIndex}.containers.${index}.weight` as const, { setValueAs: toOptionalInteger })} /></div>{fields.length > 1 && <button aria-label={`Hapus ${label} ${index + 1}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-tj-danger hover:bg-tj-danger-soft" onClick={() => remove(index)} type="button"><Trash2 aria-hidden="true" size={18} /></button>}</div>)}</div>{containerErrors?.root?.message && <p className="mt-2 text-xs text-tj-danger">{containerErrors.root.message}</p>}</div>;
}

function CommodityTransactionItem({ index, onRemove }: { index: number; onRemove: () => void }) {
  const { control, formState: { errors }, register, setValue } = useFormContext<TransactionFormValues>();
  const item = useWatch({ control, name: `items.${index}` as const });
  const method = item?.weighingMethod ?? "TOTAL_LANGSUNG";
  const grossWeight = calculateGrossWeight(method, typeof item?.grossWeight === "number" ? item.grossWeight : 0, (item?.containers ?? []).map((container) => typeof container.weight === "number" ? container.weight : 0));
  const deduction = typeof item?.deduction === "number" && Number.isFinite(item.deduction) ? item.deduction : 0;
  const netWeight = calculateNetWeight(grossWeight, deduction);
  const pricePerKg = Number.isFinite(item?.pricePerKg) ? item.pricePerKg : 0;
  const subtotal = calculateCommoditySubtotal(netWeight, pricePerKg);
  const itemError = errors.items?.[index];
  const containerLabel = method === "PER_KARUNG" ? "karung" : "peti";
  const previousMethodRef = useRef(method);

  useEffect(() => {
    if (previousMethodRef.current === method) return;
    previousMethodRef.current = method;
    if (method === "TOTAL_LANGSUNG") {
      setValue(`items.${index}.containers`, []);
      return;
    }
    setValue(`items.${index}.grossWeight`, emptyNumericValue);
    setValue(`items.${index}.containers`, [{ weight: emptyNumericValue }]);
  }, [index, method, setValue]);

  return <Card><CardContent className="p-4 lg:p-5"><div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-tj-primary-soft text-sm font-bold text-tj-primary">{index + 1}</span><h3 className="text-base font-bold text-tj-text">Komoditas</h3></div><button aria-label={`Hapus komoditas ${index + 1}`} className="flex h-11 w-11 items-center justify-center rounded-xl text-tj-danger hover:bg-tj-danger-soft" onClick={onRemove} type="button"><Trash2 aria-hidden="true" size={18} /></button></div><div className="space-y-5"><div className="space-y-1.5"><label className="text-sm font-semibold text-tj-text" htmlFor={`items.${index}.commodity`}>Komoditas</label><SelectField aria-invalid={Boolean(itemError?.commodity)} className={cn(itemError?.commodity && "border-tj-danger")} id={`items.${index}.commodity`} {...register(`items.${index}.commodity` as const)}><option value="">Pilih komoditas</option>{commodities.map((commodity) => <option key={commodity} value={commodity}>{commodity}</option>)}</SelectField>{itemError?.commodity?.message && <p className="text-xs text-tj-danger">{itemError.commodity.message}</p>}</div><div className="space-y-1.5"><label className="text-sm font-semibold text-tj-text" htmlFor={`items.${index}.grade`}>Grade</label><SelectField aria-invalid={Boolean(itemError?.grade)} className={cn(itemError?.grade && "border-tj-danger")} id={`items.${index}.grade`} {...register(`items.${index}.grade` as const)}><option value="">Pilih grade</option><option value="SP">SP · Super</option><option value="TG">TG · Tanggung</option><option value="BR">BR · Barang Jelek</option></SelectField>{itemError?.grade?.message && <p className="text-xs text-tj-danger">{itemError.grade.message}</p>}</div><fieldset className="space-y-2"><legend className="text-sm font-semibold text-tj-text">Metode Timbang</legend><div className="grid gap-2 sm:grid-cols-3">{([{ value: "TOTAL_LANGSUNG", label: "Total Langsung" }, { value: "PER_KARUNG", label: "Per Karung" }, { value: "PER_PETI", label: "Per Peti" }] as const).map((choice) => <label className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-tj-border bg-tj-surface px-3 text-sm font-semibold text-tj-text has-[:checked]:border-tj-primary has-[:checked]:bg-tj-primary-soft" key={choice.value}><input className="h-4 w-4 accent-[#2f7d4a]" type="radio" value={choice.value} {...register(`items.${index}.weighingMethod` as const, { onChange: () => { if (choice.value !== "TOTAL_LANGSUNG" && !item?.containers?.length) setValue(`items.${index}.containers` as const, [{ weight: emptyNumericValue }]); } })} />{choice.label}</label>)}</div></fieldset>{method === "TOTAL_LANGSUNG" ? <NumberInput label="Berat Kotor" name={`items.${index}.grossWeight`} min={1} /> : <ContainerWeightList itemIndex={index} method={method} />}<div className="grid gap-4 sm:grid-cols-2"><NumberInput label="Potongan" name={`items.${index}.deduction`} /><NumberInput label="Harga / kg" name={`items.${index}.pricePerKg`} /></div><div className="grid grid-cols-2 gap-3 rounded-xl border border-tj-border bg-tj-canvas p-3"><div><p className="text-xs text-tj-muted">{method === "TOTAL_LANGSUNG" ? "Berat Kotor" : `Jumlah ${containerLabel}`}</p><p className="mt-0.5 text-sm font-bold text-tj-text">{method === "TOTAL_LANGSUNG" ? `${grossWeight} kg` : `${item?.containers?.length ?? 0} ${containerLabel}`}</p></div><div><p className="text-xs text-tj-muted">Total Berat Kotor</p><p className="mt-0.5 text-sm font-bold text-tj-text">{grossWeight} kg</p></div><div><p className="text-xs text-tj-muted">Berat Bersih</p><p className="mt-0.5 text-sm font-bold text-tj-primary-strong">{netWeight} kg</p></div><div><p className="text-xs text-tj-muted">Subtotal</p><p className="mt-0.5 text-sm font-bold text-tj-primary-strong">{formatRupiah(subtotal)}</p></div></div></div></CardContent></Card>;
}

export function TransactionForm({ mode, transactionId, initialTransaction }: TransactionFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { records, fields } = useFarmers();
  const { schedules } = useSchedules();
  const { createTransaction, transactions, updateTransaction } = useTransactions();
  const { isPurchaseFinanciallyLocked } = useTotalans();
  const { sales } = useSales();
  const storedTransaction = transactionId ? transactions.find((transaction) => transaction.id === transactionId) : undefined;
  const initial = storedTransaction ?? initialTransaction;
  const lockedOriginalItems = useMemo(() => new Set(initial?.items.filter((item) => hasRetainedPurchaseAllocation(sales, item.id)).map((item) => item.id) ?? []), [initial?.items, sales]);
  const defaultValues = initial ? transactionToFormValues(initial) : { transactionDate: "2026-09-16", sellerType: "PETANI_MITRA" as const, farmerId: "", sellerName: "", scheduleId: undefined, fieldId: undefined, cycleId: undefined, paymentStatus: "UNPAID" as const, notes: "", items: [emptyItem()] };
  const methods = useForm<TransactionFormValues>({ defaultValues, resolver: zodResolver(transactionFormSchema) });
  const { control, formState: { errors, isDirty }, handleSubmit, register, setFocus, setValue } = methods;
  const { append, fields: itemFields, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = useWatch({ control, name: "items" }) ?? [];
  const sellerType = useWatch({ control, name: "sellerType" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const leaveDestinationRef = useRef("/transaksi");
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion = useReducedMotion();
  const cycleContext = useMemo(() => { const cycleId = searchParams.get("siklus"); if (!cycleId) return undefined; const field = fields.find((item) => item.cycles.some((cycle) => cycle.id === cycleId)); const cycle = field?.cycles.find((item) => item.id === cycleId); return field && cycle ? { field, cycle } : undefined; }, [fields, searchParams]);
  const scheduleContext = useMemo(() => {
    const scheduleId = searchParams.get("jadwal");
    const schedule = scheduleId ? schedules.find((item) => item.id === scheduleId) : undefined;
    return schedule ? toPurchaseScheduleContext(schedule) : undefined;
  }, [schedules, searchParams]);

  useEffect(() => { if (!cycleContext || mode !== "create") return; setValue("sellerType", "PETANI_MITRA"); setValue("farmerId", cycleContext.field.farmerId); setValue("fieldId", cycleContext.field.id); setValue("cycleId", cycleContext.cycle.id); setValue("items.0.commodity", cycleContext.cycle.commodity); }, [cycleContext, mode, setValue]);
  useEffect(() => {
    if (!scheduleContext || mode !== "create") return;
    setValue("sellerType", "PETANI_MITRA");
    setValue("farmerId", scheduleContext.farmerId);
    setValue("fieldId", scheduleContext.fieldId);
    setValue("scheduleId", scheduleContext.scheduleId);
    setValue("cycleId", scheduleContext.cycleId);
    setValue("items.0.commodity", scheduleContext.commodity);
  }, [mode, scheduleContext, setValue]);
  useEffect(() => { if (sellerType === "PENJUAL_UMUM") setValue("paymentStatus", "PAID"); }, [sellerType, setValue]);
  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current); }, []);
  useEffect(() => { if (!isDirty) return; const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; }; window.addEventListener("beforeunload", beforeUnload); return () => window.removeEventListener("beforeunload", beforeUnload); }, [isDirty]);
  useEffect(() => { if (!isDirty) return; const currentUrl = window.location.href; window.history.pushState({ transactionForm: true }, "", currentUrl); const handlePopState = () => { window.history.pushState({ transactionForm: true }, "", currentUrl); leaveDestinationRef.current = transactionId ? `/transaksi/${transactionId}` : "/transaksi"; setLeaveDialogOpen(true); }; window.addEventListener("popstate", handlePopState); return () => window.removeEventListener("popstate", handlePopState); }, [isDirty, transactionId]);

  const summaries = watchedItems.map((item) => { const grossWeight = calculateGrossWeight(item.weighingMethod, typeof item.grossWeight === "number" ? item.grossWeight : 0, (item.containers ?? []).map((container) => typeof container.weight === "number" ? container.weight : 0)); const deduction = typeof item.deduction === "number" && Number.isFinite(item.deduction) ? item.deduction : 0; const netWeight = calculateNetWeight(grossWeight, deduction); return { netWeight, subtotal: calculateCommoditySubtotal(netWeight, Number.isFinite(item.pricePerKg) ? item.pricePerKg : 0) }; });
  const totalWeight = calculateTransactionWeight(summaries);
  const totalAmount = calculateTransactionTotal(summaries);
  const requestLeave = (destination = transactionId ? `/transaksi/${transactionId}` : "/transaksi") => { if (isDirty) { leaveDestinationRef.current = destination; setLeaveDialogOpen(true); } else router.push(destination); };
  const showToast = useCallback((message: string) => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); setToast(message); toastTimerRef.current = setTimeout(() => setToast(null), 2800); }, []);
  const submit = async (values: TransactionFormValues) => {
    if (isSubmitting) return;
    if (mode === "edit" && transactionId && isPurchaseFinanciallyLocked(transactionId)) {
      setSubmitError("Transaksi sudah masuk Totalan final dan tidak dapat diedit.");
      return;
    }
    if (mode === "edit" && initial) {
      const sellerChanged = initial.sellerType !== values.sellerType || initial.farmerId !== (values.sellerType === "PETANI_MITRA" ? values.farmerId : undefined) || (initial.sellerType === "PENJUAL_UMUM" && initial.sellerName !== values.sellerName?.trim());
      const hasLockedChange = initial.items.some((item, index) => {
        if (!lockedOriginalItems.has(item.id)) return false;
        const nextItem = values.items[index];
        if (!nextItem) return true;
        const nextGrossWeight = calculateGrossWeight(nextItem.weighingMethod, typeof nextItem.grossWeight === "number" ? nextItem.grossWeight : 0, (nextItem.containers ?? []).map((container) => typeof container.weight === "number" ? container.weight : 0));
        return sellerChanged || item.commodity !== nextItem.commodity || item.grade !== nextItem.grade || item.weighingMethod !== nextItem.weighingMethod || item.grossWeight !== nextGrossWeight || item.containerWeights.join(",") !== (nextItem.containers ?? []).map((container) => container.weight).join(",");
      });
      if (hasLockedChange) {
        setSubmitError("Sumber Pembelian ini sudah memiliki riwayat alokasi Penjualan. Komoditas, grade, penjual, metode, dan berat fisiknya tidak dapat diubah.");
        return;
      }
    }
    const farmer = records.find((record) => record.id === values.farmerId);
    const sellerName = values.sellerType === "PETANI_MITRA" ? farmer?.name ?? "" : values.sellerName?.trim() ?? "";
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 250));
      if (mode === "create") {
        const transaction = createTransaction(values, sellerName);
        const isGeneralSeller = transaction.sellerType === "PENJUAL_UMUM";
        showToast(isGeneralSeller ? "Transaksi lunas. Menyiapkan nota." : "Transaksi berhasil disimpan.");
        redirectTimerRef.current = setTimeout(() => router.push(isGeneralSeller ? `/transaksi/${transaction.id}/nota` : `/transaksi/${transaction.id}`), 450);
      } else if (transactionId) {
        updateTransaction(transactionId, values, sellerName);
        showToast("Transaksi berhasil diperbarui.");
        redirectTimerRef.current = setTimeout(() => router.push(`/transaksi/${transactionId}`), 450);
      }
    } catch {
      setIsSubmitting(false);
      setSubmitError("Transaksi belum tersimpan. Periksa kembali data lalu coba lagi.");
    }
  };
  const focusInvalidField = (field: "farmerId" | "sellerName" | `items.${number}.commodity` | `items.${number}.grade` | `items.${number}.grossWeight` | `items.${number}.containers.${number}.weight` | `items.${number}.pricePerKg`) => {
    setFocus(field);
    window.requestAnimationFrame(() => document.getElementById(field)?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" }));
  };
  const handleInvalidSubmit = (formErrors: FieldErrors<TransactionFormValues>) => {
    setSubmitError("Lengkapi data yang ditandai sebelum menyimpan transaksi.");
    if (formErrors.farmerId) { focusInvalidField("farmerId"); return; }
    if (formErrors.sellerName) { focusInvalidField("sellerName"); return; }
    const itemIndex = Array.isArray(formErrors.items) ? formErrors.items.findIndex(Boolean) : -1;
    if (itemIndex < 0) return;
    const itemErrors = formErrors.items?.[itemIndex];
    if (itemErrors?.commodity) focusInvalidField(`items.${itemIndex}.commodity`);
    else if (itemErrors?.grade) focusInvalidField(`items.${itemIndex}.grade`);
    else if (itemErrors?.grossWeight) focusInvalidField(`items.${itemIndex}.grossWeight`);
    else if (itemErrors?.containers?.[0]?.weight) focusInvalidField(`items.${itemIndex}.containers.0.weight`);
    else if (itemErrors?.pricePerKg) focusInvalidField(`items.${itemIndex}.pricePerKg`);
  };
  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => { void handleSubmit(submit, handleInvalidSubmit)(event); };
  const title = mode === "create" ? "Tambah Transaksi" : "Edit Transaksi";

  return <div className="py-5 sm:py-6 lg:py-8"><ContentContainer><header className="flex items-center gap-3 border-b border-tj-border pb-5 lg:pb-6"><button aria-label="Kembali ke Transaksi" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-tj-muted hover:bg-tj-primary-soft hover:text-tj-primary" onClick={() => requestLeave()} type="button"><ArrowLeft aria-hidden="true" size={21} /></button><div className="min-w-0"><p className="text-xs font-medium text-tj-muted sm:text-sm">Transaksi</p><h1 className="truncate text-[19px] font-bold leading-6 tracking-[-0.02em] text-tj-text lg:text-[28px] lg:leading-8">{title}</h1></div></header><FormProvider {...methods}><form className="mt-5 lg:mt-7 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6" noValidate onSubmit={handleFormSubmit}><div className="space-y-5"><Card><CardContent className="space-y-5 p-4 lg:p-5"><h2 className="text-base font-bold text-tj-text">Sumber Transaksi</h2>{cycleContext && <div className="rounded-xl border border-tj-info-soft bg-tj-info-soft px-3 py-3 text-sm text-tj-info">Dari siklus {cycleContext.cycle.commodity} · {cycleContext.field.name}</div>}{scheduleContext && <div className="rounded-xl border border-tj-info-soft bg-tj-info-soft px-3 py-3 text-sm text-tj-info">Dari jadwal {scheduleContext.commodity} · {scheduleContext.farmerName}</div>}<div className="space-y-2"><p className="text-sm font-semibold text-tj-text">Jenis Penjual</p><div className="grid grid-cols-2 gap-2">{([{ value: "PETANI_MITRA", label: "Petani Mitra" }, { value: "PENJUAL_UMUM", label: "Penjual Umum" }] as const).map((choice) => <label className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-tj-border bg-tj-surface px-3 text-sm font-semibold text-tj-text has-[:checked]:border-tj-primary has-[:checked]:bg-tj-primary-soft" key={choice.value}><input className="h-4 w-4 accent-[#2f7d4a]" type="radio" value={choice.value} {...register("sellerType")} />{choice.label}</label>)}</div></div>{sellerType === "PETANI_MITRA" ? <div className="space-y-1.5"><label className="text-sm font-semibold text-tj-text" htmlFor="farmerId">Pilih Petani</label><SelectField aria-invalid={Boolean(errors.farmerId)} className={cn(errors.farmerId && "border-tj-danger")} id="farmerId" {...register("farmerId")}><option value="">Pilih petani mitra</option>{records.filter((farmer) => farmer.status === "active").map((farmer) => <option key={farmer.id} value={farmer.id}>{farmer.name}</option>)}</SelectField>{errors.farmerId?.message && <p className="text-xs text-tj-danger">{errors.farmerId.message}</p>}</div> : <div className="space-y-1.5"><label className="text-sm font-semibold text-tj-text" htmlFor="sellerName">Nama Penjual</label><Input aria-invalid={Boolean(errors.sellerName)} className={cn(errors.sellerName && "border-tj-danger")} id="sellerName" placeholder="Contoh: Pak Herman" {...register("sellerName")} />{errors.sellerName?.message && <p className="text-xs text-tj-danger">{errors.sellerName.message}</p>}</div>}<div className="space-y-1.5"><label className="text-sm font-semibold text-tj-text" htmlFor="transactionDate">Tanggal Transaksi</label><Input id="transactionDate" type="date" {...register("transactionDate")} /></div></CardContent></Card><div className="flex items-center justify-between gap-3"><h2 className="text-base font-bold text-tj-text">Komoditas</h2><Button onClick={() => append(emptyItem())} size="sm" variant="secondary"><PackagePlus aria-hidden="true" size={16} />Tambah Komoditas</Button></div><AnimatePresence initial={false}>{itemFields.map((field, index) => <motion.div animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }} initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }} key={field.id} transition={{ duration: reduceMotion ? 0.01 : 0.18 }}><CommodityTransactionItem index={index} onRemove={() => itemFields.length > 1 && remove(index)} /></motion.div>)}</AnimatePresence><Card><CardContent className="p-4"><label className="text-sm font-semibold text-tj-text" htmlFor="transaction-notes">Catatan Transaksi</label><textarea className="mt-1.5 min-h-24 w-full resize-y rounded-xl border border-tj-border bg-tj-surface px-3.5 py-3 text-sm text-tj-text outline-none placeholder:text-tj-muted focus:border-tj-primary" id="transaction-notes" placeholder="Tambahkan catatan jika diperlukan" {...register("notes")} /></CardContent></Card></div><aside className="mt-5 space-y-3 lg:sticky lg:top-8 lg:mt-0 lg:self-start"><Card><CardContent className="space-y-4 p-4 lg:p-5"><h2 className="text-base font-bold text-tj-text">Ringkasan Transaksi</h2><div className="space-y-3 border-y border-tj-border py-3"><div className="flex justify-between gap-4"><span className="text-sm text-tj-muted">Total Berat Bersih</span><strong className="text-sm text-tj-text">{totalWeight} kg</strong></div><div className="flex justify-between gap-4"><span className="text-sm text-tj-muted">Total Transaksi</span><strong className="text-base text-tj-primary-strong">{formatRupiah(totalAmount)}</strong></div></div>{sellerType === "PETANI_MITRA" ? <fieldset className="space-y-2"><legend className="text-sm font-semibold text-tj-text">Status Pembayaran</legend><label className="flex min-h-11 items-center gap-2 rounded-xl border border-tj-border px-3 text-sm font-semibold has-[:checked]:border-tj-primary has-[:checked]:bg-tj-primary-soft"><input className="h-4 w-4 accent-[#2f7d4a]" type="radio" value="PAID" {...register("paymentStatus")} />Bayar Langsung · Lunas</label><label className="flex min-h-11 items-center gap-2 rounded-xl border border-tj-border px-3 text-sm font-semibold has-[:checked]:border-tj-primary has-[:checked]:bg-tj-primary-soft"><input className="h-4 w-4 accent-[#2f7d4a]" type="radio" value="UNPAID" {...register("paymentStatus")} />Masuk Totalan · Belum Dibayar</label>{errors.paymentStatus?.message && <p className="text-xs text-tj-danger">{errors.paymentStatus.message}</p>}</fieldset> : <div className="rounded-xl border border-tj-primary-soft bg-tj-primary-soft px-3 py-3 text-sm"><p className="font-semibold text-tj-primary-strong">Pembayaran: Langsung</p><p className="mt-1 text-tj-muted">Status transaksi penjual umum selalu Lunas.</p></div>}{submitError && <div className="rounded-xl border border-tj-danger bg-tj-danger-soft px-3 py-3 text-sm font-medium text-tj-danger" id="transaction-submit-error" role="alert">{submitError}</div>}<div className="space-y-2"><Button aria-describedby={submitError ? "transaction-submit-error" : undefined} className="w-full" disabled={isSubmitting} type="submit">{isSubmitting ? "Menyimpan..." : "Simpan Transaksi"}</Button><button className={cn(buttonVariants({ variant: "secondary" }), "w-full")} onClick={() => requestLeave()} type="button">Batal</button></div></CardContent></Card></aside></form></FormProvider></ContentContainer><UnsavedChangesDialog onClose={() => setLeaveDialogOpen(false)} onDiscard={() => router.push(leaveDestinationRef.current)} open={leaveDialogOpen} /><AnimatePresence initial={false}>{toast && <motion.div animate={{ opacity: 1, y: 0 }} className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] mx-auto flex max-w-md items-center gap-2 rounded-xl bg-tj-text px-4 py-3 text-sm font-semibold text-white shadow-[var(--tj-shadow-md)] lg:bottom-6" exit={{ opacity: 0, y: reduceMotion ? 0 : 8 }} initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }} role="status" transition={{ duration: reduceMotion ? 0.01 : 0.2 }}><CheckCircle2 aria-hidden="true" className="text-[#bce7c9]" size={20} /><span className="flex-1">{toast}</span><button aria-label="Tutup notifikasi" className="flex h-8 w-8 items-center justify-center" onClick={() => setToast(null)} type="button"><X aria-hidden="true" size={17} /></button></motion.div>}</AnimatePresence></div>;
}
