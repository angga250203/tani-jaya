"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, CheckCircle2, LoaderCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { FormProvider, useForm } from "react-hook-form";
import { ContentContainer } from "@/components/layout/content-container";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-field";
import { useFarmers } from "@/components/farmers/farmers-provider";
import { cn } from "@/lib/utils";
import { farmerFormSchema, type FarmerFormValues } from "@/lib/validations";

type FarmerFormMode = "create" | "edit";

type FarmerFormProps = {
  mode: FarmerFormMode;
  farmerId?: string;
  initialValues?: FarmerFormValues;
};

export function ResponsiveConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  confirmVariant = "primary",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  confirmVariant?: "primary" | "danger";
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktop(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    closeRef.current?.focus();
    const bodyOverflow = document.body.style.overflow;
    const rootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("keydown", onEscape);
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = rootOverflow;
    };
  }, [onClose, open]);

  const trapFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") {
      return;
    }
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])");
    if (!focusable?.length) {
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const start = reduceMotion ? { opacity: 0 } : isDesktop ? { opacity: 0, scale: 0.98 } : { opacity: 0, y: 56 };

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div animate={{ opacity: 1 }} className="fixed inset-0 z-50" exit={{ opacity: 0 }} initial={{ opacity: 0 }}>
          <motion.button
            animate={{ opacity: 1 }}
            aria-label={`Tutup ${title}`}
            className="absolute inset-0 cursor-default bg-tj-text/30"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={onClose}
            transition={{ duration: reduceMotion ? 0.01 : 0.18, ease: "easeOut" }}
            type="button"
          />
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            aria-labelledby="responsive-confirm-title"
            aria-modal="true"
            className="absolute inset-x-0 bottom-0 z-10 flex max-h-[min(82dvh,680px)] flex-col rounded-t-[24px] bg-tj-surface px-4 pt-3 shadow-[0_-12px_32px_rgb(14_61_35_/_0.18)] lg:inset-x-auto lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:max-h-[calc(100dvh-48px)] lg:w-full lg:max-w-[560px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl lg:shadow-[var(--tj-shadow-md)]"
            exit={start}
            initial={start}
            onKeyDown={trapFocus}
            ref={dialogRef}
            role="dialog"
            transition={{ duration: reduceMotion ? 0.01 : 0.2, ease: "easeOut" }}
          >
            <div aria-hidden="true" className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-tj-border lg:hidden" />
            <div className="mb-4 flex min-h-11 items-center justify-between gap-4">
              <h2 className="text-lg font-bold tracking-[-0.015em] text-tj-text" id="responsive-confirm-title">{title}</h2>
              <button
                aria-label={`Tutup ${title}`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-tj-muted hover:bg-tj-canvas hover:text-tj-text"
                onClick={onClose}
                ref={closeRef}
                type="button"
              >
                <X aria-hidden="true" size={21} />
              </button>
            </div>
            <p className="pb-5 text-sm leading-6 text-tj-muted">{description}</p>
            <div className="flex shrink-0 gap-2 border-t border-tj-border pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              <Button className="flex-1" onClick={onClose} variant="secondary">{cancelLabel}</Button>
              <Button className="flex-1" onClick={onConfirm} variant={confirmVariant}>{confirmLabel}</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function UnsavedChangesDialog({
  open,
  onClose,
  onDiscard,
}: {
  open: boolean;
  onClose: () => void;
  onDiscard: () => void;
}) {
  return (
    <ResponsiveConfirmDialog
      cancelLabel="Tetap di Halaman"
      confirmLabel="Buang Perubahan"
      description="Perubahan yang belum disimpan akan hilang."
      onClose={onClose}
      onConfirm={onDiscard}
      open={open}
      title="Buang perubahan?"
    />
  );
}

export function FarmerForm({ mode, farmerId, initialValues }: FarmerFormProps) {
  const router = useRouter();
  const { createFarmer, records, updateFarmer } = useFarmers();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const leaveDestinationRef = useRef("/petani");
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion = useReducedMotion();
  const storedFarmer = farmerId ? records.find((farmer) => farmer.id === farmerId) : undefined;
  const defaultValues: FarmerFormValues = {
    name: storedFarmer?.name || initialValues?.name || "",
    whatsapp: storedFarmer?.whatsapp || initialValues?.whatsapp || "",
    landmark: storedFarmer?.landmark || initialValues?.landmark || "",
    note: storedFarmer?.note || initialValues?.note || "",
  };
  const methods = useForm<FarmerFormValues>({
    defaultValues,
    resolver: zodResolver(farmerFormSchema),
  });
  const {
    formState: { errors, isDirty },
    handleSubmit,
    register,
    reset,
  } = methods;

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!isDirty) {
      return;
    }
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const currentUrl = window.location.href;
    window.history.pushState({ farmerForm: true }, "", currentUrl);
    const handlePopState = () => {
      window.history.pushState({ farmerForm: true }, "", currentUrl);
      leaveDestinationRef.current = "/petani";
      setLeaveDialogOpen(true);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isDirty]);

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 2800);
  }, []);

  const requestLeave = (destination = "/petani") => {
    if (isDirty) {
      leaveDestinationRef.current = destination;
      setLeaveDialogOpen(true);
      return;
    }
    router.push(destination);
  };

  const discardChanges = () => {
    setLeaveDialogOpen(false);
    router.push(leaveDestinationRef.current);
  };

  const onSubmit = async (values: FarmerFormValues) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    await new Promise<void>((resolve) => window.setTimeout(resolve, 450));

    if (mode === "create") {
      createFarmer(values);
      reset(values);
      showToast("Petani berhasil ditambahkan.");
      redirectTimerRef.current = setTimeout(() => router.push("/petani"), 700);
    } else if (farmerId) {
      updateFarmer(farmerId, values);
      reset(values);
      showToast("Data petani berhasil diperbarui.");
      redirectTimerRef.current = setTimeout(() => router.push(`/petani/${farmerId}`), 700);
    }
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    void handleSubmit(onSubmit)(event);
  };

  const title = mode === "create" ? "Tambah Petani" : "Edit Petani";
  const submitLabel = mode === "create" ? "Simpan Petani" : "Simpan Perubahan";

  if (mode === "edit" && !storedFarmer && !initialValues) {
    return (
      <div className="py-5 sm:py-6 lg:py-8">
        <ContentContainer>
          <p className="text-sm text-tj-muted">Petani tidak ditemukan.</p>
        </ContentContainer>
      </div>
    );
  }

  return (
    <div className="py-5 sm:py-6 lg:py-8">
      <ContentContainer>
        <div className="max-w-[720px]">
          <header className="flex items-center gap-3 border-b border-tj-border pb-5 lg:pb-6">
            <button
              aria-label="Kembali ke Petani"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-tj-muted hover:bg-tj-primary-soft hover:text-tj-primary"
              onClick={() => requestLeave()}
              type="button"
            >
              <ArrowLeft aria-hidden="true" size={21} />
            </button>
            <div className="min-w-0">
              <p className="text-xs font-medium text-tj-muted sm:text-sm">Petani</p>
              <h1 className="truncate text-[19px] font-bold leading-6 tracking-[-0.02em] text-tj-text lg:text-[28px] lg:leading-8">{title}</h1>
            </div>
          </header>

          <FormProvider {...methods}>
            <form className="mt-5 space-y-5 lg:mt-7" noValidate onSubmit={handleFormSubmit}>
              <FormInput<FarmerFormValues>
                autoComplete="name"
                label="Nama Petani"
                name="name"
                placeholder="Budi Santoso"
              />
              <FormInput<FarmerFormValues>
                autoComplete="tel"
                defaultValue={defaultValues.whatsapp}
                inputMode="tel"
                label="WhatsApp"
                name="whatsapp"
                placeholder="0812 3456 7890"
                type="tel"
              />
              <FormInput<FarmerFormValues>
                label="Patokan / Deskripsi Kebun"
                name="landmark"
                placeholder="Contoh: dekat jembatan kecil, 300 meter dari jalan utama"
              />
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-tj-text" htmlFor="note">Catatan</label>
                <textarea
                  aria-describedby={errors.note ? "note-description" : undefined}
                  aria-invalid={Boolean(errors.note)}
                  className={cn(
                    "min-h-28 w-full resize-y rounded-xl border border-tj-border bg-tj-surface px-3.5 py-3 text-sm text-tj-text outline-none placeholder:text-tj-muted focus:border-tj-primary",
                    errors.note && "border-tj-danger",
                  )}
                  id="note"
                  placeholder="Tambahkan catatan jika diperlukan"
                  {...register("note")}
                />
                <AnimatePresence initial={false}>
                  {errors.note?.message && (
                    <motion.p
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-tj-danger"
                      exit={{ opacity: 0, y: reduceMotion ? 0 : -3 }}
                      initial={{ opacity: 0, y: reduceMotion ? 0 : -3 }}
                      id="note-description"
                      transition={{ duration: reduceMotion ? 0.01 : 0.18 }}
                    >
                      {errors.note.message}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <Button className="w-full sm:w-auto" disabled={isSubmitting} onClick={() => requestLeave()} variant="secondary">
                  Batal
                </Button>
                <Button className="w-full sm:w-auto" disabled={isSubmitting} type="submit">
                  {isSubmitting && <LoaderCircle aria-hidden="true" className="animate-spin" size={17} />}
                  {isSubmitting ? "Menyimpan..." : submitLabel}
                </Button>
              </div>
            </form>
          </FormProvider>
        </div>
      </ContentContainer>

      <UnsavedChangesDialog
        onClose={() => setLeaveDialogOpen(false)}
        onDiscard={discardChanges}
        open={leaveDialogOpen}
      />

      <AnimatePresence initial={false}>
        {toast && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] mx-auto flex max-w-md items-center gap-2 rounded-xl bg-tj-text px-4 py-3 text-sm font-semibold text-white shadow-[var(--tj-shadow-md)] lg:bottom-6"
            exit={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
            role="status"
            transition={{ duration: reduceMotion ? 0.01 : 0.2, ease: "easeOut" }}
          >
            <CheckCircle2 aria-hidden="true" className="shrink-0 text-[#bce7c9]" size={20} />
            <span className="min-w-0 flex-1">{toast}</span>
            <button aria-label="Tutup notifikasi" className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white" onClick={() => setToast(null)} type="button">
              <X aria-hidden="true" size={17} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
