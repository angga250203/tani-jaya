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

export type FarmerTransaction = {
  date: string;
  commodity: string;
  weightKg: number;
};
