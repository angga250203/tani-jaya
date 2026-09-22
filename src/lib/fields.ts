export type HarvestCycleStatus = "active" | "completed";
export type ReceivingMethod = "DIAMBIL" | "DIANTAR";

export type HarvestHistoryItem = {
  date: string;
  label: string;
  detail?: string;
};

export type HarvestCycle = {
  id: string;
  commodity: string;
  status: HarvestCycleStatus;
  intervalDays: number;
  defaultReceivingMethod: ReceivingMethod;
  createdAt: string;
  firstHarvestAt?: string;
  lastHarvestAt?: string;
  nextHarvest?: string;
  endedAt?: string;
  notes: string;
  harvestHistory: HarvestHistoryItem[];
  period?: string;
};

export type FieldRecord = {
  id: string;
  farmerId: string;
  name: string;
  landmark: string;
  note: string;
  cycles: HarvestCycle[];
};

export const fields: FieldRecord[] = [
  {
    id: "lahan-001",
    farmerId: "petani-001",
    name: "Lahan Utara",
    landmark: "Sebelah utara rumah, dekat jembatan kecil",
    note: "Akses kendaraan bisa sampai ke pinggir lahan.",
    cycles: [
      {
        id: "siklus-001",
        commodity: "Cabai Rawit",
        status: "active",
        intervalDays: 7,
        defaultReceivingMethod: "DIAMBIL",
        createdAt: "10 September 2026",
        firstHarvestAt: "15 September 2026",
        lastHarvestAt: "15 September 2026",
        nextHarvest: "22 September 2026",
        notes: "Kondisi tanaman cukup baik.",
        harvestHistory: [
          { date: "15 September 2026", label: "Panen pertama", detail: "120 kg" },
          { date: "22 September 2026", label: "Jadwal berikutnya" },
        ],
      },
      {
        id: "siklus-history-001",
        commodity: "Cabai Besar",
        status: "completed",
        intervalDays: 7,
        defaultReceivingMethod: "DIAMBIL",
        createdAt: "1 Mei 2026",
        firstHarvestAt: "10 Mei 2026",
        lastHarvestAt: "20 Agustus 2026",
        endedAt: "20 Agustus 2026",
        notes: "Siklus selesai setelah panen terakhir.",
        harvestHistory: [
          { date: "10 Mei 2026", label: "Panen pertama" },
          { date: "20 Agustus 2026", label: "Panen terakhir" },
        ],
        period: "Mei 2026 – Agustus 2026",
      },
    ],
  },
  {
    id: "lahan-002",
    farmerId: "petani-001",
    name: "Lahan Selatan",
    landmark: "Dekat saluran irigasi",
    note: "Akses melalui sisi selatan kebun.",
    cycles: [
      {
        id: "siklus-002",
        commodity: "Tomat",
        status: "active",
        intervalDays: 5,
        defaultReceivingMethod: "DIANTAR",
        createdAt: "8 September 2026",
        firstHarvestAt: "19 September 2026",
        lastHarvestAt: "19 September 2026",
        nextHarvest: "24 September 2026",
        notes: "Panen mengikuti kesiapan buah.",
        harvestHistory: [
          { date: "19 September 2026", label: "Panen pertama", detail: "88 kg" },
          { date: "24 September 2026", label: "Jadwal berikutnya" },
        ],
      },
    ],
  },
];

export function getFieldById(id: string) {
  return fields.find((field) => field.id === id);
}
