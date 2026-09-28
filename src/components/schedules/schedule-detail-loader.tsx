"use client";

import Link from "next/link";
import { useFarmers } from "@/components/farmers/farmers-provider";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { formatDateId } from "@/lib/master-data";
import { cn } from "@/lib/utils";
import { DetailJadwalPanenPage } from "./detail-jadwal-panen-page";
import { useSchedules } from "./schedules-provider";

function addDays(dateISO: string, days: number) {
  const date = new Date(`${dateISO}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function ScheduleDetailLoader({ scheduleId }: { scheduleId: string }) {
  const { fields, error: masterError, isLoading: masterLoading } = useFarmers();
  const { schedules, error: schedulesError, isLoading: schedulesLoading, recordedSchedulePurchaseIds } = useSchedules();
  const schedule = schedules.find((item) => item.id === scheduleId);
  const field = schedule ? fields.find((item) => item.id === schedule.fieldId) : undefined;
  const cycle = field?.cycles.find((item) => item.id === schedule?.cycleId);

  if (masterLoading || schedulesLoading) return <p className="px-4 py-6 text-sm text-tj-muted">Memuat detail Jadwal Panen…</p>;
  if (masterError || schedulesError) return <p className="px-4 py-6 text-sm text-tj-danger">{masterError ?? schedulesError}</p>;
  const recordedPurchaseId = recordedSchedulePurchaseIds[scheduleId];
  if (recordedPurchaseId) return <div className="px-4 py-6"><Card className="max-w-xl"><CardContent className="space-y-4 p-5"><h1 className="text-lg font-bold text-tj-text">Panen sudah tercatat</h1><p className="text-sm leading-6 text-tj-muted">Jadwal ini sudah memiliki Pembelian terkait dan tidak lagi menunggu pencatatan panen.</p><Link className={cn(buttonVariants(), "w-full")} href={`/transaksi/${recordedPurchaseId}`}>Buka Pembelian</Link></CardContent></Card></div>;
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
