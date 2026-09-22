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

const cabaiRawitCycle = {
  farmerId: "petani-001",
  fieldId: "lahan-001",
  cycleId: "siklus-001",
  farmer: "Budi Santoso",
  initials: "BS",
  commodity: "Cabai Rawit",
  field: "Lahan Utara",
} as const;

const tomatCycle = {
  farmerId: "petani-001",
  fieldId: "lahan-002",
  cycleId: "siklus-002",
  farmer: "Budi Santoso",
  initials: "BS",
  commodity: "Tomat",
  field: "Lahan Selatan",
} as const;

export const harvestSchedules: HarvestSchedule[] = [
  {
    id: "jadwal-001",
    ...cabaiRawitCycle,
    date: "15 September 2026",
    dateISO: "2026-09-15",
    method: "Diambil",
    status: "today",
    statusLabel: "Hari Ini",
  },
  {
    id: "jadwal-002",
    ...tomatCycle,
    date: "19 September 2026",
    dateISO: "2026-09-19",
    method: "Diantar",
    status: "upcoming",
    statusLabel: "Akan Datang",
  },
  {
    id: "jadwal-003",
    ...cabaiRawitCycle,
    date: "22 September 2026",
    dateISO: "2026-09-22",
    method: "Diambil",
    status: "upcoming",
    statusLabel: "Akan Datang",
  },
  {
    id: "jadwal-004",
    ...tomatCycle,
    date: "24 September 2026",
    dateISO: "2026-09-24",
    method: "Diantar",
    status: "upcoming",
    statusLabel: "Akan Datang",
    wasPostponed: true,
  },
  {
    id: "jadwal-005",
    ...cabaiRawitCycle,
    date: "29 September 2026",
    dateISO: "2026-09-29",
    method: "Diantar",
    status: "upcoming",
    statusLabel: "Akan Datang",
    wasPostponed: true,
  },
  {
    id: "jadwal-006",
    ...tomatCycle,
    date: "29 September 2026",
    dateISO: "2026-09-29",
    method: "Diantar",
    status: "upcoming",
    statusLabel: "Akan Datang",
  },
  {
    id: "jadwal-007",
    ...tomatCycle,
    date: "4 Oktober 2026",
    dateISO: "2026-10-04",
    method: "Diantar",
    status: "upcoming",
    statusLabel: "Akan Datang",
  },
  {
    id: "jadwal-008",
    ...cabaiRawitCycle,
    date: "6 Oktober 2026",
    dateISO: "2026-10-06",
    method: "Diambil",
    status: "upcoming",
    statusLabel: "Akan Datang",
  },
  {
    id: "jadwal-009",
    ...tomatCycle,
    date: "9 Oktober 2026",
    dateISO: "2026-10-09",
    method: "Diantar",
    status: "upcoming",
    statusLabel: "Akan Datang",
  },
  {
    id: "jadwal-010",
    ...cabaiRawitCycle,
    date: "13 Oktober 2026",
    dateISO: "2026-10-13",
    method: "Diambil",
    status: "upcoming",
    statusLabel: "Akan Datang",
  },
  {
    id: "jadwal-011",
    ...tomatCycle,
    date: "14 Oktober 2026",
    dateISO: "2026-10-14",
    method: "Diantar",
    status: "upcoming",
    statusLabel: "Akan Datang",
  },
  {
    id: "jadwal-012",
    ...cabaiRawitCycle,
    date: "14 September 2026",
    dateISO: "2026-09-14",
    method: "Diambil",
    status: "warning",
    statusLabel: "Terlambat",
  },
];

export function getHarvestScheduleById(id: string) {
  return harvestSchedules.find((schedule) => schedule.id === id);
}

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

export function getHarvestScheduleDetail(id: string): HarvestScheduleDetail | undefined {
  const schedule = getHarvestScheduleById(id);
  if (!schedule) {
    return undefined;
  }

  if (id === "jadwal-001") {
    return {
      ...schedule,
      intervalDays: 7,
      landmark: "Dekat jembatan kecil",
      note: "Panen diperkirakan siap mulai pagi hari.",
      nextDate: "22 September 2026",
      nextDateISO: "2026-09-22",
    };
  }

  return {
    ...schedule,
    intervalDays: 7,
    landmark: "Patokan kebun petani",
    note: "Jadwal panen mengikuti interval siklus yang telah disepakati.",
    nextDate: "22 September 2026",
    nextDateISO: "2026-09-22",
  };
}
