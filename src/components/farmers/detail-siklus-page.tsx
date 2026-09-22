"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, CalendarDays, CheckCircle2, CircleStop, Clock3, MapPin, PencilLine, Sprout, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ResponsiveConfirmDialog } from "@/components/farmers/farmer-form";
import { useFarmers } from "@/components/farmers/farmers-provider";
import { ContentContainer } from "@/components/layout/content-container";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { HarvestCycle } from "@/lib/fields";
import { cn } from "@/lib/utils";

function Section({ title, icon: Icon, children }: { title: string; icon: typeof CalendarDays; children: ReactNode }) {
  return <Card><CardContent className="p-4 lg:p-5"><div className="mb-4 flex items-center gap-2"><Icon aria-hidden="true" className="text-tj-primary" size={19} /><h2 className="text-base font-bold text-tj-text">{title}</h2></div>{children}</CardContent></Card>;
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"><dt className="shrink-0 text-sm text-tj-muted">{label}</dt><dd className="max-w-[64%] text-right text-sm font-semibold text-tj-text">{value}</dd></div>;
}

function methodLabel(method: HarvestCycle["defaultReceivingMethod"]) {
  return method === "DIAMBIL" ? "Diambil" : "Diantar";
}

export function DetailSiklusPage({ farmerId, fieldId, cycleId, initialCycle }: { farmerId: string; fieldId: string; cycleId: string; initialCycle?: HarvestCycle }) {
  const { endCycle: endCycleInStore, fields, records } = useFarmers();
  const field = fields.find((item) => item.id === fieldId);
  const farmer = records.find((item) => item.id === farmerId);
  const cycle = field?.cycles.find((item) => item.id === cycleId) ?? initialCycle;
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = setTimeout(() => setToast(null), 2800);
  }, []);

  const history = useMemo(() => cycle?.harvestHistory ?? [], [cycle]);
  if (!field || !farmer || field.farmerId !== farmerId || !cycle) {
    return <div className="py-5"><ContentContainer><Card className="max-w-xl"><CardContent className="p-5"><h1 className="text-lg font-bold text-tj-text">Siklus tidak ditemukan</h1><Link className="mt-3 inline-flex text-sm font-semibold text-tj-primary hover:underline" href={`/petani/${farmerId}/lahan/${fieldId}`}>Kembali ke Detail Lahan</Link></CardContent></Card></ContentContainer></div>;
  }

  const isActive = cycle.status === "active";
  const hasFirstHarvest = Boolean(cycle.firstHarvestAt);
  const basePath = `/petani/${farmerId}/lahan/${fieldId}/siklus/${cycle.id}`;
  const firstHarvestAction = `/transaksi/baru?siklus=${cycle.id}&panenPertama=true`;
  const confirmEndCycle = () => {
    endCycleInStore(fieldId, cycle.id);
    setEndDialogOpen(false);
    showToast("Siklus berhasil diakhiri.");
  };

  return (
    <div className="py-5 sm:py-6 lg:py-8">
      <ContentContainer>
        <header className="flex items-center gap-3 border-b border-tj-border pb-5 lg:pb-6"><Link aria-label="Kembali ke Detail Lahan" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-tj-muted hover:bg-tj-primary-soft hover:text-tj-primary" href={`/petani/${farmerId}/lahan/${fieldId}`}><ArrowLeft aria-hidden="true" size={21} /></Link><div className="min-w-0 flex-1"><p className="text-xs font-medium text-tj-muted sm:text-sm">Lahan · {field.name}</p><h1 className="truncate text-[19px] font-bold leading-6 tracking-[-0.02em] text-tj-text lg:text-[28px] lg:leading-8">Detail Siklus</h1></div>{isActive && <Link aria-label={`Edit siklus ${cycle.commodity}`} className={cn(buttonVariants({ variant: "secondary", size: "icon" }), "shrink-0")} href={`${basePath}/edit`}><PencilLine aria-hidden="true" size={18} /></Link>}</header>

        <div className="mt-5 space-y-5 lg:mt-7 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6 lg:space-y-0">
          <Card className="lg:col-span-2"><CardContent className="p-4 lg:p-5"><div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tj-primary-soft text-tj-primary"><Sprout aria-hidden="true" size={20} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold text-tj-text">{cycle.commodity}</h2><StatusBadge status={isActive ? "today" : "neutral"}>{isActive ? "Aktif" : "Selesai"}</StatusBadge></div><div className="mt-2 grid gap-1.5 text-sm text-tj-muted sm:grid-cols-2"><p className="flex items-center gap-1.5"><UserRound aria-hidden="true" size={15} />{farmer.name}</p><p className="flex items-center gap-1.5"><MapPin aria-hidden="true" size={15} />{field.name}</p></div></div></div></CardContent></Card>

          <div className="space-y-5 lg:col-start-1 lg:row-start-2"><Section icon={Sprout} title="Informasi Siklus"><dl className="divide-y divide-tj-border"><DetailRow label="Komoditas" value={cycle.commodity} /><DetailRow label="Interval Panen" value={`${cycle.intervalDays} hari`} /><DetailRow label="Metode Default" value={methodLabel(cycle.defaultReceivingMethod)} /><DetailRow label="Status" value={<StatusBadge status={isActive ? "today" : "neutral"}>{isActive ? "Aktif" : "Selesai"}</StatusBadge>} /><DetailRow label="Tanggal dibuat" value={cycle.createdAt} />{cycle.notes && <DetailRow label="Catatan" value={cycle.notes} />}</dl></Section>
            <Section icon={CalendarDays} title="Riwayat Panen"><dl className="divide-y divide-tj-border"><DetailRow label="Panen Pertama" value={cycle.firstHarvestAt ?? "Belum ada"} />{hasFirstHarvest && <DetailRow label="Panen Terakhir" value={cycle.lastHarvestAt ?? "Belum ada"} />}{isActive && <DetailRow label="Jadwal Berikutnya" value={cycle.nextHarvest ?? "Belum tersedia"} />}{!isActive && cycle.endedAt && <DetailRow label="Tanggal selesai" value={cycle.endedAt} />}</dl>{!hasFirstHarvest && isActive && <div className="mt-4 rounded-xl border border-tj-info-soft bg-tj-info-soft px-3 py-3 text-sm leading-5 text-tj-info">Jadwal panen berikutnya akan dibuat setelah panen pertama dicatat.</div>}</Section>
            <Section icon={Clock3} title="Riwayat Siklus">{history.length ? <ol className="divide-y divide-tj-border">{history.map((item) => <li className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0" key={`${item.date}-${item.label}`}><div><p className="text-sm font-semibold text-tj-text">{item.label}</p>{item.detail && <p className="mt-0.5 text-xs text-tj-muted">{item.detail}</p>}</div><time className="shrink-0 text-right text-xs text-tj-muted">{item.date}</time></li>)}</ol> : <p className="text-sm leading-6 text-tj-muted">Belum ada panen yang tercatat pada siklus ini.</p>}</Section>
          </div>

          <aside className="space-y-2 lg:col-start-2 lg:row-start-2 lg:sticky lg:top-8">{isActive && (hasFirstHarvest ? <Link className={cn(buttonVariants(), "w-full")} href="/jadwal"><CalendarDays aria-hidden="true" size={18} />Lihat Jadwal Panen</Link> : <Link className={cn(buttonVariants(), "w-full")} href={firstHarvestAction}><CalendarDays aria-hidden="true" size={18} />Catat Panen Pertama</Link>)}{isActive && <Link className={cn(buttonVariants({ variant: "secondary" }), "w-full")} href={`${basePath}/edit`}><PencilLine aria-hidden="true" size={18} />Edit Siklus</Link>}{isActive && <Button className="w-full" onClick={() => setEndDialogOpen(true)} variant="danger"><CircleStop aria-hidden="true" size={18} />Akhiri Siklus</Button>}{!isActive && <div className="rounded-xl border border-tj-border bg-tj-canvas px-4 py-3 text-sm leading-6 text-tj-muted">Siklus telah selesai. Riwayat panen dan transaksi tetap tersimpan.</div>}</aside>
        </div>
      </ContentContainer>

      <ResponsiveConfirmDialog cancelLabel="Batal" confirmLabel="Akhiri Siklus" confirmVariant="danger" description={`Siklus ${cycle.commodity} akan ditandai selesai. Riwayat panen dan transaksi yang sudah ada tetap tersimpan.`} onClose={() => setEndDialogOpen(false)} onConfirm={confirmEndCycle} open={endDialogOpen} title="Akhiri Siklus?" />
      <AnimatePresence initial={false}>{toast && <motion.div animate={{ opacity: 1, y: 0 }} className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] mx-auto flex max-w-md items-center gap-2 rounded-xl bg-tj-text px-4 py-3 text-sm font-semibold text-white shadow-[var(--tj-shadow-md)] lg:bottom-6" exit={{ opacity: 0, y: reduceMotion ? 0 : 8 }} initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }} role="status" transition={{ duration: reduceMotion ? 0.01 : 0.2, ease: "easeOut" }}><CheckCircle2 aria-hidden="true" className="shrink-0 text-[#bce7c9]" size={20} /><span className="min-w-0 flex-1">{toast}</span><button aria-label="Tutup notifikasi" className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white" onClick={() => setToast(null)} type="button"><X aria-hidden="true" size={17} /></button></motion.div>}</AnimatePresence>
    </div>
  );
}
