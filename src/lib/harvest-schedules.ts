export type HarvestScheduleStatus = "today" | "upcoming" | "warning";

export type HarvestSchedule = {
  id: string;
  cycleId?: string;
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

export type HarvestScheduleDetail = HarvestSchedule & {
  intervalDays: number;
  landmark: string;
  note: string;
  nextDate: string;
  nextDateISO: string;
};

export const harvestSchedules: HarvestSchedule[] = [
  {
    id: "jadwal-001",
    cycleId: "siklus-001",
    farmer: "Budi Santoso",
    initials: "BS",
    commodity: "Cabai Rawit",
    field: "Lahan Utara",
    date: "15 September 2026",
    dateISO: "2026-09-15",
    method: "Diambil",
    status: "today",
    statusLabel: "Hari Ini",
  },
  {
    id: "jadwal-002",
    farmer: "Dewi Ayu",
    initials: "DA",
    commodity: "Sawi Putih",
    field: "Kebun Tengah",
    date: "15 September 2026",
    dateISO: "2026-09-15",
    method: "Diantar",
    status: "today",
    statusLabel: "Hari Ini",
  },
  {
    id: "jadwal-003",
    farmer: "Hasan Basri",
    initials: "HB",
    commodity: "Bayam",
    field: "Lahan Barat",
    date: "15 September 2026",
    dateISO: "2026-09-15",
    method: "Diambil",
    status: "today",
    statusLabel: "Hari Ini",
  },
  {
    id: "jadwal-004",
    cycleId: "siklus-002",
    farmer: "Siti Aminah",
    initials: "SA",
    commodity: "Tomat",
    field: "Lahan Belakang",
    date: "16 September 2026",
    dateISO: "2026-09-16",
    method: "Diantar",
    status: "upcoming",
    statusLabel: "Akan Datang",
    wasPostponed: true,
  },
  {
    id: "jadwal-005",
    farmer: "Wati Lestari",
    initials: "WL",
    commodity: "Kangkung",
    field: "Kebun Sungai",
    date: "17 September 2026",
    dateISO: "2026-09-17",
    method: "Diantar",
    status: "upcoming",
    statusLabel: "Akan Datang",
    wasPostponed: true,
  },
  {
    id: "jadwal-006",
    farmer: "Joko Prasetyo",
    initials: "JP",
    commodity: "Terong",
    field: "Kebun Timur",
    date: "18 September 2026",
    dateISO: "2026-09-18",
    method: "Diambil",
    status: "upcoming",
    statusLabel: "Akan Datang",
  },
  {
    id: "jadwal-007",
    farmer: "Yanto Suherman",
    initials: "YS",
    commodity: "Sawi Hijau",
    field: "Lahan Utara",
    date: "19 September 2026",
    dateISO: "2026-09-19",
    method: "Diambil",
    status: "upcoming",
    statusLabel: "Akan Datang",
  },
  {
    id: "jadwal-008",
    farmer: "Sri Wahyuni",
    initials: "SW",
    commodity: "Buncis",
    field: "Kebun Lereng",
    date: "20 September 2026",
    dateISO: "2026-09-20",
    method: "Diantar",
    status: "upcoming",
    statusLabel: "Akan Datang",
  },
  {
    id: "jadwal-009",
    farmer: "Roni Kurniawan",
    initials: "RK",
    commodity: "Timun",
    field: "Lahan Selatan",
    date: "21 September 2026",
    dateISO: "2026-09-21",
    method: "Diambil",
    status: "upcoming",
    statusLabel: "Akan Datang",
  },
  {
    id: "jadwal-010",
    farmer: "Maya Sari",
    initials: "MS",
    commodity: "Selada",
    field: "Kebun Tengah",
    date: "23 September 2026",
    dateISO: "2026-09-23",
    method: "Diantar",
    status: "upcoming",
    statusLabel: "Akan Datang",
  },
  {
    id: "jadwal-011",
    farmer: "Dedi Irawan",
    initials: "DI",
    commodity: "Cabai Besar",
    field: "Lahan Barat",
    date: "25 September 2026",
    dateISO: "2026-09-25",
    method: "Diambil",
    status: "upcoming",
    statusLabel: "Akan Datang",
  },
  {
    id: "jadwal-012",
    farmer: "Agus Rahman",
    initials: "AR",
    commodity: "Cabai Besar",
    field: "Lahan Sungai",
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
