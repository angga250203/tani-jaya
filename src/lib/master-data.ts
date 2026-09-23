import type { Farmer, FarmerStatus } from "@/lib/farmers";
import type { FieldRecord, HarvestCycle, HarvestCycleStatus, ReceivingMethod } from "@/lib/fields";
import type { HarvestSchedule, HarvestScheduleStatus } from "@/lib/harvest-schedules";
import { operationalDateISO } from "@/lib/operational-date";
import type { Database } from "@/types/database.types";

type FarmerRow = Database["public"]["Tables"]["farmers"]["Row"];
type FieldRow = Database["public"]["Tables"]["fields"]["Row"];
type HarvestCycleRow = Database["public"]["Tables"]["harvest_cycles"]["Row"];
type HarvestScheduleRow = Database["public"]["Tables"]["harvest_schedules"]["Row"];
type HarvestScheduleChangeRow = Database["public"]["Tables"]["harvest_schedule_changes"]["Row"];

export type MasterData = {
  farmers: Farmer[];
  fields: FieldRecord[];
};

export function formatDateId(date: string | null | undefined) {
  if (!date) return undefined;
  const normalized = date.includes("T") ? date : `${date}T00:00:00Z`;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(normalized));
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function farmerStatus(status: string): FarmerStatus {
  return status === "inactive" ? "inactive" : "active";
}

function cycleStatus(status: string): HarvestCycleStatus {
  return status === "completed" ? "completed" : "active";
}

function receivingMethod(method: string): ReceivingMethod {
  return method === "delivered" ? "DIANTAR" : "DIAMBIL";
}

function scheduleMethod(method: string): HarvestSchedule["method"] {
  return method === "delivered" ? "Diantar" : "Diambil";
}

export function scheduleStatus(dateISO: string): {
  status: HarvestScheduleStatus;
  statusLabel: HarvestSchedule["statusLabel"];
} {
  const operationalDate = operationalDateISO;
  if (dateISO < operationalDate) return { status: "warning", statusLabel: "Terlambat" };
  if (dateISO === operationalDate) return { status: "today", statusLabel: "Hari Ini" };
  return { status: "upcoming", statusLabel: "Akan Datang" };
}

export function toFieldRecords(
  fieldRows: FieldRow[],
  cycleRows: HarvestCycleRow[],
): FieldRecord[] {
  const cyclesByField = new Map<string, HarvestCycle[]>();

  for (const row of cycleRows) {
    const cycle: HarvestCycle = {
      id: row.id,
      commodity: row.commodity,
      status: cycleStatus(row.status),
      intervalDays: row.harvest_interval_days,
      defaultReceivingMethod: receivingMethod(row.default_receiving_method),
      createdAt: formatDateId(row.created_at) ?? "—",
      firstHarvestAt: formatDateId(row.first_harvest_at),
      lastHarvestAt: formatDateId(row.last_harvest_at),
      endedAt: formatDateId(row.ended_at),
      notes: row.notes,
      harvestHistory: [],
      period: row.ended_at
        ? `${formatDateId(row.first_harvest_at) ?? "—"} – ${formatDateId(row.ended_at)}`
        : undefined,
    };
    cyclesByField.set(row.field_id, [...(cyclesByField.get(row.field_id) ?? []), cycle]);
  }

  return fieldRows.map((row) => ({
    id: row.id,
    farmerId: row.farmer_id,
    name: row.name,
    landmark: row.location_reference,
    note: row.notes,
    cycles: cyclesByField.get(row.id) ?? [],
  }));
}

export function toMasterData(
  farmerRows: FarmerRow[],
  fieldRows: FieldRow[],
  cycleRows: HarvestCycleRow[],
): MasterData {
  const fields = toFieldRecords(fieldRows, cycleRows);
  const fieldCount = new Map<string, number>();
  for (const field of fields) {
    fieldCount.set(field.farmerId, (fieldCount.get(field.farmerId) ?? 0) + 1);
  }

  return {
    farmers: farmerRows.map((row) => ({
      id: row.id,
      name: row.name,
      initials: initials(row.name),
      whatsapp: row.whatsapp,
      landmark: row.location_reference,
      note: row.notes,
      status: farmerStatus(row.status),
      fieldCount: fieldCount.get(row.id) ?? 0,
    })),
    fields,
  };
}

export function toHarvestSchedules(
  scheduleRows: HarvestScheduleRow[],
  changeRows: HarvestScheduleChangeRow[],
  masterData: MasterData,
): HarvestSchedule[] {
  const fieldByCycle = new Map<string, FieldRecord>();
  for (const field of masterData.fields) {
    for (const cycle of field.cycles) fieldByCycle.set(cycle.id, field);
  }
  const farmerById = new Map(masterData.farmers.map((farmer) => [farmer.id, farmer]));
  const rescheduledIds = new Set(
    changeRows
      .filter((change) => change.change_type === "rescheduled")
      .map((change) => change.schedule_id),
  );

  return scheduleRows.flatMap((row) => {
    const field = fieldByCycle.get(row.cycle_id);
    const cycle = field?.cycles.find((item) => item.id === row.cycle_id);
    const farmer = field ? farmerById.get(field.farmerId) : undefined;
    if (!field || !cycle || !farmer) return [];

    return [{
      id: row.id,
      farmerId: farmer.id,
      fieldId: field.id,
      cycleId: cycle.id,
      farmer: farmer.name,
      initials: farmer.initials,
      commodity: cycle.commodity,
      field: field.name,
      date: formatDateId(row.scheduled_date) ?? row.scheduled_date,
      dateISO: row.scheduled_date,
      method: scheduleMethod(row.receiving_method),
      ...scheduleStatus(row.scheduled_date),
      wasPostponed: rescheduledIds.has(row.id),
    }];
  }).sort((left, right) => left.dateISO.localeCompare(right.dateISO));
}

export function toSupabaseErrorMessage(
  error: { code?: string; message: string } | null | undefined,
  fallback = "Data belum dapat disimpan. Silakan coba lagi.",
) {
  if (!error) return fallback;
  if (error.code === "23505") {
    return "Sudah ada siklus aktif untuk komoditas ini di lahan tersebut.";
  }
  if (error.code === "23503") {
    return "Data terkait tidak ditemukan atau sudah tidak dapat digunakan.";
  }
  return fallback;
}
