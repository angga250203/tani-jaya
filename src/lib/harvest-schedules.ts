export type HarvestScheduleStatus = "today" | "upcoming" | "warning";

export type HarvestSchedule = {
  id: string;
  /**
   * A schedule is an operational read model. These IDs retain the source
   * Farmer → Field → Cycle relationship; the accompanying strings are only
   * display snapshots.
   */
  farmerId: string;
  fieldId: string;
  cycleId: string;
  farmer: string;
  initials: string;
  commodity: string;
  field: string;
  date: string;
  dateISO: string;
  method: "Diambil" | "Diantar";
  status: HarvestScheduleStatus;
  statusLabel: "Hari Ini" | "Akan Datang" | "Terlambat";
  wasPostponed?: boolean;
};

export type PurchaseScheduleContext = {
  scheduleId: string;
  farmerId: string;
  fieldId: string;
  cycleId: string;
  farmerName: string;
  fieldName: string;
  commodity: string;
};

export type HarvestScheduleDetail = HarvestSchedule & {
  intervalDays: number;
  landmark: string;
  note: string;
  nextDate: string;
  nextDateISO: string;
};

export function toPurchaseScheduleContext(schedule: HarvestSchedule): PurchaseScheduleContext {
  return {
    scheduleId: schedule.id,
    farmerId: schedule.farmerId,
    fieldId: schedule.fieldId,
    cycleId: schedule.cycleId,
    farmerName: schedule.farmer,
    fieldName: schedule.field,
    commodity: schedule.commodity,
  };
}
