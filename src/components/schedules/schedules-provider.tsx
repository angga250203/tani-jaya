"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { harvestSchedules, type HarvestSchedule, type HarvestScheduleStatus } from "@/lib/harvest-schedules";
import { operationalDateISO } from "@/lib/operational-date";

type NewSchedule = Omit<HarvestSchedule, "id" | "initials" | "status" | "statusLabel" | "date">;
type SchedulesContextValue = {
  schedules: HarvestSchedule[];
  addSchedule: (schedule: NewSchedule) => HarvestSchedule;
  postponeSchedule: (id: string, dateISO: string) => void;
  updateReceivingMethod: (
    id: string,
    method: HarvestSchedule["method"],
    scope: "single" | "following",
  ) => void;
};
const SchedulesContext = createContext<SchedulesContextValue | null>(null);

function formatDate(dateISO: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${dateISO}T00:00:00Z`));
}

function scheduleStatus(dateISO: string): { status: HarvestScheduleStatus; statusLabel: HarvestSchedule["statusLabel"] } {
  if (dateISO < operationalDateISO) return { status: "warning", statusLabel: "Terlambat" };
  if (dateISO === operationalDateISO) return { status: "today", statusLabel: "Hari Ini" };
  return { status: "upcoming", statusLabel: "Akan Datang" };
}

export function SchedulesProvider({ children }: { children: ReactNode }) {
  const [schedules, setSchedules] = useState(harvestSchedules);
  const addSchedule = useCallback((schedule: NewSchedule) => {
    const status = scheduleStatus(schedule.dateISO);
    const created: HarvestSchedule = { ...schedule, id: `jadwal-local-${Date.now()}`, initials: schedule.farmer.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(), date: formatDate(schedule.dateISO), ...status };
    setSchedules((current) => [...current, created].sort((a, b) => a.dateISO.localeCompare(b.dateISO)));
    return created;
  }, []);
  const postponeSchedule = useCallback((id: string, dateISO: string) => {
    const status = scheduleStatus(dateISO);
    setSchedules((current) => current.map((schedule) => schedule.id === id ? { ...schedule, dateISO, date: formatDate(dateISO), wasPostponed: true, ...status } : schedule));
  }, []);
  const updateReceivingMethod = useCallback((
    id: string,
    method: HarvestSchedule["method"],
    scope: "single" | "following",
  ) => {
    setSchedules((current) => {
      const source = current.find((schedule) => schedule.id === id);
      if (!source) return current;

      return current.map((schedule) => {
        const isCurrentSchedule = schedule.id === id;
        const belongsToSameScheduleSeries = scope === "following"
          && schedule.cycleId === source.cycleId
          && schedule.dateISO >= source.dateISO;

        return isCurrentSchedule || belongsToSameScheduleSeries
          ? { ...schedule, method }
          : schedule;
      });
    });
  }, []);
  const value = useMemo(
    () => ({ schedules, addSchedule, postponeSchedule, updateReceivingMethod }),
    [addSchedule, postponeSchedule, schedules, updateReceivingMethod],
  );
  return <SchedulesContext.Provider value={value}>{children}</SchedulesContext.Provider>;
}

export function useSchedules() {
  const context = useContext(SchedulesContext);
  if (!context) throw new Error("useSchedules harus digunakan di dalam SchedulesProvider.");
  return context;
}
