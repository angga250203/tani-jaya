"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, CheckCircle2, LoaderCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { UnsavedChangesDialog } from "@/components/farmers/farmer-form";
import { useFarmers } from "@/components/farmers/farmers-provider";
import { ContentContainer } from "@/components/layout/content-container";
import { Button } from "@/components/ui/button";
import { Input, SelectField } from "@/components/ui/input";
import { commodities } from "@/lib/commodities";
import { emptyNumericValue, toOptionalInteger } from "@/lib/form-numbers";
import { cn } from "@/lib/utils";
import { cycleFormSchema, type CycleEditValues, type CycleFormValues } from "@/lib/validations";

type CycleFormProps = {
  mode: "create" | "edit";
  farmerId: string;
  farmerName?: string;
  fieldId: string;
  fieldName?: string;
  cycleId?: string;
  initialValues?: CycleFormValues;
};

export function CycleForm({ mode, farmerId, farmerName, fieldId, fieldName, cycleId, initialValues }: CycleFormProps) {
  const router = useRouter();
  const { createCycle, fields, records, updateCycle, error: providerError, isLoading } = useFarmers();
  const storedFarmer = records.find((farmer) => farmer.id === farmerId);
  const storedField = fields.find((field) => field.id === fieldId);
  const storedCycle = storedField?.cycles.find((cycle) => cycle.id === cycleId);
  const resolvedFarmerName = storedFarmer?.name ?? farmerName ?? "Petani";
  const resolvedFieldName = storedField?.name ?? fieldName ?? "Lahan";
  const defaultValues: CycleFormValues = {
    commodity: storedCycle?.commodity ?? initialValues?.commodity ?? "",
    intervalDays: storedCycle?.intervalDays ?? initialValues?.intervalDays ?? emptyNumericValue,
    defaultReceivingMethod: storedCycle?.defaultReceivingMethod ?? initialValues?.defaultReceivingMethod ?? "DIAMBIL",
    notes: storedCycle?.notes ?? initialValues?.notes ?? "",
  };
  const methods = useForm<CycleFormValues>({
    defaultValues,
    resolver: zodResolver(cycleFormSchema),
  });
  const { clearErrors, formState: { errors, isDirty }, handleSubmit, register, reset, setError } = methods;
  useEffect(() => {
    if (storedCycle && !isDirty) {
      reset({ commodity: storedCycle.commodity, intervalDays: storedCycle.intervalDays, defaultReceivingMethod: storedCycle.defaultReceivingMethod, notes: storedCycle.notes });
    }
  }, [isDirty, reset, storedCycle]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const leaveDestinationRef = useRef(`/petani/${farmerId}/lahan/${fieldId}`);
  const detailPath = cycleId ? `/petani/${farmerId}/lahan/${fieldId}/siklus/${cycleId}` : `/petani/${farmerId}/lahan/${fieldId}`;
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
  }, []);

  useEffect(() => {
    if (!isDirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return;
    const currentUrl = window.location.href;
    window.history.pushState({ cycleForm: true }, "", currentUrl);
    const handlePopState = () => {
      window.history.pushState({ cycleForm: true }, "", currentUrl);
      leaveDestinationRef.current = detailPath;
      setLeaveDialogOpen(true);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [detailPath, isDirty]);

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = setTimeout(() => setToast(null), 2800);
  }, []);

  const requestLeave = (destination = detailPath) => {
    if (isDirty) {
      leaveDestinationRef.current = destination;
      setLeaveDialogOpen(true);
      return;
    }
    router.push(destination);
  };

  const submit = async (values: CycleFormValues) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    await new Promise<void>((resolve) => window.setTimeout(resolve, 450));

    if (mode === "create") {
      const result = await createCycle(fieldId, values);
      if (result.error) {
        setError("commodity", { message: result.error });
        setIsSubmitting(false);
        return;
      }
      if (result.data) {
        reset(values);
        showToast("Siklus berhasil ditambahkan.");
        redirectTimerRef.current = setTimeout(() => router.push(`/petani/${farmerId}/lahan/${fieldId}/siklus/${result.data?.id}`), 700);
      }
      return;
    }

    if (cycleId) {
      const result = await updateCycle(fieldId, cycleId, values as CycleEditValues);
      if (result.error) {
        setError("notes", { message: result.error });
        setIsSubmitting(false);
        return;
      }
      reset(values);
      showToast("Konfigurasi siklus berhasil diperbarui.");
      redirectTimerRef.current = setTimeout(() => router.push(detailPath), 700);
    }
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    void handleSubmit(submit)(event);
  };

  const title = mode === "create" ? "Tambah Siklus" : "Edit Siklus";
  const submitLabel = mode === "create" ? "Simpan Siklus" : "Simpan Perubahan";

  if (isLoading) return <div className="px-4 py-6 text-sm text-tj-muted">Memuat data Siklus…</div>;
  if (providerError) return <div className="px-4 py-6 text-sm text-tj-danger">{providerError}</div>;

  if (!storedFarmer || !storedField || storedField.farmerId !== farmerId || (mode === "edit" && !storedCycle)) {
    return (
      <div className="py-5 sm:py-6 lg:py-8">
        <ContentContainer>
          <p className="text-sm text-tj-muted">Siklus, lahan, atau petani tidak ditemukan.</p>
        </ContentContainer>
      </div>
    );
  }

  return (
    <div className="py-5 sm:py-6 lg:py-8">
      <ContentContainer>
        <div className="max-w-[720px]">
          <header className="flex items-center gap-3 border-b border-tj-border pb-5 lg:pb-6">
            <button aria-label="Kembali ke Detail Lahan" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-tj-muted hover:bg-tj-primary-soft hover:text-tj-primary" onClick={() => requestLeave()} type="button"><ArrowLeft aria-hidden="true" size={21} /></button>
            <div className="min-w-0"><p className="text-xs font-medium text-tj-muted sm:text-sm">Lahan · {fieldName}</p><h1 className="truncate text-[19px] font-bold leading-6 tracking-[-0.02em] text-tj-text lg:text-[28px] lg:leading-8">{title}</h1></div>
          </header>

          <div className="mt-5 grid gap-3 rounded-2xl border border-tj-border bg-tj-primary-soft px-4 py-3 sm:grid-cols-2 lg:mt-7">
            <div><p className="text-xs font-medium text-tj-muted">Petani</p><p className="mt-0.5 text-sm font-bold text-tj-primary-strong">{resolvedFarmerName}</p></div>
            <div><p className="text-xs font-medium text-tj-muted">Lahan</p><p className="mt-0.5 text-sm font-bold text-tj-primary-strong">{resolvedFieldName}</p></div>
          </div>

          <FormProvider {...methods}>
            <form className="mt-5 space-y-5" noValidate onSubmit={handleFormSubmit}>
              {mode === "create" ? (
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-tj-text" htmlFor="commodity">Komoditas</label>
                  <SelectField aria-describedby={errors.commodity ? "commodity-description" : undefined} aria-invalid={Boolean(errors.commodity)} className={cn(errors.commodity && "border-tj-danger")} id="commodity" {...register("commodity", { onChange: () => clearErrors("commodity") })}>
                    <option value="">Pilih komoditas</option>
                    {commodities.map((commodity) => <option key={commodity} value={commodity}>{commodity}</option>)}
                  </SelectField>
                  {errors.commodity?.message && <p className="text-xs text-tj-danger" id="commodity-description">{errors.commodity.message}</p>}
                </div>
              ) : (
                <div className="rounded-xl border border-tj-border bg-tj-canvas px-3.5 py-3"><p className="text-xs text-tj-muted">Komoditas</p><p className="mt-0.5 text-sm font-semibold text-tj-text">{storedCycle?.commodity ?? initialValues?.commodity}</p><p className="mt-1 text-xs leading-5 text-tj-muted">Komoditas tidak diubah agar riwayat panen tetap konsisten.</p></div>
              )}

              <div className="space-y-1.5"><label className="text-sm font-semibold text-tj-text" htmlFor="interval-days">Interval Panen</label><div className="relative"><Input aria-describedby={errors.intervalDays ? "interval-days-description" : "interval-days-hint"} aria-invalid={Boolean(errors.intervalDays)} className={cn("pr-14", errors.intervalDays && "border-tj-danger")} id="interval-days" inputMode="numeric" min={1} placeholder="7" type="number" {...register("intervalDays", { setValueAs: toOptionalInteger })} /><span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-medium text-tj-muted">hari</span></div>{errors.intervalDays?.message ? <p className="text-xs text-tj-danger" id="interval-days-description">{errors.intervalDays.message}</p> : <p className="text-xs text-tj-muted" id="interval-days-hint">Masukkan jumlah hari, minimal 1 hari.</p>}</div>
              <fieldset className="space-y-2" aria-describedby="receiving-method-description">
                <legend className="text-sm font-semibold text-tj-text">Metode Penerimaan Default</legend>
                <div className="grid grid-cols-2 gap-2">
                  {[{ value: "DIAMBIL", label: "Diambil" }, { value: "DIANTAR", label: "Diantar" }].map((method) => (
                    <label className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-tj-border bg-tj-surface px-3 text-sm font-semibold text-tj-text has-[:checked]:border-tj-primary has-[:checked]:bg-tj-primary-soft" key={method.value}>
                      <input className="h-4 w-4 accent-[#2f7d4a]" type="radio" value={method.value} {...register("defaultReceivingMethod")} />{method.label}
                    </label>
                  ))}
                </div>
                <p className="text-xs leading-5 text-tj-muted" id="receiving-method-description">Metode ini akan menjadi default untuk jadwal panen dari siklus ini.</p>
                {errors.defaultReceivingMethod?.message && <p className="text-xs text-tj-danger">{errors.defaultReceivingMethod.message}</p>}
              </fieldset>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-tj-text" htmlFor="cycle-notes">Catatan</label>
                <textarea aria-invalid={Boolean(errors.notes)} className={cn("min-h-28 w-full resize-y rounded-xl border border-tj-border bg-tj-surface px-3.5 py-3 text-sm text-tj-text outline-none placeholder:text-tj-muted focus:border-tj-primary", errors.notes && "border-tj-danger")} id="cycle-notes" placeholder="Tambahkan catatan jika diperlukan" {...register("notes")} />
              </div>
              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end"><Button className="w-full sm:w-auto" disabled={isSubmitting} onClick={() => requestLeave()} variant="secondary">Batal</Button><Button className="w-full sm:w-auto" disabled={isSubmitting} type="submit">{isSubmitting && <LoaderCircle aria-hidden="true" className="animate-spin" size={17} />}{isSubmitting ? "Menyimpan..." : submitLabel}</Button></div>
            </form>
          </FormProvider>
        </div>
      </ContentContainer>

      <UnsavedChangesDialog onClose={() => setLeaveDialogOpen(false)} onDiscard={() => router.push(leaveDestinationRef.current)} open={leaveDialogOpen} />
      <AnimatePresence initial={false}>{toast && <motion.div animate={{ opacity: 1, y: 0 }} className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] mx-auto flex max-w-md items-center gap-2 rounded-xl bg-tj-text px-4 py-3 text-sm font-semibold text-white shadow-[var(--tj-shadow-md)] lg:bottom-6" exit={{ opacity: 0, y: reduceMotion ? 0 : 8 }} initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }} role="status" transition={{ duration: reduceMotion ? 0.01 : 0.2, ease: "easeOut" }}><CheckCircle2 aria-hidden="true" className="shrink-0 text-[#bce7c9]" size={20} /><span className="min-w-0 flex-1">{toast}</span><button aria-label="Tutup notifikasi" className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white" onClick={() => setToast(null)} type="button"><X aria-hidden="true" size={17} /></button></motion.div>}</AnimatePresence>
    </div>
  );
}
