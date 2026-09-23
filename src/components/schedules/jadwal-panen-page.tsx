"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CalendarDays, ChevronRight, MapPin, Search, Truck } from "lucide-react";
import { useMemo, useState } from "react";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { type HarvestSchedule, type HarvestScheduleStatus } from "@/lib/harvest-schedules";
import { isAfterOperationalTomorrow, isSameOperationalDay } from "@/lib/operational-date";
import { cn } from "@/lib/utils";
import { useSchedules } from "./schedules-provider";

type ScheduleFilter = "today" | "tomorrow" | "upcoming" | "postponed" | null;
const statusToBadge: Record<HarvestScheduleStatus, HarvestScheduleStatus> = { today: "today", upcoming: "upcoming", warning: "warning" };

function Avatar({ initials }: { initials: string }) { return <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tj-primary-soft text-xs font-bold text-tj-primary-strong">{initials}</span>; }

function SummaryCard({ active, label, onClick, value }: { active: boolean; label: string; onClick: () => void; value: number }) {
  return <motion.button aria-pressed={active} className="rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tj-primary focus-visible:ring-offset-2" onClick={onClick} type="button" whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}><Card className={cn("min-h-[96px] transition-[border-color,box-shadow,background-color] duration-150", active ? "border-tj-primary bg-tj-primary text-white shadow-[var(--tj-shadow-md)]" : "hover:border-tj-primary hover:shadow-[var(--tj-shadow-sm)]")}><CardContent className="p-3.5 sm:p-4"><p className={active ? "text-xs font-medium text-white/80" : "text-xs font-medium text-tj-muted"}>{label}</p><p className="mt-3 flex items-end gap-1.5"><strong className="text-[27px] font-bold leading-none tracking-[-0.03em]">{value}</strong><span className={active ? "text-xs text-white/80" : "text-xs text-tj-muted"}>jadwal</span></p></CardContent></Card></motion.button>;
}

function ScheduleStatusBadge({ schedule }: { schedule: HarvestSchedule }) { return <StatusBadge status={statusToBadge[schedule.status]}>{schedule.wasPostponed ? "Ditunda" : schedule.statusLabel}</StatusBadge>; }

function HarvestScheduleCard({ schedule }: { schedule: HarvestSchedule }) {
  return <Link aria-label={`Buka jadwal ${schedule.commodity} milik ${schedule.farmer}`} className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tj-primary" href={`/jadwal/${schedule.id}`}><Card className="transition-[border-color,box-shadow,transform] duration-150 hover:border-tj-primary hover:shadow-[var(--tj-shadow-md)] active:scale-[0.99]"><CardContent className="p-4"><div className="flex items-start gap-3"><Avatar initials={schedule.initials} /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-bold text-tj-text">{schedule.farmer}</p><p className="mt-0.5 text-sm text-tj-muted">{schedule.commodity}</p></div><ScheduleStatusBadge schedule={schedule} /></div><div className="mt-3 space-y-1.5 text-xs text-tj-muted"><p className="flex items-center gap-1.5"><CalendarDays aria-hidden="true" size={14} />{schedule.date}</p><p className="flex items-center gap-1.5"><MapPin aria-hidden="true" size={14} />{schedule.field}</p></div></div></div><div className="mt-3 flex items-center justify-between border-t border-tj-border pt-3"><span className="flex items-center gap-1.5 text-xs font-medium text-tj-muted"><Truck aria-hidden="true" size={14} />{schedule.method}</span><span className="flex h-9 items-center gap-1 text-xs font-semibold text-tj-primary">Detail<ChevronRight aria-hidden="true" size={16} /></span></div></CardContent></Card></Link>;
}

function HarvestScheduleTable({ schedules }: { schedules: HarvestSchedule[] }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  return <Card className="hidden overflow-hidden lg:block"><div className="overflow-x-auto"><table className="w-full min-w-[880px] text-left"><thead className="border-b border-tj-border bg-tj-canvas text-xs font-semibold text-tj-muted"><tr><th className="px-5 py-3">Tanggal</th><th className="px-4 py-3">Petani</th><th className="px-4 py-3">Komoditas</th><th className="px-4 py-3">Lahan</th><th className="px-4 py-3">Metode</th><th className="px-4 py-3">Status</th><th className="px-5 py-3 text-right">Aksi</th></tr></thead><tbody>{schedules.map((schedule) => <motion.tr animate={{ opacity: 1, y: 0 }} aria-label={`Buka jadwal ${schedule.commodity} milik ${schedule.farmer}`} className="cursor-pointer border-b border-tj-border last:border-0 hover:bg-tj-canvas/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-tj-primary" initial={{ opacity: 0, y: reduceMotion ? 0 : 5 }} key={schedule.id} layout onClick={() => router.push(`/jadwal/${schedule.id}`)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); router.push(`/jadwal/${schedule.id}`); } }} tabIndex={0} transition={{ duration: reduceMotion ? 0.01 : 0.18 }}><td className="whitespace-nowrap px-5 py-4 text-sm text-tj-text">{schedule.date}</td><td className="px-4 py-4"><Link className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none" href={`/jadwal/${schedule.id}`} onClick={(event) => event.stopPropagation()}><Avatar initials={schedule.initials} /><span className="text-sm font-semibold text-tj-text">{schedule.farmer}</span></Link></td><td className="px-4 py-4 text-sm text-tj-text">{schedule.commodity}</td><td className="px-4 py-4 text-sm text-tj-muted">{schedule.field}</td><td className="px-4 py-4 text-sm text-tj-muted">{schedule.method}</td><td className="px-4 py-4"><ScheduleStatusBadge schedule={schedule} /></td><td className="px-5 py-4 text-right"><Link aria-label={`Lihat detail jadwal ${schedule.farmer}`} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-tj-primary hover:bg-tj-primary-soft" href={`/jadwal/${schedule.id}`} onClick={(event) => event.stopPropagation()}>Detail<ChevronRight aria-hidden="true" size={15} /></Link></td></motion.tr>)}</tbody></table></div></Card>;
}

function EmptyState({ filter }: { filter: ScheduleFilter }) { return <Card><CardContent className="flex min-h-52 flex-col items-center justify-center px-6 py-8 text-center"><CalendarDays aria-hidden="true" className="mb-3 text-tj-primary" size={28} /><h2 className="text-base font-bold text-tj-text">Tidak ada jadwal panen</h2><p className="mt-1 max-w-xs text-sm leading-6 text-tj-muted">{filter === "tomorrow" ? "Tidak ada jadwal panen besok." : "Coba ubah pencarian atau lihat semua jadwal."}</p></CardContent></Card>; }

export function JadwalPanenPage() {
  const { schedules, error, isLoading, refresh } = useSchedules();
  const [filter, setFilter] = useState<ScheduleFilter>(null);
  const [query, setQuery] = useState("");
  const reduceMotion = useReducedMotion();
  const summary = useMemo(() => ({ today: schedules.filter((schedule) => isSameOperationalDay(schedule.dateISO)).length, tomorrow: schedules.filter((schedule) => isSameOperationalDay(schedule.dateISO, 1)).length, upcoming: schedules.filter((schedule) => isAfterOperationalTomorrow(schedule.dateISO)).length, postponed: schedules.filter((schedule) => schedule.wasPostponed).length }), [schedules]);
  const filteredSchedules = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("id-ID");
    return schedules.filter((schedule) => {
      const matchesQuery = !normalizedQuery || [schedule.farmer, schedule.commodity, schedule.field].some((value) => value.toLocaleLowerCase("id-ID").includes(normalizedQuery));
      const matchesFilter = filter === null || (filter === "today" && isSameOperationalDay(schedule.dateISO)) || (filter === "tomorrow" && isSameOperationalDay(schedule.dateISO, 1)) || (filter === "upcoming" && isAfterOperationalTomorrow(schedule.dateISO)) || (filter === "postponed" && schedule.wasPostponed);
      return matchesQuery && matchesFilter;
    });
  }, [filter, query, schedules]);
  const selectFilter = (next: Exclude<ScheduleFilter, null>) => setFilter((current) => current === next ? null : next);

  if (isLoading) return <div className="px-4 py-6 text-sm text-tj-muted">Memuat data Jadwal Panen…</div>;
  if (error) return <div className="px-4 py-6 text-sm text-tj-danger"><p>{error}</p><button className="mt-3 font-semibold text-tj-primary hover:underline" onClick={() => void refresh()} type="button">Coba lagi</button></div>;

  return <div className="py-5 sm:py-6 lg:py-8"><ContentContainer><PageHeader actionHref="/jadwal/baru" actionLabel="Tambah Jadwal" mobileTitle="Jadwal Panen" subtitle="Pantau panen mitra · 16 September 2026" title="Jadwal Panen" /><div className="mt-5 space-y-5 lg:mt-7 lg:space-y-6"><section aria-labelledby="ringkasan-jadwal"><div className="mb-3 flex items-center gap-2"><CalendarDays aria-hidden="true" className="text-tj-primary" size={19} /><h2 className="text-base font-bold text-tj-text lg:text-lg" id="ringkasan-jadwal">Ringkasan jadwal</h2></div><div className="grid max-w-3xl grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4 lg:gap-4"><SummaryCard active={filter === "today"} label="Hari Ini" onClick={() => selectFilter("today")} value={summary.today} /><SummaryCard active={filter === "tomorrow"} label="Besok" onClick={() => selectFilter("tomorrow")} value={summary.tomorrow} /><SummaryCard active={filter === "upcoming"} label="Akan Datang" onClick={() => selectFilter("upcoming")} value={summary.upcoming} /><SummaryCard active={filter === "postponed"} label="Ditunda" onClick={() => selectFilter("postponed")} value={summary.postponed} /></div></section><section aria-label="Cari jadwal panen"><div className="relative"><Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-tj-muted" size={18} /><Input aria-label="Cari petani, komoditas, atau lahan" className="pl-10" onChange={(event) => setQuery(event.target.value)} placeholder="Cari petani, komoditas, atau lahan" type="search" value={query} /></div></section><section aria-labelledby="daftar-jadwal"><div className="mb-3 flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold tracking-[-0.015em] text-tj-text" id="daftar-jadwal">Daftar Jadwal</h2><p className="mt-0.5 text-sm text-tj-muted">{filteredSchedules.length} jadwal ditemukan</p></div>{filter !== null && <button className="min-h-10 shrink-0 rounded-lg px-2.5 text-sm font-semibold text-tj-primary transition-colors hover:bg-tj-primary-soft" onClick={() => setFilter(null)} type="button">Lihat Semua</button>}</div>{filteredSchedules.length ? <><motion.div className="space-y-3 lg:hidden" layout><AnimatePresence initial={false} mode="popLayout">{filteredSchedules.map((schedule) => <motion.div animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }} initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }} key={schedule.id} layout transition={{ duration: reduceMotion ? 0.01 : 0.18, ease: "easeOut" }}><HarvestScheduleCard schedule={schedule} /></motion.div>)}</AnimatePresence></motion.div><HarvestScheduleTable schedules={filteredSchedules} /></> : <EmptyState filter={filter} />}</section></div></ContentContainer></div>;
}
