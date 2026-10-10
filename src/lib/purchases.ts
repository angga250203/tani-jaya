import type { SupabaseClient } from "@supabase/supabase-js";
import type { TransactionFormValues } from "@/lib/validations";
import type { Database, Json, Tables } from "@/types/database.types";
import type { EffectivePaymentStatus, PaymentStatus, PurchaseGrade, SellerType, TransactionRecord, WeighingMethod } from "@/lib/transactions";

type TransactionRow = Tables<"transactions">;
type TransactionItemRow = Tables<"transaction_items">;
type ContainerRow = Tables<"transaction_container_weights">;
type FarmerRow = Tables<"farmers">;
type CycleRow = Tables<"harvest_cycles">;
type ScheduleRow = Tables<"harvest_schedules">;
type TotalanTransactionRow = Tables<"totalan_transactions">;
type TotalanRow = Tables<"totalans">;

type PurchaseReadRow = TransactionRow & {
  farmers: Pick<FarmerRow, "id" | "name"> | null;
  harvest_cycles: Pick<CycleRow, "id" | "field_id" | "commodity"> | null;
  harvest_schedules: Pick<ScheduleRow, "id" | "cycle_id" | "scheduled_date"> | null;
  transaction_items: Array<TransactionItemRow & {
    transaction_container_weights: ContainerRow[];
  }>;
  totalan_transactions: (Pick<TotalanTransactionRow, "totalan_id"> & {
    totalans: Pick<TotalanRow, "id" | "status" | "totalan_number" | "totalan_date" | "finalized_at"> | null;
  }) | null;
};

export const purchaseSelect = `
  id,
  transaction_number,
  transaction_date,
  transaction_time,
  seller_type,
  farmer_id,
  seller_name_snapshot,
  schedule_id,
  cycle_id,
  payment_status,
  notes,
  total_net_weight_kg,
  total_amount,
  farmers!transactions_farmer_id_fkey(id, name),
  harvest_cycles!transactions_cycle_id_fkey(id, field_id, commodity),
  harvest_schedules!transactions_schedule_id_fkey(id, cycle_id, scheduled_date),
  totalan_transactions(
    totalan_id,
    totalans!totalan_transactions_totalan_id_fkey(id, status, totalan_number, totalan_date, finalized_at)
  ),
  transaction_items(
    id,
    commodity,
    grade,
    weighing_method,
    gross_weight_kg,
    deduction_weight_kg,
    net_weight_kg,
    price_per_kg,
    subtotal,
    created_at,
    transaction_container_weights(id, sequence_number, weight_kg, container_type)
  )
`;

function numberValue(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

function sellerType(value: string): SellerType {
  return value === "partner_farmer" ? "PETANI_MITRA" : "PENJUAL_UMUM";
}

function paymentStatus(value: string): PaymentStatus {
  return value === "paid" ? "PAID" : "UNPAID";
}

function purchaseGrade(value: string): PurchaseGrade {
  return value === "SP" || value === "TG" || value === "BR" ? value : "BR";
}

function weighingMethod(value: string): WeighingMethod {
  if (value === "per_sack") return "PER_KARUNG";
  if (value === "per_crate") return "PER_PETI";
  return "TOTAL_LANGSUNG";
}

function rawTimeToDisplay(time: string | null) {
  return time ? `${time.slice(0, 5).replace(":", ".")} WIB` : "";
}

export function toPurchaseRecord(row: PurchaseReadRow, paymentStates: ReadonlyMap<string, EffectivePaymentStatus> = new Map()): TransactionRecord {
  const items = [...(row.transaction_items ?? [])]
    .sort((left, right) => left.created_at.localeCompare(right.created_at))
    .map((item) => {
      const containers = [...(item.transaction_container_weights ?? [])]
        .sort((left, right) => left.sequence_number - right.sequence_number);

      return {
        id: item.id,
        commodity: item.commodity,
        grade: purchaseGrade(item.grade),
        weighingMethod: weighingMethod(item.weighing_method),
        containerWeights: containers.map((container) => numberValue(container.weight_kg)),
        containerIds: containers.map((container) => container.id),
        grossWeight: numberValue(item.gross_weight_kg),
        deduction: numberValue(item.deduction_weight_kg),
        netWeight: numberValue(item.net_weight_kg),
        pricePerKg: numberValue(item.price_per_kg),
        subtotal: numberValue(item.subtotal),
      };
    });

  // `totalan_transactions.transaction_id` is unique, so PostgREST embeds this
  // reverse relationship as a to-one object (or null), not an array.
  const totalanMembership = row.totalan_transactions ?? undefined;
  const totalan = totalanMembership?.totalans;
  const finalizedTotalan = totalan?.status === "finalized"
    ? { id: totalan.id, number: totalan.totalan_number ?? undefined, totalanDate: totalan.totalan_date, finalizedAt: totalan.finalized_at }
    : undefined;
  const effectivePaymentStatus: EffectivePaymentStatus = finalizedTotalan
    ? "INCLUDED_IN_TOTALAN"
    : paymentStates.get(row.id) ?? paymentStatus(row.payment_status);

  return {
    id: row.id,
    transactionNumber: row.transaction_number,
    transactionDate: row.transaction_date,
    transactionTime: rawTimeToDisplay(row.transaction_time),
    transactionTimeRaw: row.transaction_time ?? undefined,
    sellerType: sellerType(row.seller_type),
    farmerId: row.farmer_id ?? undefined,
    sellerName: row.farmers?.name ?? row.seller_name_snapshot,
    scheduleId: row.schedule_id ?? undefined,
    scheduleDate: row.harvest_schedules?.scheduled_date ?? undefined,
    fieldId: row.harvest_cycles?.field_id ?? undefined,
    cycleId: row.cycle_id ?? row.harvest_schedules?.cycle_id ?? undefined,
    cycleCommodity: row.harvest_cycles?.commodity ?? undefined,
    paymentStatus: paymentStatus(row.payment_status),
    effectivePaymentStatus,
    totalanId: totalanMembership?.totalan_id,
    finalizedTotalan,
    notes: row.notes ?? "",
    items,
    totalNetWeight: numberValue(row.total_net_weight_kg),
    totalAmount: numberValue(row.total_amount),
  };
}

export async function readPurchases(client: SupabaseClient<Database>) {
  const [purchasesResult, paymentStatesResult] = await Promise.all([
    client
      .from("transactions")
      .select(purchaseSelect)
      .order("transaction_date", { ascending: false })
      .order("transaction_number", { ascending: false }),
    client.from("transaction_payment_states").select("transaction_id, effective_payment_status"),
  ]);

  const error = purchasesResult.error ?? paymentStatesResult.error;
  if (error) return { data: undefined, error: purchaseErrorMessage(error) };

  const paymentStates = new Map<string, EffectivePaymentStatus>();
  for (const state of paymentStatesResult.data ?? []) {
    if (!state.transaction_id) continue;
    paymentStates.set(state.transaction_id, state.effective_payment_status === "included_in_totalan"
      ? "INCLUDED_IN_TOTALAN"
      : state.effective_payment_status === "paid" ? "PAID" : "UNPAID");
  }

  return { data: (purchasesResult.data as unknown as PurchaseReadRow[]).map((row) => toPurchaseRecord(row, paymentStates)), error: undefined };
}

function toRpcWeighingMethod(method: WeighingMethod) {
  return method === "PER_KARUNG" ? "per_sack" : method === "PER_PETI" ? "per_crate" : "direct_total";
}

function integerValue(value: number | undefined) {
  return typeof value === "number" && Number.isInteger(value) ? value : 0;
}

/** Maps validated UI state to the exact JSONB contract of the Purchase RPCs. */
export function toPurchasePayload(values: TransactionFormValues): Json {
  const partnerFarmer = values.sellerType === "PETANI_MITRA";

  return {
    transaction_date: values.transactionDate,
    transaction_time: values.transactionTime ?? null,
    seller_type: partnerFarmer ? "partner_farmer" : "general_seller",
    farmer_id: partnerFarmer ? values.farmerId || null : null,
    seller_name_snapshot: partnerFarmer ? null : values.sellerName?.trim() || null,
    cycle_id: partnerFarmer ? values.cycleId || null : null,
    schedule_id: partnerFarmer ? values.scheduleId || null : null,
    payment_status: partnerFarmer ? values.paymentStatus === "PAID" ? "paid" : "unpaid" : "paid",
    notes: values.notes?.trim() || null,
    items: values.items.map((item) => {
      const containers = item.weighingMethod === "TOTAL_LANGSUNG"
        ? []
        : (item.containers ?? []).map((container, index) => ({
          id: container.id ?? null,
          sequence_number: index + 1,
          weight_kg: integerValue(container.weight),
        }));
      const grossWeight = item.weighingMethod === "TOTAL_LANGSUNG"
        ? integerValue(item.grossWeight)
        : containers.reduce((total, container) => total + container.weight_kg, 0);

      return {
        id: item.id ?? null,
        commodity: item.commodity.trim(),
        grade: item.grade,
        weighing_method: toRpcWeighingMethod(item.weighingMethod),
        gross_weight_kg: grossWeight,
        deduction_weight_kg: integerValue(item.deduction),
        price_per_kg: integerValue(item.pricePerKg),
        containers,
      };
    }),
  };
}

export function purchaseErrorMessage(error: unknown) {
  const details = typeof error === "object" && error !== null
    ? ["message", "details", "hint", "code"].map((key) => String(Reflect.get(error, key) ?? "")).join(" ")
    : String(error ?? "");

  if (details.includes("INVALID_GRADE")) {
    return "Grade Pembelian harus SP, TG, atau BR.";
  }

  if (details.includes("INVALID_CONTAINER_TOTAL")) return "Total berat wadah harus sama dengan berat kotor dan setiap wadah harus valid.";
  if (details.includes("INVALID_SELLER")) return "Data penjual atau petani tidak sesuai dengan konteks Pembelian.";
  if (details.includes("PURCHASE_FINALIZED_TOTALAN")) return "Pembelian ini sudah masuk Totalan final dan tidak dapat diedit.";
  if (details.includes("PURCHASE_ITEM_USED_BY_SALE")) return "Sumber Pembelian ini sudah memiliki riwayat alokasi Penjualan. Komoditas, grade, penjual, metode, dan berat fisiknya tidak dapat diubah.";
  if (details.includes("PURCHASE_NOT_FOUND")) return "Pembelian tidak ditemukan atau tidak dapat diakses.";
  if (details.includes("PURCHASE_NUMBER_EXHAUSTED")) return "Nomor Pembelian untuk hari ini sudah mencapai batas. Hubungi administrator.";
  if (details.includes("INVALID_PURCHASE_PAYLOAD")) return "Data Pembelian tidak valid. Periksa tanggal, grade, berat, potongan, dan harga.";
  return "Pembelian belum dapat diproses. Periksa koneksi lalu coba lagi.";
}
