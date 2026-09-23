"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, CheckCircle2, LoaderCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useFarmers } from "@/components/farmers/farmers-provider";
import { UnsavedChangesDialog } from "@/components/farmers/farmer-form";
import { ContentContainer } from "@/components/layout/content-container";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-field";
import { cn } from "@/lib/utils";
import { fieldFormSchema, type FieldFormValues } from "@/lib/validations";

type LahanFormProps = {
  mode: "create" | "edit";
  farmerId: string;
  farmerName?: string;
  fieldId?: string;
  initialValues?: FieldFormValues;
};

export function LahanForm({ mode, farmerId, farmerName, fieldId, initialValues }: LahanFormProps) {
  const router = useRouter();
  const { createField, fields, records, updateField, error: providerError, isLoading } = useFarmers();
  const storedFarmer = records.find((farmer) => farmer.id === farmerId);
  const storedField = fieldId ? fields.find((field) => field.id === fieldId) : undefined;
  const resolvedFarmerName = storedFarmer?.name ?? farmerName ?? "Petani";
  const defaultValues: FieldFormValues = {
    name: storedField?.name || initialValues?.name || "",
    landmark: storedField?.landmark || initialValues?.landmark || "",
    note: storedField?.note || initialValues?.note || "",
  };
  const methods = useForm<FieldFormValues>({ defaultValues, resolver: zodResolver(fieldFormSchema) });
  const {
    formState: { errors, isDirty },
    handleSubmit,
    register,
    reset,
  } = methods;
  useEffect(() => {
    if (storedField && !isDirty) {
      reset({ name: storedField.name, landmark: storedField.landmark, note: storedField.note });
    }
  }, [isDirty, reset, storedField]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const leaveDestinationRef = useRef(`/petani/${farmerId}`);
  const detailPath = fieldId ? `/petani/${farmerId}/lahan/${fieldId}` : `/petani/${farmerId}`;
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    },
    [],
  );

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
    window.history.pushState({ fieldForm: true }, "", currentUrl);
    const handlePopState = () => {
      window.history.pushState({ fieldForm: true }, "", currentUrl);
      leaveDestinationRef.current = detailPath;
      setLeaveDialogOpen(true);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [detailPath, isDirty]);

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 2800);
  }, []);

  const requestLeave = (destination = detailPath) => {
    if (isDirty) {
      leaveDestinationRef.current = destination;
      setLeaveDialogOpen(true);
      return;
    }
    router.push(destination);
  };

  const submit = async (values: FieldFormValues) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    await new Promise<void>((resolve) => window.setTimeout(resolve, 450));

    if (mode === "create") {
      const result = await createField(farmerId, values);
      if (result.error || !result.data) {
        showToast(result.error ?? "Lahan belum dapat disimpan.");
        setIsSubmitting(false);
        return;
      }
      const newField = result.data;
      reset(values);
      showToast("Lahan berhasil ditambahkan.");
      redirectTimerRef.current = setTimeout(() => router.push(`/petani/${farmerId}/lahan/${newField.id}`), 700);
    } else if (fieldId) {
      const result = await updateField(fieldId, values);
      if (result.error) {
        showToast(result.error);
        setIsSubmitting(false);
        return;
      }
      reset(values);
      showToast("Data lahan berhasil diperbarui.");
      redirectTimerRef.current = setTimeout(() => router.push(`/petani/${farmerId}/lahan/${fieldId}`), 700);
    }
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    void handleSubmit(submit)(event);
  };

  const title = mode === "create" ? "Tambah Lahan" : "Edit Lahan";
  const submitLabel = mode === "create" ? "Simpan Lahan" : "Simpan Perubahan";

  if (isLoading) return <div className="px-4 py-6 text-sm text-tj-muted">Memuat data Lahan…</div>;
  if (providerError) return <div className="px-4 py-6 text-sm text-tj-danger">{providerError}</div>;

  if (!storedFarmer || (mode === "edit" && (!storedField || storedField.farmerId !== farmerId))) {
    return (
      <div className="py-5 sm:py-6 lg:py-8">
        <ContentContainer>
          <p className="text-sm text-tj-muted">Lahan atau petani tidak ditemukan.</p>
        </ContentContainer>
      </div>
    );
  }

  return (
    <div className="py-5 sm:py-6 lg:py-8">
      <ContentContainer>
        <div className="max-w-[720px]">
          <header className="flex items-center gap-3 border-b border-tj-border pb-5 lg:pb-6">
            <button aria-label="Kembali ke Detail Petani" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-tj-muted hover:bg-tj-primary-soft hover:text-tj-primary" onClick={() => requestLeave()} type="button">
              <ArrowLeft aria-hidden="true" size={21} />
            </button>
            <div className="min-w-0">
              <p className="text-xs font-medium text-tj-muted sm:text-sm">Petani · {resolvedFarmerName}</p>
              <h1 className="truncate text-[19px] font-bold leading-6 tracking-[-0.02em] text-tj-text lg:text-[28px] lg:leading-8">{title}</h1>
            </div>
          </header>

          <div className="mt-5 rounded-2xl border border-tj-border bg-tj-primary-soft px-4 py-3 lg:mt-7">
            <p className="text-xs font-medium text-tj-muted">Petani</p>
            <p className="mt-0.5 text-sm font-bold text-tj-primary-strong">{resolvedFarmerName}</p>
          </div>

          <FormProvider {...methods}>
            <form className="mt-5 space-y-5" noValidate onSubmit={handleFormSubmit}>
              <FormInput<FieldFormValues> label="Nama Lahan" name="name" placeholder="Lahan Utara" />
              <FormInput<FieldFormValues> label="Patokan / Deskripsi Lokasi" name="landmark" placeholder="Contoh: sebelah utara rumah, dekat jembatan kecil" />
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-tj-text" htmlFor="field-note">Catatan</label>
                <textarea
                  aria-describedby={errors.note ? "field-note-description" : undefined}
                  aria-invalid={Boolean(errors.note)}
                  className={cn("min-h-28 w-full resize-y rounded-xl border border-tj-border bg-tj-surface px-3.5 py-3 text-sm text-tj-text outline-none placeholder:text-tj-muted focus:border-tj-primary", errors.note && "border-tj-danger")}
                  id="field-note"
                  placeholder="Tambahkan catatan jika diperlukan"
                  {...register("note")}
                />
                {errors.note?.message && <p className="text-xs text-tj-danger" id="field-note-description">{errors.note.message}</p>}
              </div>
              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <Button className="w-full sm:w-auto" disabled={isSubmitting} onClick={() => requestLeave()} variant="secondary">Batal</Button>
                <Button className="w-full sm:w-auto" disabled={isSubmitting} type="submit">
                  {isSubmitting && <LoaderCircle aria-hidden="true" className="animate-spin" size={17} />}
                  {isSubmitting ? "Menyimpan..." : submitLabel}
                </Button>
              </div>
            </form>
          </FormProvider>
        </div>
      </ContentContainer>

      <UnsavedChangesDialog onClose={() => setLeaveDialogOpen(false)} onDiscard={() => router.push(leaveDestinationRef.current)} open={leaveDialogOpen} />
      <AnimatePresence initial={false}>
        {toast && (
          <motion.div animate={{ opacity: 1, y: 0 }} className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] mx-auto flex max-w-md items-center gap-2 rounded-xl bg-tj-text px-4 py-3 text-sm font-semibold text-white shadow-[var(--tj-shadow-md)] lg:bottom-6" exit={{ opacity: 0, y: reduceMotion ? 0 : 8 }} initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }} role="status" transition={{ duration: reduceMotion ? 0.01 : 0.2, ease: "easeOut" }}>
            <CheckCircle2 aria-hidden="true" className="shrink-0 text-[#bce7c9]" size={20} />
            <span className="min-w-0 flex-1">{toast}</span>
            <button aria-label="Tutup notifikasi" className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white" onClick={() => setToast(null)} type="button"><X aria-hidden="true" size={17} /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
