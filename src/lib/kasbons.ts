export type KasbonEntryType = "GIVEN" | "TOTALAN_DEDUCTION";

export type KasbonEntry = {
  id: string;
  farmerId: string;
  date: string;
  type: KasbonEntryType;
  amount: number;
  note?: string;
  relatedTotalanId?: string;
  createdAt: string;
};

export const initialKasbonEntries: KasbonEntry[] = [
  {
    id: "kasbon-entry-001",
    farmerId: "petani-001",
    date: "2026-09-01",
    type: "GIVEN",
    amount: 500_000,
    note: "Keperluan pupuk",
    createdAt: "2026-09-01T08:30:00+07:00",
  },
  {
    id: "kasbon-entry-002",
    farmerId: "petani-001",
    date: "2026-09-07",
    type: "GIVEN",
    amount: 750_000,
    note: "Biaya pekerja",
    createdAt: "2026-09-07T09:15:00+07:00",
  },
  {
    id: "kasbon-entry-003",
    farmerId: "petani-001",
    date: "2026-09-16",
    type: "TOTALAN_DEDUCTION",
    amount: 1_000_000,
    note: "Potongan saat totalan selesai",
    relatedTotalanId: "totalan-001",
    createdAt: "2026-09-16T12:00:00+07:00",
  },
  {
    id: "kasbon-entry-004",
    farmerId: "petani-004",
    date: "2026-08-28",
    type: "GIVEN",
    amount: 150_000,
    note: "Keperluan benih sebelum mitra dinonaktifkan.",
    createdAt: "2026-08-28T10:00:00+07:00",
  },
];

export function isKasbonCredit(entry: Pick<KasbonEntry, "type">) {
  return entry.type === "GIVEN";
}

export function calculateKasbonBalance(entries: Pick<KasbonEntry, "type" | "amount">[]) {
  return entries.reduce((balance, entry) => balance + (isKasbonCredit(entry) ? entry.amount : -entry.amount), 0);
}

export function calculateKasbonBalances(entries: KasbonEntry[]) {
  return entries.reduce<Record<string, number>>((balances, entry) => {
    balances[entry.farmerId] = (balances[entry.farmerId] ?? 0) + (isKasbonCredit(entry) ? entry.amount : -entry.amount);
    return balances;
  }, {});
}

export function getKasbonTotals(entries: KasbonEntry[]) {
  return entries.reduce(
    (totals, entry) => {
      if (isKasbonCredit(entry)) totals.given += entry.amount;
      else totals.deducted += entry.amount;
      return totals;
    },
    { given: 0, deducted: 0 },
  );
}

export function kasbonEntryTypeLabel(type: KasbonEntryType) {
  return type === "GIVEN" ? "Kasbon Diberikan" : "Potongan Totalan";
}

export function formatKasbonDate(date: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(`${date}T00:00:00`));
}
