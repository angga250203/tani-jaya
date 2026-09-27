"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, CheckCircle2, HandCoins, Info, Scale, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { ResponsiveConfirmDialog } from "@/components/farmers/farmer-form";
import { useFarmers } from "@/components/farmers/farmers-provider";
import { useTransactions } from "@/components/transactions/transactions-provider";
import { ContentContainer } from "@/components/layout/content-container";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, SelectField } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { emptyNumericValue, toOptionalInteger } from "@/lib/form-numbers";
import { formatTransactionDate } from "@/lib/transactions";
import { calculateFinalPayment, calculateSelectedNetWeight, calculateSelectedTransactionTotal } from "@/lib/totalans";
import { cn, formatRupiah } from "@/lib/utils";
import { totalanFormSchema, type TotalanFormValues } from "@/lib/validations";
import { useTotalans } from "./totalans-provider";

const emptyTransactionIds: string[] = [];

export function TotalanForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { records } = useFarmers();
  const { transactions } = useTransactions();
  const { finalizeTotalan, kasbonBalances } = useTotalans();
  const requestedFarmerId = searchParams.get("petani") ?? "";
  const reduceMotion = useReducedMotion();
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const methods = useForm<TotalanFormValues>({
    defaultValues: { farmerId: requestedFarmerId, transactionIds: [], kasbonDeduction: emptyNumericValue },
    resolver: zodResolver(totalanFormSchema),
  });
  const { control, formState: { errors }, handleSubmit, register, setValue } = methods;
  const farmerId = useWatch({ control, name: "farmerId" });
  const selectedIds = useWatch({ control, name: "transactionIds" }) ?? emptyTransactionIds;
  const requestedKasbonDeduction = useWatch({ control, name: "kasbonDeduction" }) ?? 0;
  const selectedFarmer = records.find((farmer) => farmer.id === farmerId);
  const eligibleTransactions = useMemo(() => transactions.filter((transaction) => (
    transaction.sellerType === "PETANI_MITRA"
    && transaction.farmerId === farmerId
    && transaction.paymentStatus === "UNPAID"
    && !transaction.totalanId
  )), [farmerId, transactions]);
  const selectedTransactions = useMemo(() => eligibleTransactions.filter((transaction) => selectedIds.includes(transaction.id)), [eligibleTransactions, selectedIds]);
  const totalHarvestValue = calculateSelectedTransactionTotal(selectedTransactions);
  const totalNetWeight = calculateSelectedNetWeight(selectedTransactions);
  const kasbonBalance = kasbonBalances[farmerId] ?? 0;
  const deductionIsValid = requestedKasbonDeduction >= 0 && requestedKasbonDeduction <= kasbonBalance && requestedKasbonDeduction <= totalHarvestValue;
  const finalPayment = calculateFinalPayment(totalHarvestValue, deductionIsValid ? requestedKasbonDeduction : 0);

  useEffect(() => {
    if (requestedFarmerId && records.some((farmer) => farmer.id === requestedFarmerId)) {
      setValue("farmerId", requestedFarmerId);
    }
  }, [records, requestedFarmerId, setValue]);

  useEffect(() => {
    setValue("transactionIds", []);
    setValue("kasbonDeduction", emptyNumericValue);
  }, [farmerId, setValue]);

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
  }, []);

  const toggleTransaction = (transactionId: string) => {
    setFormError(null);
    setValue("transactionIds", selectedIds.includes(transactionId)
      ? selectedIds.filter((id) => id !== transactionId)
      : [...selectedIds, transactionId], { shouldValidate: true });
  };

  const toggleAll = () => {
    setFormError(null);
    setValue("transactionIds", selectedIds.length === eligibleTransactions.length ? [] : eligibleTransactions.map((transaction) => transaction.id), { shouldValidate: true });
  };

  const requestFinalization = (values: TotalanFormValues) => {
    if (!selectedFarmer) {
      setFormError("Pilih petani terlebih dahulu.");
      return;
    }
    if (!deductionIsValid) {
      setFormError("Potongan kasbon tidak boleh melebihi saldo kasbon atau total hasil panen.");
      return;
    }
    if (values.transactionIds.some((id) => !eligibleTransactions.some((transaction) => transaction.id === id))) {
      setFormError("Pilihan transaksi sudah tidak memenuhi syarat untuk totalan.");
      return;
    }
    setFormError(null);
    setConfirmOpen(true);
  };

  const finalize = async () => {
    if (!selectedFarmer || isFinalizing) return;
    setIsFinalizing(true);
    const result = await finalizeTotalan({ farmerId: selectedFarmer.id, transactionIds: selectedIds, requestedKasbonDeduction, totalanDate: new Date().toISOString().slice(0, 10) });
    if (result.error || !result.record) {
      setConfirmOpen(false);
      setFormError(result.error ?? "Totalan tidak dapat diselesaikan.");
      setIsFinalizing(false);
      return;
    }
    setConfirmOpen(false);
    setToast("Totalan berhasil diselesaikan.");
    toastTimerRef.current = setTimeout(() => setToast(null), 2800);
    redirectTimerRef.current = setTimeout(() => router.push(`/totalan/${result.record?.id}`), 700);
    setIsFinalizing(false);
  };

  return (
    <div className="py-5 sm:py-6 lg:py-8">
      <ContentContainer>
        <header className="flex items-center gap-3 border-b border-tj-border pb-5 lg:pb-6">
          <button aria-label="Kembali ke Totalan" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-tj-muted hover:bg-tj-primary-soft hover:text-tj-primary" onClick={() => router.push("/totalan")} type="button"><ArrowLeft aria-hidden="true" size={21} /></button>
          <div className="min-w-0"><p className="text-xs font-medium text-tj-muted sm:text-sm">Totalan</p><h1 className="truncate text-[19px] font-bold leading-6 tracking-[-0.02em] text-tj-text lg:text-[28px] lg:leading-8">Buat Totalan</h1></div>
        </header>

        <form className="mt-5 space-y-5 lg:mt-7 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6 lg:space-y-0" noValidate onSubmit={handleSubmit(requestFinalization)}>
          <div className="space-y-5">
            <Card><CardContent className="space-y-2 p-4 lg:p-5"><label className="text-sm font-semibold text-tj-text" htmlFor="totalan-farmer">Petani</label><SelectField aria-invalid={Boolean(errors.farmerId)} className={cn(errors.farmerId && "border-tj-danger")} id="totalan-farmer" {...register("farmerId")}><option value="">Pilih petani mitra</option>{records.map((farmer) => <option key={farmer.id} value={farmer.id}>{farmer.name}{farmer.status === "inactive" ? " (Nonaktif)" : ""}</option>)}</SelectField>{errors.farmerId?.message && <p className="text-xs text-tj-danger">{errors.farmerId.message}</p>}{selectedFarmer && <p className="pt-1 text-sm text-tj-muted">{eligibleTransactions.length} transaksi belum dibayar dapat dipilih.</p>}</CardContent></Card>

            <section className="space-y-3"><div className="flex items-center justify-between gap-3"><div><h2 className="text-base font-bold text-tj-text">Transaksi Belum Dibayar</h2><p className="mt-0.5 text-sm text-tj-muted">Pilih transaksi untuk {selectedFarmer?.name ?? "dibuatkan totalan"}.</p></div>{eligibleTransactions.length > 0 && <button className="min-h-11 rounded-xl px-3 text-sm font-semibold text-tj-primary hover:bg-tj-primary-soft" onClick={toggleAll} type="button">{selectedIds.length === eligibleTransactions.length ? "Batal Pilih Semua" : "Pilih Semua"}</button>}</div>
              {!farmerId && <Card><CardContent className="p-5 text-center text-sm leading-6 text-tj-muted">Pilih petani untuk melihat transaksi yang menunggu totalan.</CardContent></Card>}
              {farmerId && !eligibleTransactions.length && <Card><CardContent className="p-5 text-center"><p className="text-sm font-semibold text-tj-text">Tidak ada transaksi yang menunggu totalan.</p><p className="mt-1 text-sm leading-6 text-tj-muted">Semua transaksi eligible untuk petani ini sudah dibayar atau ditotal.</p></CardContent></Card>}
              <div className="space-y-3">{eligibleTransactions.map((transaction) => { const checked = selectedIds.includes(transaction.id); return <label className={cn("block cursor-pointer rounded-2xl border bg-tj-surface p-4 transition-colors", checked ? "border-tj-primary bg-tj-primary-soft" : "border-tj-border hover:border-tj-primary")} key={transaction.id}><div className="flex items-start gap-3"><input aria-label={`Pilih ${transaction.id}`} checked={checked} className="mt-0.5 h-5 w-5 shrink-0 accent-[#2f7d4a]" onChange={() => toggleTransaction(transaction.id)} type="checkbox" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-tj-text">{formatTransactionDate(transaction.transactionDate)}</p><p className="mt-1 text-sm text-tj-muted">{transaction.items.map((item) => item.commodity).join(", ")}</p></div><StatusBadge status="pending">Belum Dibayar</StatusBadge></div><div className="mt-3 flex items-center justify-between gap-4 border-t border-tj-border/80 pt-3"><span className="text-sm font-semibold text-tj-text">{transaction.totalNetWeight} kg bersih</span><span className="text-sm font-bold text-tj-primary-strong">{formatRupiah(transaction.totalAmount)}</span></div></div></div></label>; })}</div>
              {errors.transactionIds?.message && <p className="text-xs text-tj-danger">{errors.transactionIds.message}</p>}
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-8">
            <Card><CardContent className="space-y-4 p-4 lg:p-5"><div className="flex items-center gap-2"><HandCoins aria-hidden="true" className="text-tj-primary" size={19} /><h2 className="text-base font-bold text-tj-text">Kasbon</h2></div><div className="rounded-xl border border-tj-border bg-tj-canvas p-3"><p className="text-sm text-tj-muted">Saldo Kasbon Saat Ini</p><p className="mt-1 text-xl font-bold text-tj-text">{formatRupiah(kasbonBalance)}</p></div><div className="space-y-1.5"><label className="text-sm font-semibold text-tj-text" htmlFor="kasbon-deduction">Potongan Kasbon Umum</label><Input aria-invalid={!deductionIsValid} id="kasbon-deduction" inputMode="numeric" min={0} placeholder="0" type="number" {...register("kasbonDeduction", { setValueAs: toOptionalInteger })} />{!deductionIsValid && <p className="text-xs text-tj-danger">Potongan tidak boleh melebihi saldo kasbon atau hasil panen.</p>}</div><div className="flex items-start gap-2 rounded-xl bg-tj-info-soft p-3 text-xs leading-5 text-tj-info"><Info aria-hidden="true" className="mt-0.5 shrink-0" size={16} /><p>Potongan umum bersifat opsional dan tidak diterapkan otomatis. Alokasi ke kasbon tertentu menunggu modul Kasbon.</p></div></CardContent></Card>

            <Card><CardContent className="space-y-4 p-4 lg:p-5"><div className="flex items-center gap-2"><Scale aria-hidden="true" className="text-tj-primary" size={19} /><h2 className="text-base font-bold text-tj-text">Ringkasan Totalan</h2></div><dl className="space-y-3 border-y border-tj-border py-3"><div className="flex justify-between gap-4"><dt className="text-sm text-tj-muted">Jumlah Transaksi</dt><dd className="text-sm font-semibold text-tj-text">{selectedTransactions.length} transaksi</dd></div><div className="flex justify-between gap-4"><dt className="text-sm text-tj-muted">Total Berat</dt><dd className="text-sm font-semibold text-tj-text">{totalNetWeight} kg</dd></div><div className="flex justify-between gap-4"><dt className="text-sm text-tj-muted">Total Hasil Panen</dt><dd className="text-sm font-bold text-tj-text">{formatRupiah(totalHarvestValue)}</dd></div><div className="flex justify-between gap-4"><dt className="text-sm text-tj-muted">Potongan Kasbon</dt><dd className="text-sm font-semibold text-tj-text">{requestedKasbonDeduction ? formatRupiah(deductionIsValid ? requestedKasbonDeduction : 0) : "—"}</dd></div></dl><div><p className="text-sm text-tj-muted">Jumlah Dibayar</p><p className="mt-1 text-xl font-bold tracking-[-0.025em] text-tj-primary-strong">{formatRupiah(finalPayment)}</p></div>{formError && <p className="rounded-xl bg-tj-danger-soft px-3 py-2 text-sm font-medium text-tj-danger">{formError}</p>}<Button className="w-full" disabled={!selectedTransactions.length || !selectedFarmer || !deductionIsValid || isFinalizing} type="submit">{isFinalizing ? "Memproses..." : "Finalisasi Totalan"}</Button><button className={cn(buttonVariants({ variant: "secondary" }), "w-full")} onClick={() => router.push("/totalan")} type="button">Batal</button></CardContent></Card>
          </aside>
        </form>
      </ContentContainer>
      <ResponsiveConfirmDialog cancelLabel="Batal" confirmLabel="Finalisasi" description={`${selectedTransactions.length} transaksi ${selectedFarmer?.name ?? ""} dengan jumlah pembayaran ${formatRupiah(finalPayment)} akan diselesaikan.`} onClose={() => setConfirmOpen(false)} onConfirm={finalize} open={confirmOpen} title="Finalisasi Totalan?" />
      <AnimatePresence initial={false}>{toast && <motion.div animate={{ opacity: 1, y: 0 }} className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] mx-auto flex max-w-md items-center gap-2 rounded-xl bg-tj-text px-4 py-3 text-sm font-semibold text-white shadow-[var(--tj-shadow-md)] lg:bottom-6" exit={{ opacity: 0, y: reduceMotion ? 0 : 8 }} initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }} role="status" transition={{ duration: reduceMotion ? 0.01 : 0.2 }}><CheckCircle2 aria-hidden="true" className="text-[#bce7c9]" size={20} /><span className="flex-1">{toast}</span><button aria-label="Tutup notifikasi" className="flex h-8 w-8 items-center justify-center" onClick={() => setToast(null)} type="button"><X aria-hidden="true" size={17} /></button></motion.div>}</AnimatePresence>
    </div>
  );
}
