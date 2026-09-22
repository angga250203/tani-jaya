"use client";

import { DetailJadwalPanenPage } from "./detail-jadwal-panen-page";
import { useSchedules } from "./schedules-provider";
import { getHarvestScheduleDetail } from "@/lib/harvest-schedules";

function addDays(dateISO: string, days: number) {
  const date = new Date(`${dateISO}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function ScheduleDetailLoader({ scheduleId }: { scheduleId: string }) {
  const { schedules } = useSchedules();
  const staticDetail = getHarvestScheduleDetail(scheduleId);
  const localSchedule = schedules.find((schedule) => schedule.id === scheduleId);
  const schedule = localSchedule
    ? {
        ...staticDetail,
        ...localSchedule,
        intervalDays: staticDetail?.intervalDays ?? 7,
        landmark: staticDetail?.landmark ?? "Patokan kebun petani",
        note: staticDetail?.note ?? "Jadwal panen baru telah dicatat.",
        nextDate: staticDetail?.nextDate ?? "—",
        nextDateISO: addDays(localSchedule.dateISO, staticDetail?.intervalDays ?? 7),
      }
    : undefined;

  if (!schedule) return <p className="px-4 py-6 text-sm text-tj-muted">Jadwal tidak ditemukan.</p>;
  return <DetailJadwalPanenPage key={schedule.id} schedule={schedule} />;
}
