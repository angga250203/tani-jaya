export type FarmerStatus = "active" | "inactive";

export type Farmer = {
  id: string;
  name: string;
  initials: string;
  whatsapp: string;
  landmark: string;
  note: string;
  status: FarmerStatus;
  fieldCount: number;
};

export type FarmerField = {
  id: string;
  name: string;
  landmark: string;
  commodity: string;
  harvestIntervalDays: number;
  nextHarvest: string;
};

export type FarmerTransaction = {
  date: string;
  commodity: string;
  weightKg: number;
};

export type FarmerDetail = Farmer & {
  gardenDescription: string;
  activeCycleCount: number;
  ongoingAdvance: number;
  monthlyTransactionCount: number;
  fields: FarmerField[];
  recentTransactions: FarmerTransaction[];
};

export const farmers: Farmer[] = [
  {
    id: "petani-001",
    name: "Budi Santoso",
    initials: "BS",
    whatsapp: "0812 3456 7890",
    landmark: "Dekat jembatan kecil, masuk sekitar 300 meter dari jalan utama.",
    note: "Biasanya panen dilakukan pagi hari.",
    status: "active",
    fieldCount: 2,
  },
  {
    id: "petani-002",
    name: "Siti Aminah",
    initials: "SA",
    whatsapp: "0813 7654 2211",
    landmark: "Belakang pasar desa",
    note: "Akses kebun melalui jalan samping pasar.",
    status: "active",
    fieldCount: 1,
  },
  {
    id: "petani-003",
    name: "Joko Prasetyo",
    initials: "JP",
    whatsapp: "0852 4433 1200",
    landmark: "Jalan kebun sebelah timur",
    note: "Memiliki beberapa lahan dengan komoditas berbeda.",
    status: "active",
    fieldCount: 3,
  },
  {
    id: "petani-004",
    name: "Agus Rahman",
    initials: "AR",
    whatsapp: "0821 9932 1180",
    landmark: "Dekat sungai",
    note: "Mitra dinonaktifkan; riwayat tetap tersimpan.",
    status: "inactive",
    fieldCount: 1,
  },
];

export function getFarmerById(id: string) {
  return farmers.find((farmer) => farmer.id === id);
}

export function getFarmerDetailById(id: string): FarmerDetail | undefined {
  const farmer = getFarmerById(id);
  if (!farmer) {
    return undefined;
  }

  if (id === "petani-001") {
    return {
      ...farmer,
      gardenDescription: "Dekat jembatan kecil, masuk sekitar 300 meter dari jalan utama.",
      activeCycleCount: 2,
      ongoingAdvance: 250_000,
      monthlyTransactionCount: 3,
      fields: [
        {
          id: "lahan-001",
          name: "Lahan Utara",
          landmark: "Sebelah utara rumah",
          commodity: "Cabai Rawit",
          harvestIntervalDays: 7,
          nextHarvest: "22 September 2026",
        },
        {
          id: "lahan-002",
          name: "Lahan Selatan",
          landmark: "Dekat saluran irigasi",
          commodity: "Tomat",
          harvestIntervalDays: 5,
          nextHarvest: "24 September 2026",
        },
      ],
      recentTransactions: [
        { date: "15 September 2026", commodity: "Cabai Rawit", weightKg: 120 },
        { date: "8 September 2026", commodity: "Cabai Rawit", weightKg: 105 },
        { date: "3 September 2026", commodity: "Tomat", weightKg: 88 },
      ],
    };
  }

  return {
    ...farmer,
    gardenDescription: farmer.landmark,
    activeCycleCount: farmer.status === "active" ? 1 : 0,
    ongoingAdvance: 0,
    monthlyTransactionCount: 0,
    fields: [],
    recentTransactions: [],
  };
}
