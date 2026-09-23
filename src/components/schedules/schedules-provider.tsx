"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFarmers } from "@/components/farmers/farmers-provider";
import { formatDateId, scheduleStatus, toHarvestSchedules, toSupabaseErrorMessage } from "@/lib/master-data";
import type { HarvestSchedule } from "@/lib/harvest-schedules";
import { createClient } from "@/lib/supabase/client";

type NewSchedule = Omit<HarvestSchedule, "id" | "initials" | "status" | "statusLabel" | "date" | "wasPostponed">;
type MutationResult<T> = { data?: T; error?: string };
type SchedulesContextValue = {
  schedules: HarvestSchedule[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<boolean>;
  addSchedule: (schedule: NewSchedule) => Promise<MutationResult<HarvestSchedule>>;
  postponeSchedule: (id: string, dateISO: string) => Promise<MutationResult<void>>;
  updateReceivingMethod: (id: string, method: HarvestSchedule["method"], scope: "single" | "following") => Promise<MutationResult<void>>;
};

const SchedulesContext = createContext<SchedulesContextValue | null>(null);

function dbMethod(method: HarvestSchedule["method"]) {
  return method === "Diantar" ? "delivered" : "picked_up";
}

function addDays(dateISO: string, days: number) {
  const date = new Date(`${dateISO}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function calendarDayDifference(fromDateISO: string, toDateISO: string) {
  const from = new Date(`${fromDateISO}T00:00:00Z`).getTime();
  const to = new Date(`${toDateISO}T00:00:00Z`).getTime();
  return Math.round((to - from) / 86_400_000);
}

export function SchedulesProvider({ children }: { children: ReactNode }) {
  const { records, fields, isLoading: masterLoading, error: masterError } = useFarmers();
  const [schedules, setSchedules] = useState<HarvestSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const masterDataRef = useRef({ records, fields, masterLoading, masterError });

  useEffect(() => {
    masterDataRef.current = { records, fields, masterLoading, masterError };
  }, [fields, masterError, masterLoading, records]);

  const refresh = useCallback(async () => {
    const masterData = masterDataRef.current;
    if (masterData.masterLoading) return false;
    if (masterData.masterError) {
      setSchedules([]);
      setError(masterData.masterError);
      setIsLoading(false);
      return false;
    }
    setIsLoading(true);
    setError(null);
    const supabase = createClient();
    const [schedulesResult, changesResult] = await Promise.all([
      supabase.from("harvest_schedules").select().neq("status", "cancelled").order("scheduled_date", { ascending: true }),
      supabase.from("harvest_schedule_changes").select().order("created_at", { ascending: true }),
    ]);
    const queryError = schedulesResult.error ?? changesResult.error;
    if (queryError || !schedulesResult.data || !changesResult.data) {
      setSchedules([]);
      setError(toSupabaseErrorMessage(queryError, "Data Jadwal Panen belum dapat dimuat. Periksa koneksi lalu coba lagi."));
      setIsLoading(false);
      return false;
    }
    const mapped = toHarvestSchedules(schedulesResult.data, changesResult.data, { farmers: masterData.records, fields: masterData.fields });
    if (mapped.length !== schedulesResult.data.length) {
      setSchedules([]);
      setError("Relasi Jadwal Panen tidak lengkap. Periksa data Petani, Lahan, dan Siklus.");
      setIsLoading(false);
      return false;
    }
    setSchedules(mapped);
    setIsLoading(false);
    return true;
  }, []);

  useEffect(() => {
    if (!masterLoading) void refresh();
  }, [masterError, masterLoading, refresh]);

  const addSchedule = useCallback(async (schedule: NewSchedule): Promise<MutationResult<HarvestSchedule>> => {
    const { data, error: insertError } = await createClient().from("harvest_schedules").insert({
      cycle_id: schedule.cycleId,
      scheduled_date: schedule.dateISO,
      receiving_method: dbMethod(schedule.method),
      status: "scheduled",
    }).select().single();
    if (insertError || !data) return { error: toSupabaseErrorMessage(insertError) };
    const saved: HarvestSchedule = {
      ...schedule,
      id: data.id,
      initials: schedule.farmer.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
      date: formatDateId(schedule.dateISO) ?? schedule.dateISO,
      ...scheduleStatus(schedule.dateISO),
    };
    return await refresh() ? { data: saved } : { error: "Jadwal tersimpan, tetapi daftar belum dapat dimuat ulang." };
  }, [refresh]);

  const postponeSchedule = useCallback(async (id: string, dateISO: string): Promise<MutationResult<void>> => {
    const source = schedules.find((schedule) => schedule.id === id);
    if (!source) return { error: "Jadwal tidak ditemukan." };
    if (source.dateISO === dateISO) return { data: undefined };
    const supabase = createClient();
    const { data: targetRows, error: targetError } = await supabase
      .from("harvest_schedules")
      .select("id, scheduled_date")
      .eq("cycle_id", source.cycleId)
      .eq("status", "scheduled")
      .gte("scheduled_date", source.dateISO);
    if (targetError || !targetRows) return { error: toSupabaseErrorMessage(targetError, "Jadwal berikutnya belum dapat dimuat.") };
    if (!targetRows.length) return { error: "Jadwal ini tidak dapat ditunda karena sudah bukan jadwal panen aktif." };
    const daysShifted = calendarDayDifference(source.dateISO, dateISO);
    const updates = targetRows.map((schedule) => ({
      id: schedule.id,
      previousDate: schedule.scheduled_date,
      nextDate: addDays(schedule.scheduled_date, daysShifted),
    }));
    const updateResults = await Promise.all(updates.map((schedule) => (
      supabase.from("harvest_schedules").update({ scheduled_date: schedule.nextDate }).eq("id", schedule.id)
    )));
    const updateError = updateResults.find((result) => result.error)?.error;
    if (updateError) {
      await refresh();
      return { error: toSupabaseErrorMessage(updateError, "Sebagian jadwal belum dapat dipindahkan. Periksa kembali daftar jadwal.") };
    }
    const { error: historyError } = await supabase.from("harvest_schedule_changes").insert(updates.map((schedule) => ({
      schedule_id: schedule.id,
      change_type: "rescheduled",
      scope: "following",
      previous_scheduled_date: schedule.previousDate,
      new_scheduled_date: schedule.nextDate,
    })));
    if (historyError) {
      await refresh();
      return { error: "Tanggal jadwal berubah, tetapi riwayat perubahan belum dapat dicatat." };
    }
    return await refresh() ? { data: undefined } : { error: "Jadwal diperbarui, tetapi daftar belum dapat dimuat ulang." };
  }, [refresh, schedules]);

  const updateReceivingMethod = useCallback(async (id: string, method: HarvestSchedule["method"], scope: "single" | "following"): Promise<MutationResult<void>> => {
    const source = schedules.find((schedule) => schedule.id === id);
    if (!source) return { error: "Jadwal tidak ditemukan." };
    const targets = schedules.filter((schedule) => (
      schedule.id === id || (scope === "following" && schedule.cycleId === source.cycleId && schedule.dateISO >= source.dateISO)
    )).filter((schedule) => schedule.method !== method);
    if (!targets.length) return { data: undefined };
    const supabase = createClient();
    const { error: updateError } = await supabase.from("harvest_schedules").update({ receiving_method: dbMethod(method) }).in("id", targets.map((schedule) => schedule.id));
    if (updateError) return { error: toSupabaseErrorMessage(updateError) };
    const { error: historyError } = await supabase.from("harvest_schedule_changes").insert(targets.map((schedule) => ({
      schedule_id: schedule.id,
      change_type: "receiving_method_changed",
      scope,
      previous_receiving_method: dbMethod(schedule.method),
      new_receiving_method: dbMethod(method),
    })));
    if (historyError) {
      await refresh();
      return { error: "Metode berubah, tetapi riwayat perubahan belum dapat dicatat." };
    }
    return await refresh() ? { data: undefined } : { error: "Metode diperbarui, tetapi daftar belum dapat dimuat ulang." };
  }, [refresh, schedules]);

  const value = useMemo(() => ({ schedules, isLoading, error, refresh, addSchedule, postponeSchedule, updateReceivingMethod }), [addSchedule, error, isLoading, postponeSchedule, refresh, schedules, updateReceivingMethod]);
  return <SchedulesContext.Provider value={value}>{children}</SchedulesContext.Provider>;
}

export function useSchedules() {
  const context = useContext(SchedulesContext);
  if (!context) throw new Error("useSchedules harus digunakan di dalam SchedulesProvider.");
  return context;
}
