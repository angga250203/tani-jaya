"use client";

import { useFarmers } from "@/components/farmers/farmers-provider";
import { formatDateId } from "@/lib/master-data";
import { DetailJadwalPanenPage } from "./detail-jadwal-panen-page";
import { useSchedules } from "./schedules-provider";

function addDays(dateISO: string, days: number) {
  const date = new Date(`${dateISO}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function ScheduleDetailLoader({ scheduleId }: { scheduleId: string }) {
  const { fields, error: masterError, isLoading: masterLoading } = useFarmers();
  const { schedules, error: schedulesError, isLoading: schedulesLoading } = useSchedules();
  const schedule = schedules.find((item) => item.id === scheduleId);
  const field = schedule ? fields.find((item) => item.id === schedule.fieldId) : undefined;
  const cycle = field?.cycles.find((item) => item.id === schedule?.cycleId);

  if (masterLoading || schedulesLoading) return <p className="px-4 py-6 text-sm text-tj-muted">Memuat detail Jadwal Panen…</p>;
  if (masterError || schedulesError) return <p className="px-4 py-6 text-sm text-tj-danger">{masterError ?? schedulesError}</p>;
  if (!schedule || !field || !cycle) return <p className="px-4 py-6 text-sm text-tj-muted">Jadwal tidak ditemukan.</p>;

  const nextDateISO = addDays(schedule.dateISO, cycle.intervalDays);
  return <DetailJadwalPanenPage key={schedule.id} schedule={{
    ...schedule,
    intervalDays: cycle.intervalDays,
    landmark: field.landmark,
    note: cycle.notes || "Jadwal panen mengikuti interval siklus yang telah disepakati.",
    nextDate: formatDateId(nextDateISO) ?? nextDateISO,
    nextDateISO,
  }} />;
}
