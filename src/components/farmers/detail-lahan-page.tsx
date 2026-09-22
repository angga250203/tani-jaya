"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, ChevronRight, LandPlot, MapPin, PencilLine, Sprout, UserRound } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { useFarmers } from "@/components/farmers/farmers-provider";
import { ContentContainer } from "@/components/layout/content-container";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { FieldRecord, HarvestCycle } from "@/lib/fields";
import { cn } from "@/lib/utils";

function Section({ title, icon: Icon, children, action }: { title: string; icon: typeof CalendarDays; children: ReactNode; action?: ReactNode }) {
  return <Card><CardContent className="p-4 lg:p-5"><div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Icon aria-hidden="true" className="text-tj-primary" size={19} /><h2 className="text-base font-bold text-tj-text">{title}</h2></div>{action}</div>{children}</CardContent></Card>;
}

function CycleCard({ cycle, href }: { cycle: HarvestCycle; href: string }) {
  const active = cycle.status === "active";
  return <Link aria-label={`Buka siklus ${cycle.commodity}`} className="block rounded-xl border border-tj-border p-3 transition-colors hover:border-tj-primary hover:bg-tj-canvas focus-visible:outline-none" href={href}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-tj-text">{cycle.commodity}</p><p className="mt-0.5 text-xs text-tj-muted">{active ? `Interval panen ${cycle.intervalDays} hari` : cycle.period}</p></div><div className="flex items-center gap-1"><StatusBadge status={active ? "today" : "neutral"}>{active ? "Aktif" : "Selesai"}</StatusBadge><ChevronRight aria-hidden="true" className="text-tj-primary" size={17} /></div></div>{active && <div className="mt-3 border-t border-tj-border pt-3"><p className="text-xs text-tj-muted">Panen berikutnya</p><p className="mt-0.5 text-sm font-semibold text-tj-text">{cycle.nextHarvest ?? "Belum tersedia"}</p></div>}</Link>;
}

export function DetailLahanPage({ farmerId, fieldId, initialField }: { farmerId: string; fieldId: string; initialField?: FieldRecord }) {
  const { fields, records } = useFarmers();
  const field = fields.find((item) => item.id === fieldId) ?? initialField;
  const farmer = records.find((item) => item.id === farmerId);
  const activeCycles = useMemo(() => field?.cycles.filter((cycle) => cycle.status === "active") ?? [], [field]);
  const historyCycles = useMemo(() => field?.cycles.filter((cycle) => cycle.status === "completed") ?? [], [field]);

  if (!field || !farmer || field.farmerId !== farmerId) {
    return <div className="py-5"><ContentContainer><Card className="max-w-xl"><CardContent className="p-5"><h1 className="text-lg font-bold text-tj-text">Lahan tidak ditemukan</h1><Link className="mt-3 inline-flex text-sm font-semibold text-tj-primary hover:underline" href={`/petani/${farmerId}`}>Kembali ke Detail Petani</Link></CardContent></Card></ContentContainer></div>;
  }

  const cycleBase = `/petani/${farmerId}/lahan/${field.id}/siklus`;
  const nextHarvest = activeCycles[0]?.nextHarvest ?? "Belum ada jadwal";
  return <div className="py-5 sm:py-6 lg:py-8"><ContentContainer><header className="flex items-center gap-3 border-b border-tj-border pb-5 lg:pb-6"><Link aria-label="Kembali ke Detail Petani" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-tj-muted hover:bg-tj-primary-soft hover:text-tj-primary" href={`/petani/${farmerId}`}><ArrowLeft aria-hidden="true" size={21} /></Link><div className="min-w-0 flex-1"><p className="text-xs font-medium text-tj-muted sm:text-sm">Lahan</p><h1 className="truncate text-[19px] font-bold leading-6 tracking-[-0.02em] text-tj-text lg:text-[28px] lg:leading-8">Detail Lahan</h1></div><Link aria-label={`Edit ${field.name}`} className={cn(buttonVariants({ variant: "secondary", size: "icon" }), "shrink-0")} href={`/petani/${farmerId}/lahan/${field.id}/edit`}><PencilLine aria-hidden="true" size={18} /></Link></header><div className="mt-5 space-y-5 lg:mt-7 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6 lg:space-y-0"><Card className="lg:col-span-2"><CardContent className="p-4 lg:p-5"><div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tj-primary-soft text-tj-primary"><LandPlot aria-hidden="true" size={20} /></span><div className="min-w-0"><h2 className="text-lg font-bold text-tj-text">{field.name}</h2><p className="mt-1 flex items-center gap-1.5 text-sm text-tj-muted"><UserRound aria-hidden="true" size={15} />{farmer.name}</p><p className="mt-2 flex items-start gap-1.5 text-sm leading-5 text-tj-muted"><MapPin aria-hidden="true" className="mt-0.5 shrink-0" size={15} />{field.landmark}</p></div></div></CardContent></Card><div className="space-y-5 lg:col-start-1 lg:row-start-2"><Section icon={LandPlot} title="Informasi Lahan"><dl className="divide-y divide-tj-border"><div className="flex justify-between gap-4 py-3 first:pt-0"><dt className="text-sm text-tj-muted">Nama lahan</dt><dd className="text-right text-sm font-semibold text-tj-text">{field.name}</dd></div><div className="flex justify-between gap-4 py-3"><dt className="text-sm text-tj-muted">Patokan</dt><dd className="max-w-[62%] text-right text-sm font-semibold text-tj-text">{field.landmark}</dd></div><div className="flex justify-between gap-4 py-3 last:pb-0"><dt className="text-sm text-tj-muted">Catatan</dt><dd className="max-w-[62%] text-right text-sm font-semibold text-tj-text">{field.note || "—"}</dd></div></dl></Section><Section action={<Link className="inline-flex min-h-9 items-center rounded-lg px-2.5 text-xs font-semibold text-tj-primary hover:bg-tj-primary-soft" href={`${cycleBase}/baru`}>Tambah Siklus</Link>} icon={Sprout} title="Siklus Aktif">{activeCycles.length ? <div className="space-y-2.5">{activeCycles.map((cycle) => <CycleCard cycle={cycle} href={`${cycleBase}/${cycle.id}`} key={cycle.id} />)}</div> : <p className="text-sm leading-6 text-tj-muted">Belum ada siklus aktif pada lahan ini.</p>}</Section><Section icon={CalendarDays} title="Riwayat Siklus">{historyCycles.length ? <div className="space-y-2.5">{historyCycles.map((cycle) => <CycleCard cycle={cycle} href={`${cycleBase}/${cycle.id}`} key={cycle.id} />)}</div> : <p className="text-sm leading-6 text-tj-muted">Belum ada riwayat siklus.</p>}</Section></div><aside className="space-y-5 lg:col-start-2 lg:row-start-2 lg:sticky lg:top-8"><Section icon={UserRound} title="Ringkasan"><div className="space-y-3 text-sm"><div><p className="text-tj-muted">Petani</p><p className="mt-0.5 font-semibold text-tj-text">{farmer.name}</p></div><div><p className="text-tj-muted">Siklus aktif</p><p className="mt-0.5 font-semibold text-tj-text">{activeCycles.length} siklus</p></div><div><p className="text-tj-muted">Panen berikutnya</p><p className="mt-0.5 font-semibold text-tj-text">{nextHarvest}</p></div></div></Section><Link className={cn(buttonVariants({ variant: "secondary" }), "w-full")} href={`/petani/${farmerId}/lahan/${field.id}/edit`}><PencilLine aria-hidden="true" size={18} />Edit Lahan</Link></aside></div></ContentContainer></div>;
}
