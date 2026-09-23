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
