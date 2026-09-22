"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  PencilLine,
  Sprout,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { ContentContainer } from "@/components/layout/content-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import type {
  HarvestScheduleDetail,
  HarvestScheduleStatus,
} from "@/lib/harvest-schedules";
import { cn } from "@/lib/utils";
import { useSchedules } from "./schedules-provider";

type DialogName = "postpone" | "method" | null;
type MethodScope = "single" | "following";

const statusToBadge: Record<HarvestScheduleStatus, HarvestScheduleStatus> = {
  today: "today",
  upcoming: "upcoming",
  warning: "warning",
};

function formatDate(dateISO: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateISO}T00:00:00Z`));
}

function addDays(dateISO: string, days: number) {
  const date = new Date(`${dateISO}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function DetailSection({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof CalendarDays;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4 lg:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Icon aria-hidden="true" className="text-tj-primary" size={19} />
          <h2 className="text-base font-bold text-tj-text">{title}</h2>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function DetailRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 py-3 first:pt-0",
        !last && "border-b border-tj-border",
      )}
    >
      <dt className="text-sm text-tj-muted">{label}</dt>
      <dd className="max-w-[60%] text-right text-sm font-semibold text-tj-text">{value}</dd>
    </div>
  );
}

function SheetDialog({
  children,
  footer,
  onClose,
  title,
}: {
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
  title: string;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
    };
  }, []);

  const trapFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") {
      return;
    }
    const focusable = sheetRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled])',
    );
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

  return (
    <div className="fixed inset-0 z-50">
      <button
        aria-label={`Tutup ${title}`}
        className="absolute inset-0 cursor-default bg-tj-text/30"
        onClick={onClose}
        type="button"
      />
      <div
        aria-labelledby="schedule-dialog-title"
        aria-modal="true"
        className="absolute inset-x-0 bottom-0 z-10 flex max-h-[min(82dvh,680px)] flex-col rounded-t-[24px] bg-tj-surface px-4 pt-3 shadow-[0_-12px_32px_rgb(14_61_35_/_0.18)] lg:inset-x-auto lg:left-1/2 lg:top-1/2 lg:max-h-[calc(100dvh-48px)] lg:w-full lg:max-w-[560px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl lg:shadow-[var(--tj-shadow-md)]"
        onKeyDown={trapFocus}
        ref={sheetRef}
        role="dialog"
      >
        <div aria-hidden="true" className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-tj-border lg:hidden" />
        <div className="mb-4 flex min-h-11 items-center justify-between gap-4">
          <h2 className="text-lg font-bold tracking-[-0.015em] text-tj-text" id="schedule-dialog-title">
            {title}
          </h2>
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
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4 pr-1">
          {children}
        </div>
        <div className="shrink-0 border-t border-tj-border pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          {footer}
        </div>
      </div>
    </div>
  );
}

function ScheduleActionPanel({
  onChangeMethod,
  onPostpone,
  scheduleId,
}: {
  onChangeMethod: () => void;
  onPostpone: () => void;
  scheduleId: string;
}) {
  return (
    <Card className="mt-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:sticky lg:top-8">
      <CardContent className="p-4">
        <p className="mb-3 text-sm font-bold text-tj-text">Aksi Jadwal</p>
        <div className="space-y-2">
          <Link
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-tj-primary px-4 text-sm font-semibold text-white shadow-[var(--tj-shadow-sm)] transition-colors hover:bg-tj-primary-strong focus-visible:outline-none"
            href={`/transaksi/baru?jadwal=${scheduleId}`}
          >
            <Sprout aria-hidden="true" size={18} />
            Catat Panen
          </Link>
          <Button className="w-full" onClick={onPostpone} variant="secondary">
            <CalendarDays aria-hidden="true" size={18} />
            Tunda Jadwal
          </Button>
          <Button className="w-full" onClick={onChangeMethod} variant="secondary">
            <PencilLine aria-hidden="true" size={18} />
            Ubah Metode
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function DetailJadwalPanenPage({
  schedule,
}: {
  schedule: HarvestScheduleDetail;
}) {
  const { postponeSchedule, updateReceivingMethod } = useSchedules();
  const [scheduleDateISO, setScheduleDateISO] = useState(schedule.dateISO);
  const [nextDateISO, setNextDateISO] = useState(schedule.nextDateISO);
  const [method, setMethod] = useState(schedule.method);
  const [dialog, setDialog] = useState<DialogName>(null);
  const [pendingDate, setPendingDate] = useState(schedule.dateISO);
  const [pendingMethod, setPendingMethod] = useState(schedule.method);
  const [methodScope, setMethodScope] = useState<MethodScope>("single");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion = useReducedMotion();
  const closeDialog = useCallback(() => setDialog(null), []);

  useEffect(
    () => () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    },
    [],
  );

  const currentDate = formatDate(scheduleDateISO);
  const nextDate = formatDate(nextDateISO);
  const statusLabel = schedule.wasPostponed ? "Ditunda" : schedule.statusLabel;

  const openPostpone = () => {
    setPendingDate(scheduleDateISO);
    setDialog("postpone");
  };

  const openMethod = () => {
    setPendingMethod(method);
    setMethodScope("single");
    setDialog("method");
  };

  const dismissToast = () => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast(null);
  };

  const showToast = (message: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast(message);
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 2800);
  };

  const savePostpone = () => {
    setScheduleDateISO(pendingDate);
    setNextDateISO(addDays(pendingDate, schedule.intervalDays));
    postponeSchedule(schedule.id, pendingDate);
    setDialog(null);
    showToast("Jadwal panen berhasil diperbarui.");
  };

  const saveMethod = () => {
    setMethod(pendingMethod);
    updateReceivingMethod(schedule.id, pendingMethod, methodScope);
    setDialog(null);
    showToast(
      methodScope === "single"
        ? "Metode penerimaan untuk jadwal ini berhasil diubah."
        : "Metode penerimaan untuk jadwal ini dan jadwal setelahnya berhasil diubah.",
    );
  };

  return (
    <div className="py-5 sm:py-6 lg:py-8">
      <ContentContainer>
        <header className="flex min-h-11 items-center gap-3 border-b border-tj-border pb-5 lg:pb-6">
          <Link
            aria-label="Kembali ke Jadwal Panen"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-tj-muted transition-colors hover:bg-tj-primary-soft hover:text-tj-primary"
            href="/jadwal"
          >
            <ArrowLeft aria-hidden="true" size={21} />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-tj-muted sm:text-sm">Jadwal Panen</p>
            <h1 className="truncate text-[19px] font-bold leading-6 tracking-[-0.02em] text-tj-text lg:text-[28px] lg:leading-8">
              Detail Jadwal
            </h1>
          </div>
        </header>

        <div className="mt-5 lg:mt-7 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6">
          <Card>
            <CardContent className="p-4 lg:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-tj-muted">Komoditas</p>
                  <h2 className="mt-1 text-[24px] font-bold tracking-[-0.025em] text-tj-text">
                    {schedule.commodity}
                  </h2>
                  <p className="mt-1 text-sm text-tj-muted">{currentDate}</p>
                </div>
                <StatusBadge status={statusToBadge[schedule.status]}>
                  {statusLabel}
                </StatusBadge>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 border-t border-tj-border pt-4">
                <div>
                  <p className="text-xs text-tj-muted">Petani</p>
                  <p className="mt-1 truncate text-sm font-semibold text-tj-text">{schedule.farmer}</p>
                </div>
                <div>
                  <p className="text-xs text-tj-muted">Lahan</p>
                  <p className="mt-1 truncate text-sm font-semibold text-tj-text">{schedule.field}</p>
                </div>
                <div>
                  <p className="text-xs text-tj-muted">Metode</p>
                  <p className="mt-1 text-sm font-semibold text-tj-text">{method}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <ScheduleActionPanel
            onChangeMethod={openMethod}
            onPostpone={openPostpone}
            scheduleId={schedule.id}
          />

          <div className="mt-4 space-y-4 lg:col-start-1 lg:mt-6">
            <DetailSection icon={CalendarDays} title="Informasi Panen">
              <dl>
                <DetailRow label="Komoditas" value={schedule.commodity} />
                <DetailRow label="Tanggal Jadwal" value={currentDate} />
                <DetailRow label="Interval Panen" value={`${schedule.intervalDays} hari`} />
                <DetailRow label="Metode Penerimaan" value={method} />
                <DetailRow
                  label="Status"
                  last
                  value={
                    <StatusBadge status={statusToBadge[schedule.status]}>
                      {statusLabel}
                    </StatusBadge>
                  }
                />
              </dl>
            </DetailSection>

            <DetailSection icon={UserRound} title="Petani & Lahan">
              <dl>
                <DetailRow label="Nama Petani" value={schedule.farmer} />
                <DetailRow label="Nama Lahan" value={schedule.field} />
                <DetailRow label="Patokan Kebun" last value={schedule.landmark} />
              </dl>
            </DetailSection>

            <DetailSection icon={PencilLine} title="Catatan">
              <p className="text-sm leading-6 text-tj-muted">{schedule.note}</p>
            </DetailSection>

            <DetailSection icon={Clock3} title="Jadwal Berikutnya">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-tj-primary-soft text-tj-primary">
                  <CalendarDays aria-hidden="true" size={19} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-tj-text">{nextDate}</p>
                  <p className="mt-0.5 text-xs text-tj-muted">
                    Mengikuti interval panen {schedule.intervalDays} hari
                  </p>
                </div>
              </div>
            </DetailSection>
          </div>
        </div>
      </ContentContainer>

      <AnimatePresence initial={false}>
        {toast && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="fixed inset-x-4 bottom-24 z-[60] flex items-start gap-3 rounded-2xl border border-tj-primary bg-tj-surface p-3 shadow-[var(--tj-shadow-md)] lg:inset-x-auto lg:bottom-6 lg:right-6 lg:w-[360px]"
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            role="status"
            transition={{ duration: reduceMotion ? 0.01 : 0.2, ease: "easeOut" }}
          >
            <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-tj-primary" size={20} />
            <p className="flex-1 text-sm font-medium text-tj-text">{toast}</p>
            <button
              aria-label="Tutup notifikasi"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-tj-muted hover:bg-tj-canvas"
              onClick={dismissToast}
              type="button"
            >
              <X aria-hidden="true" size={17} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {dialog === "postpone" && (
      <SheetDialog
          footer={
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => setDialog(null)} variant="secondary">
                Batal
              </Button>
              <Button className="flex-1" onClick={savePostpone}>
                Simpan Perubahan
              </Button>
            </div>
          }
        onClose={closeDialog}
          title="Tunda Jadwal Panen"
        >
          <div className="space-y-4">
            <div className="rounded-xl bg-tj-canvas p-3">
              <p className="text-xs font-medium text-tj-muted">Tanggal saat ini</p>
              <p className="mt-1 text-sm font-bold text-tj-text">{currentDate}</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-tj-text" htmlFor="new-schedule-date">
                Tanggal baru
              </label>
              <Input
                id="new-schedule-date"
                min={scheduleDateISO}
                onChange={(event) => setPendingDate(event.target.value)}
                type="date"
                value={pendingDate}
              />
            </div>
            <p className="rounded-xl bg-tj-primary-soft p-3 text-sm leading-6 text-tj-primary-strong">
              Jadwal berikutnya akan ikut bergeser sesuai interval panen.
            </p>
          </div>
        </SheetDialog>
      )}

      {dialog === "method" && (
      <SheetDialog
          footer={
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => setDialog(null)} variant="secondary">
                Batal
              </Button>
              <Button className="flex-1" onClick={saveMethod}>
                Simpan Perubahan
              </Button>
            </div>
          }
        onClose={closeDialog}
          title="Ubah Metode Penerimaan"
        >
          <div className="space-y-4">
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-tj-text">Berlaku untuk</legend>
              <div className="space-y-2">
                {[
                  { value: "single", label: "Jadwal ini saja" },
                  { value: "following", label: "Jadwal ini dan seterusnya" },
                ].map((option) => (
                  <label
                    className={cn(
                      "flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3",
                      methodScope === option.value
                        ? "border-tj-primary bg-tj-primary-soft"
                        : "border-tj-border bg-tj-surface",
                    )}
                    key={option.value}
                  >
                    <input
                      checked={methodScope === option.value}
                      className="h-4 w-4 accent-[#176B3A]"
                      name="method-scope"
                      onChange={() => setMethodScope(option.value as MethodScope)}
                      type="radio"
                      value={option.value}
                    />
                    <span className="text-sm font-semibold text-tj-text">{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-tj-text">Metode penerimaan</legend>
              <div className="grid grid-cols-2 gap-2">
                {(["Diambil", "Diantar"] as const).map((option) => (
                  <label
                    className={cn(
                      "flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3",
                      pendingMethod === option
                        ? "border-tj-primary bg-tj-primary text-white"
                        : "border-tj-border bg-tj-surface text-tj-text",
                    )}
                    key={option}
                  >
                    <input
                      checked={pendingMethod === option}
                      className="sr-only"
                      name="receiving-method"
                      onChange={() => setPendingMethod(option)}
                      type="radio"
                      value={option}
                    />
                    <Truck aria-hidden="true" size={17} />
                    <span className="text-sm font-semibold">{option}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </SheetDialog>
      )}
    </div>
  );
}
