"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  LandPlot,
  MapPin,
  PencilLine,
  Phone,
  ReceiptText,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { ContentContainer } from "@/components/layout/content-container";
import { useTransactions } from "@/components/transactions/transactions-provider";
import { useFarmers } from "@/components/farmers/farmers-provider";
import { useKasbons } from "@/components/kasbons/kasbons-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { FarmerDetail, FarmerStatus } from "@/lib/farmers";
import { cn, formatRupiah } from "@/lib/utils";

function FarmerStatusBadge({ status }: { status: FarmerStatus }) {
  return <StatusBadge status={status === "active" ? "today" : "neutral"}>{status === "active" ? "Aktif" : "Nonaktif"}</StatusBadge>;
}

function DetailSection({
  children,
  icon: Icon,
  title,
  action,
}: {
  children: ReactNode;
  icon: typeof CalendarDays;
  title: string;
  action?: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4 lg:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Icon aria-hidden="true" className="text-tj-primary" size={19} />
            <h2 className="text-base font-bold text-tj-text">{title}</h2>
          </div>
          {action}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function DetailRow({ label, value, last = false }: { label: string; value: ReactNode; last?: boolean }) {
  return (
    <div className={cn("flex items-start justify-between gap-4 py-3 first:pt-0", !last && "border-b border-tj-border")}>
      <dt className="text-sm text-tj-muted">{label}</dt>
      <dd className="max-w-[62%] text-right text-sm font-semibold text-tj-text">{value}</dd>
    </div>
  );
}

function ResponsiveStatusDialog({
  open,
  onClose,
  onConfirm,
  status,
  farmerName,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  status: FarmerStatus;
  farmerName: string;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();
  const [isDesktop, setIsDesktop] = useState(false);
  const nextStatus = status === "active" ? "inactive" : "active";
  const isDeactivating = nextStatus === "inactive";
  const title = isDeactivating ? "Nonaktifkan Petani?" : "Aktifkan Petani?";

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
    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
    };
  }, [onClose, open]);

  const trapFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") {
      return;
    }
    const focusable = sheetRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])");
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

  const motionStart = reduceMotion
    ? { opacity: 0 }
    : isDesktop
      ? { opacity: 0, scale: 0.98 }
      : { opacity: 0, y: 56 };

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div className="fixed inset-0 z-50" exit={{ opacity: 0 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <motion.button
            aria-label={`Tutup ${title}`}
            className="absolute inset-0 cursor-default bg-tj-text/30"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={onClose}
            transition={{ duration: reduceMotion ? 0.01 : 0.18, ease: "easeOut" }}
            type="button"
          />
          <motion.div
            aria-labelledby="farmer-status-dialog-title"
            aria-modal="true"
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="absolute inset-x-0 bottom-0 z-10 flex max-h-[min(82dvh,680px)] flex-col rounded-t-[24px] bg-tj-surface px-4 pt-3 shadow-[0_-12px_32px_rgb(14_61_35_/_0.18)] lg:inset-x-auto lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:max-h-[calc(100dvh-48px)] lg:w-full lg:max-w-[560px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl lg:shadow-[var(--tj-shadow-md)]"
            exit={motionStart}
            initial={motionStart}
            onKeyDown={trapFocus}
            ref={sheetRef}
            role="dialog"
            transition={{ duration: reduceMotion ? 0.01 : 0.2, ease: "easeOut" }}
          >
            <div aria-hidden="true" className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-tj-border lg:hidden" />
            <div className="mb-4 flex min-h-11 items-center justify-between gap-4">
              <h2 className="text-lg font-bold tracking-[-0.015em] text-tj-text" id="farmer-status-dialog-title">{title}</h2>
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
            <p className="pb-5 text-sm leading-6 text-tj-muted">
              {isDeactivating
                ? `${farmerName} tidak akan muncul sebagai petani aktif, tetapi seluruh riwayat transaksi, kasbon, lahan, dan data sebelumnya tetap tersimpan.`
                : `${farmerName} akan kembali tercatat sebagai petani aktif.`}
            </p>
            <div className="flex shrink-0 gap-2 border-t border-tj-border pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              <Button className="flex-1" onClick={onClose} variant="secondary">Batal</Button>
              <Button className="flex-1" onClick={onConfirm} variant="primary">
                {isDeactivating ? "Nonaktifkan" : "Aktifkan"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="min-h-[86px] p-3.5">
        <p className="text-xs font-medium text-tj-muted">{label}</p>
        <p className="mt-2 text-base font-bold tracking-[-0.02em] text-tj-text">{value}</p>
      </CardContent>
    </Card>
  );
}

export function DetailPetaniPage({ farmer: initialFarmer }: { farmer: FarmerDetail }) {
  const { records, fields, updateFarmer } = useFarmers();
  const { transactions } = useTransactions();
  const { getBalance } = useKasbons();
  const farmer = useMemo(() => ({
    ...initialFarmer,
    ...records.find((record) => record.id === initialFarmer.id),
  }), [initialFarmer, records]);
  const status = farmer.status;
  const kasbonBalance = getBalance(farmer.id);
  const farmerFields = fields.filter((field) => field.farmerId === farmer.id);
  const activeCycleCount = farmerFields.flatMap((field) => field.cycles).filter((cycle) => cycle.status === "active").length;
  const eligibleTotalanCount = transactions.filter((transaction) => (
    transaction.sellerType === "PETANI_MITRA"
    && transaction.farmerId === farmer.id
    && transaction.paymentStatus === "UNPAID"
    && !transaction.totalanId
  )).length;
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion = useReducedMotion();
  const closeStatusDialog = useCallback(() => setStatusDialogOpen(false), [setStatusDialogOpen]);

  useEffect(
    () => () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    },
    [],
  );

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

  const confirmStatusChange = () => {
    const nextStatus: FarmerStatus = status === "active" ? "inactive" : "active";
    updateFarmer(farmer.id, { status: nextStatus });
    closeStatusDialog();
    showToast(nextStatus === "active" ? `${farmer.name} kembali aktif.` : `${farmer.name} dinonaktifkan.`);
  };

  return (
    <div className="py-5 sm:py-6 lg:py-8">
      <ContentContainer>
        <header className="flex items-center gap-3 border-b border-tj-border pb-5 lg:pb-6">
          <Link
            aria-label="Kembali ke Petani"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-tj-muted hover:bg-tj-primary-soft hover:text-tj-primary"
            href="/petani"
          >
            <ArrowLeft aria-hidden="true" size={21} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-tj-muted sm:text-sm">Petani</p>
            <h1 className="truncate text-[19px] font-bold leading-6 tracking-[-0.02em] text-tj-text lg:text-[28px] lg:leading-8">Detail Petani</h1>
          </div>
          <Link
            aria-label={`Edit ${farmer.name}`}
            className={cn(buttonVariants({ variant: "secondary", size: "icon" }), "shrink-0")}
            href={`/petani/${farmer.id}/edit`}
          >
            <PencilLine aria-hidden="true" size={18} />
          </Link>
        </header>

        <div className="mt-5 space-y-5 lg:mt-7 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6 lg:space-y-0">
          <Card className="lg:col-span-2">
            <CardContent className="flex items-start gap-3 p-4 lg:p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tj-primary-soft text-sm font-bold text-tj-primary-strong">{farmer.initials}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold tracking-[-0.015em] text-tj-text">{farmer.name}</h2>
                    <a className="mt-1 inline-flex min-h-6 items-center gap-1.5 text-sm text-tj-muted hover:text-tj-primary" href={`tel:${farmer.whatsapp.replaceAll(" ", "")}`}>
                      <Phone aria-hidden="true" size={15} />
                      {farmer.whatsapp}
                    </a>
                  </div>
                  <FarmerStatusBadge status={status} />
                </div>
                <p className="mt-2 flex items-start gap-1.5 text-sm leading-5 text-tj-muted">
                  <MapPin aria-hidden="true" className="mt-0.5 shrink-0" size={15} />
                  {farmer.gardenDescription}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 lg:col-span-2 lg:max-w-2xl">
            <SummaryCard label="Total lahan" value={`${farmerFields.length} Lahan`} />
            <SummaryCard label="Siklus aktif" value={`${activeCycleCount} Siklus`} />
            <SummaryCard label="Kasbon berjalan" value={formatRupiah(kasbonBalance)} />
          </div>

          <div className="space-y-5 lg:col-start-1 lg:row-start-3">
            <DetailSection icon={UserRound} title="Informasi Petani">
              <dl>
                <DetailRow label="Nama" value={farmer.name} />
                <DetailRow label="WhatsApp" value={<a className="text-tj-primary hover:underline" href={`tel:${farmer.whatsapp.replaceAll(" ", "")}`}>{farmer.whatsapp}</a>} />
                <DetailRow label="Status" value={<FarmerStatusBadge status={status} />} />
                <DetailRow label="Patokan kebun" value={farmer.gardenDescription} />
                <DetailRow label="Catatan" last value={farmer.note} />
              </dl>
            </DetailSection>

            <DetailSection
              action={
                <Link
                  className="inline-flex min-h-9 items-center rounded-lg px-2.5 text-xs font-semibold text-tj-primary hover:bg-tj-primary-soft"
                  href={`/petani/${farmer.id}/lahan/baru`}
                >
                  Tambah Lahan
                </Link>
              }
              icon={LandPlot}
              title="Lahan"
            >
              {farmerFields.length ? (
                <div className="space-y-2.5">
                  {farmerFields.map((field) => {
                    const activeCycle = field.cycles.find((cycle) => cycle.status === "active");
                    return (
                    <Link
                      aria-label={`Buka lahan ${field.name}`}
                      className="block rounded-xl border border-tj-border p-3 transition-colors hover:border-tj-primary hover:bg-tj-canvas focus-visible:outline-none"
                      href={`/petani/${farmer.id}/lahan/${field.id}`}
                      key={field.id}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-tj-text">{field.name}</p>
                          <p className="mt-0.5 text-xs text-tj-muted">{field.landmark}</p>
                        </div>
                        <ChevronRight aria-hidden="true" className="mt-0.5 shrink-0 text-tj-primary" size={18} />
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-tj-border pt-3 text-xs">
                        <div>
                          <p className="text-tj-muted">Siklus aktif</p>
                          <p className="mt-0.5 font-semibold text-tj-text">{activeCycle ? `${activeCycle.commodity} · ${activeCycle.intervalDays} hari` : "Belum ada siklus aktif"}</p>
                        </div>
                        <div>
                          <p className="text-tj-muted">Panen berikutnya</p>
                          <p className="mt-0.5 font-semibold text-tj-text">{activeCycle?.nextHarvest ?? "—"}</p>
                        </div>
                      </div>
                    </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm leading-6 text-tj-muted">Belum ada lahan yang tercatat untuk petani ini.</p>
              )}
            </DetailSection>
          </div>

          <aside className="space-y-5 lg:col-start-2 lg:row-span-2 lg:row-start-3 lg:sticky lg:top-8">
            <DetailSection icon={WalletCards} title="Kasbon">
              <p className="text-sm text-tj-muted">Kasbon berjalan</p>
              <p className="mt-1 text-2xl font-bold tracking-[-0.025em] text-tj-text">{formatRupiah(kasbonBalance)}</p>
              <Link className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-tj-primary hover:underline" href={`/kasbon/${farmer.id}`}>
                Lihat Kasbon
                <ChevronRight aria-hidden="true" size={17} />
              </Link>
              {status === "active" && <Link className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-tj-primary hover:underline" href={`/kasbon/${farmer.id}/baru`}>Tambah Kasbon <ChevronRight aria-hidden="true" size={17} /></Link>}
            </DetailSection>

            <DetailSection
              action={eligibleTotalanCount ? <Link className="inline-flex min-h-9 items-center rounded-lg px-2.5 text-xs font-semibold text-tj-primary hover:bg-tj-primary-soft" href={`/totalan/baru?petani=${farmer.id}`}>Buat Totalan</Link> : undefined}
              icon={ReceiptText}
              title="Totalan"
            >
              <p className="text-sm text-tj-muted">{eligibleTotalanCount ? `${eligibleTotalanCount} transaksi menunggu totalan.` : "Tidak ada transaksi yang menunggu totalan."}</p>
              <Link className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-tj-primary hover:underline" href="/totalan">
                Lihat Riwayat Totalan
                <ChevronRight aria-hidden="true" size={17} />
              </Link>
            </DetailSection>

            <DetailSection icon={UserRound} title="Aksi Petani">
              <div className="space-y-2">
                <Link className={cn(buttonVariants({ variant: "secondary" }), "w-full")} href={`/petani/${farmer.id}/edit`}>
                  <PencilLine aria-hidden="true" size={18} />
                  Edit Petani
                </Link>
                <Button className="w-full" onClick={() => setStatusDialogOpen(true)} variant="secondary">
                  {status === "active" ? "Nonaktifkan Petani" : "Aktifkan Petani"}
                </Button>
              </div>
            </DetailSection>
          </aside>

          <div className="lg:col-start-1 lg:row-start-4">
            <DetailSection
              action={<Link className="inline-flex min-h-9 items-center rounded-lg px-2.5 text-xs font-semibold text-tj-primary hover:bg-tj-primary-soft" href={`/riwayat?petani=${farmer.id}`}>Lihat Semua</Link>}
              icon={ReceiptText}
              title="Transaksi Terbaru"
            >
              {farmer.recentTransactions.length ? (
                <div className="divide-y divide-tj-border">
                  {farmer.recentTransactions.map((transaction) => (
                    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0" key={`${transaction.date}-${transaction.commodity}`}>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-tj-text">{transaction.commodity}</p>
                        <p className="mt-0.5 text-xs text-tj-muted">{transaction.date}</p>
                      </div>
                      <p className="shrink-0 text-sm font-bold text-tj-text">{transaction.weightKg} kg</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-6 text-tj-muted">Belum ada transaksi tercatat bulan ini.</p>
              )}
              <p className="mt-4 border-t border-tj-border pt-3 text-xs font-medium text-tj-muted">{farmer.monthlyTransactionCount} transaksi bulan ini</p>
            </DetailSection>
          </div>
        </div>
      </ContentContainer>

      <ResponsiveStatusDialog
        farmerName={farmer.name}
        onClose={closeStatusDialog}
        onConfirm={confirmStatusChange}
        open={statusDialogOpen}
        status={status}
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
