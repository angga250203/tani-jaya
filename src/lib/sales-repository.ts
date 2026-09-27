import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json, Tables } from "@/types/database.types";
import type { SaleCorrectionInput, SaleCreateInput, SaleRecord, SaleStockAllocation } from "@/lib/sales";
import type { StockContainer, StockSource } from "@/lib/stocks";

type SaleRow = Tables<"sales">;
type SaleItemRow = Tables<"sale_items">;
type AllocationRow = Tables<"sale_stock_allocations">;
type PaymentRow = Tables<"sale_payments">;
type ChangeRow = Tables<"sale_change_events">;
type FarmerRow = Pick<Tables<"farmers">, "id" | "name">;
type SourceItemRow = Pick<Tables<"transaction_items">, "id" | "transaction_id" | "weighing_method"> & {
  transactions: Pick<Tables<"transactions">, "seller_type" | "seller_name_snapshot" | "farmer_id"> | null;
  transaction_container_weights: Pick<Tables<"transaction_container_weights">, "id" | "sequence_number" | "weight_kg">[];
};

type SaleGraphRow = SaleRow & {
  sale_items: Array<SaleItemRow & { sale_stock_allocations: AllocationRow[] }>;
  sale_payments: PaymentRow[];
  sale_change_events: ChangeRow[];
};

type PaymentStateRow = Tables<"sale_payment_states">;
type DirectStockRow = Tables<"available_sale_direct_stock">;
type ContainerStockRow = Tables<"available_sale_container_stock">;
type ContainerPurchaseItemRow = Pick<Tables<"transaction_items">, "id" | "transaction_id" | "commodity" | "grade" | "weighing_method" | "gross_weight_kg"> & {
  transaction_container_weights: Pick<Tables<"transaction_container_weights">, "id" | "sequence_number" | "weight_kg" | "container_type">[];
};
type ActiveAllocationRow = Pick<Tables<"sale_stock_allocations">, "purchase_item_id" | "purchase_container_weight_id" | "allocated_gross_weight_kg">;

type SourceContext = {
  transactionId: string;
  sellerType: "PETANI_MITRA" | "PENJUAL_UMUM";
  sellerName: string;
  farmerId?: string;
  weighingMethod: SaleStockAllocation["weighingMethod"];
  containers: Map<string, { label: string; weightKg: number }>;
};

const asNumber = (value: number | string | null | undefined) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const sellerType = (value: string | null): "PETANI_MITRA" | "PENJUAL_UMUM" => value === "partner_farmer" ? "PETANI_MITRA" : "PENJUAL_UMUM";
const weighingMethod = (value: string): SaleStockAllocation["weighingMethod"] => value === "per_sack" ? "PER_KARUNG" : value === "per_crate" ? "PER_PETI" : "TOTAL_LANGSUNG";
const buyerType = (value: string): SaleRecord["buyerType"] => value === "market" ? "MARKET" : value === "weigher_collector" ? "WEIGHER_COLLECTOR" : "GENERAL_BUYER";
const deliveryMethod = (value: string): SaleRecord["deliveryMethod"] => value === "expedition" ? "EXPEDITION" : "BUYER_PICKUP";
const lifecycleStatus = (value: string): SaleRecord["lifecycleStatus"] => value === "cancelled" ? "CANCELLED" : "ACTIVE";
const grade = (value: string): "SP" | "TG" | "BR" => value === "TG" || value === "BR" ? value : "SP";

function errorText(error: unknown) {
  if (typeof error === "object" && error !== null) return ["message", "details", "hint", "code"].map((key) => String(Reflect.get(error, key) ?? "")).join(" ");
  return String(error ?? "");
}

export function saleErrorMessage(error: unknown) {
  const details = errorText(error).toLowerCase();
  if (details.includes("direct stock allocation exceeds")) return "Stok timbang langsung sudah tidak mencukupi. Muat ulang stok lalu coba lagi.";
  if (details.includes("container allocation") || details.includes("container") && details.includes("allocated")) return "Karung atau peti yang dipilih sudah tidak tersedia. Muat ulang stok lalu coba lagi.";
  if (details.includes("cannot exceed") && details.includes("payment")) return "Nominal pembayaran tidak boleh melebihi sisa piutang.";
  if (details.includes("cannot be below cash")) return "Total koreksi tidak boleh lebih kecil dari pembayaran yang sudah diterima.";
  if (details.includes("only an active sale")) return "Penjualan yang dibatalkan tidak dapat diubah.";
  if (details.includes("payment history cannot be permanently deleted")) return "Penjualan dengan riwayat pembayaran tidak dapat dihapus permanen.";
  if (details.includes("invalid") || details.includes("must")) return "Data Penjualan belum valid. Periksa kembali stok, harga, dan pembayaran.";
  return "Penjualan belum dapat diproses. Coba lagi.";
}

async function readFarmers(client: SupabaseClient<Database>, ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  const { data, error } = await client.from("farmers").select("id, name").in("id", ids);
  if (error) throw error;
  return new Map(((data ?? []) as FarmerRow[]).map((farmer) => [farmer.id, farmer.name]));
}

async function readSourceContexts(client: SupabaseClient<Database>, itemIds: string[]) {
  if (!itemIds.length) return new Map<string, SourceContext>();
  const { data, error } = await client
    .from("transaction_items")
    .select("id, transaction_id, weighing_method, transactions!transaction_items_transaction_id_fkey(seller_type, seller_name_snapshot, farmer_id), transaction_container_weights(id, sequence_number, weight_kg)")
    .in("id", itemIds);
  if (error) throw error;
  const rows = (data ?? []) as unknown as SourceItemRow[];
  const farmerNames = await readFarmers(client, [...new Set(rows.flatMap((row) => row.transactions?.farmer_id ? [row.transactions.farmer_id] : []))]);
  return new Map(rows.map((row) => {
    const transaction = row.transactions;
    const farmerId = transaction?.farmer_id ?? undefined;
    const name = farmerId ? farmerNames.get(farmerId) ?? "Petani Mitra" : transaction?.seller_name_snapshot || "Penjual Umum";
    const prefix = row.weighing_method === "per_sack" ? "Karung" : "Peti";
    const containers = new Map(row.transaction_container_weights.map((container) => [container.id, { label: `${prefix} ${container.sequence_number}`, weightKg: asNumber(container.weight_kg) }]));
    return [row.id, {
      transactionId: row.transaction_id,
      sellerType: sellerType(transaction?.seller_type ?? null),
      sellerName: name,
      farmerId,
      weighingMethod: weighingMethod(row.weighing_method),
      containers,
    }] as const;
  }));
}

function mapSale(row: SaleGraphRow, states: Map<string, PaymentStateRow>, contexts: Map<string, SourceContext>): SaleRecord {
  const allocations = row.sale_items.flatMap((item) => item.sale_stock_allocations.map((allocation) => {
    const context = contexts.get(allocation.purchase_item_id);
    const container = allocation.purchase_container_weight_id ? context?.containers.get(allocation.purchase_container_weight_id) : undefined;
    return {
      id: allocation.id,
      saleItemId: allocation.sale_item_id,
      sourceId: allocation.purchase_item_id,
      purchaseItemId: allocation.purchase_item_id,
      sellerType: context?.sellerType ?? "PENJUAL_UMUM",
      sellerName: context?.sellerName ?? "Sumber Pembelian",
      farmerId: context?.farmerId,
      commodity: item.commodity,
      grade: grade(item.grade),
      weighingMethod: context?.weighingMethod ?? "TOTAL_LANGSUNG",
      purchaseContainerId: allocation.purchase_container_weight_id ?? undefined,
      purchaseContainerLabel: container?.label,
      allocatedGrossWeightKg: asNumber(allocation.allocated_gross_weight_kg),
      releasedAt: allocation.released_at ?? undefined,
      releaseReason: allocation.release_reason ?? undefined,
    } satisfies SaleStockAllocation;
  }));
  const state = states.get(row.id);
  return {
    id: row.id,
    saleNumber: row.sale_number,
    saleDate: row.sale_date,
    buyerName: row.buyer_name,
    buyerType: buyerType(row.buyer_type),
    deliveryMethod: deliveryMethod(row.delivery_method),
    lifecycleStatus: lifecycleStatus(row.status),
    cancellationReason: row.cancellation_reason ?? undefined,
    expeditionName: row.expedition_name ?? undefined,
    expeditionRatePerKg: row.expedition_rate_per_kg === null ? undefined : asNumber(row.expedition_rate_per_kg),
    totalPaidAmount: state?.total_paid_amount === null || state?.total_paid_amount === undefined ? undefined : asNumber(state.total_paid_amount),
    remainingBalanceAmount: state?.remaining_balance_amount === null || state?.remaining_balance_amount === undefined ? undefined : asNumber(state.remaining_balance_amount),
    effectivePaymentStatus: state?.effective_payment_status === "paid" ? "PAID" : state?.effective_payment_status === "cancelled" ? "CANCELLED" : "UNPAID",
    items: row.sale_items.map((item) => ({
      id: item.id,
      commodity: item.commodity,
      grade: grade(item.grade),
      grossWeightKg: asNumber(item.gross_weight_kg),
      deductionWeightKg: asNumber(item.deduction_weight_kg),
      netWeightKg: asNumber(item.net_weight_kg),
      pricePerKg: asNumber(item.price_per_kg),
      subtotal: asNumber(item.subtotal),
    })),
    payments: [...row.sale_payments]
      .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
      .map((payment) => ({ id: payment.id, paymentDate: payment.payment_date, amount: asNumber(payment.amount), remainingBalanceAfter: asNumber(payment.remaining_balance_after), createdAt: payment.created_at })),
    changeEvents: [...row.sale_change_events]
      .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
      .map((event) => ({ id: event.id, eventType: event.event_type === "cancelled" ? "CANCELLED" : "CORRECTED", reason: event.reason, occurredAt: event.created_at })),
    allocations,
  };
}

export async function readSales(client: SupabaseClient<Database>) {
  const { data, error } = await client
    .from("sales")
    .select("*, sale_items(*, sale_stock_allocations(*)), sale_payments(*), sale_change_events(*)")
    .order("sale_date", { ascending: false })
    .order("sale_number", { ascending: false });
  if (error) return { data: undefined, error: saleErrorMessage(error) };
  const rows = (data ?? []) as unknown as SaleGraphRow[];
  const ids = rows.map((row) => row.id);
  const [stateResult, contexts] = await Promise.all([
    ids.length ? client.from("sale_payment_states").select("*").in("sale_id", ids) : Promise.resolve({ data: [], error: null }),
    readSourceContexts(
      client,
      [...new Set(rows.flatMap((row) => row.sale_items.flatMap((item) => item.sale_stock_allocations.map((allocation) => allocation.purchase_item_id))))],
    ),
  ]);
  if (stateResult.error) return { data: undefined, error: saleErrorMessage(stateResult.error) };
  const states = new Map(((stateResult.data ?? []) as PaymentStateRow[]).flatMap((state) => state.sale_id ? [[state.sale_id, state] as const] : []));
  return { data: rows.map((row) => mapSale(row, states, contexts)), error: undefined };
}

export async function readStockSources(client: SupabaseClient<Database>) {
  const [directResult, containerResult, containerItemsResult, allocationsResult] = await Promise.all([
    client.from("available_sale_direct_stock").select("*"),
    client.from("available_sale_container_stock").select("*"),
    client.from("transaction_items").select("id, transaction_id, commodity, grade, weighing_method, gross_weight_kg, transaction_container_weights(id, sequence_number, weight_kg, container_type)").in("weighing_method", ["per_sack", "per_crate"]),
    client.from("sale_stock_allocations").select("purchase_item_id, purchase_container_weight_id, allocated_gross_weight_kg").is("released_at", null),
  ]);
  if (directResult.error) return { data: undefined, error: saleErrorMessage(directResult.error) };
  if (containerResult.error) return { data: undefined, error: saleErrorMessage(containerResult.error) };
  if (containerItemsResult.error) return { data: undefined, error: saleErrorMessage(containerItemsResult.error) };
  if (allocationsResult.error) return { data: undefined, error: saleErrorMessage(allocationsResult.error) };
  const direct = (directResult.data ?? []) as DirectStockRow[];
  const containers = (containerResult.data ?? []) as ContainerStockRow[];
  const containerItems = (containerItemsResult.data ?? []) as unknown as ContainerPurchaseItemRow[];
  const activeAllocations = (allocationsResult.data ?? []) as ActiveAllocationRow[];
  const transactionIds = [...new Set([...direct.map((row) => row.purchase_transaction_id), ...containers.map((row) => row.purchase_transaction_id), ...containerItems.map((row) => row.transaction_id)].filter((id): id is string => Boolean(id)))];
  const { data: transactions, error: transactionError } = transactionIds.length
    ? await client.from("transactions").select("id, transaction_number, transaction_date, farmer_id, seller_type, seller_name_snapshot").in("id", transactionIds)
    : { data: [], error: null };
  if (transactionError) return { data: undefined, error: saleErrorMessage(transactionError) };
  const rows = (transactions ?? []) as Array<Pick<Tables<"transactions">, "id" | "transaction_number" | "transaction_date" | "farmer_id" | "seller_type" | "seller_name_snapshot">>;
  const farmerNames = await readFarmers(client, [...new Set(rows.flatMap((row) => row.farmer_id ? [row.farmer_id] : []))]);
  const transactionById = new Map(rows.map((row) => [row.id, row]));
  const sourceName = (transactionId: string | null, snapshot: string | null, farmerId: string | null) => farmerId ? farmerNames.get(farmerId) ?? "Petani Mitra" : snapshot || transactionById.get(transactionId ?? "")?.seller_name_snapshot || "Penjual Umum";
  const sources = new Map<string, StockSource>();
  direct.forEach((row) => {
    if (!row.purchase_item_id || !row.purchase_transaction_id || !row.commodity || !row.grade) return;
    const transaction = transactionById.get(row.purchase_transaction_id);
    sources.set(row.purchase_item_id, {
      id: row.purchase_item_id,
      purchaseTransactionId: row.purchase_transaction_id,
      purchaseItemId: row.purchase_item_id,
      purchaseReference: transaction?.transaction_number ?? row.purchase_transaction_id,
      purchaseDate: transaction?.transaction_date ?? "",
      sellerType: sellerType(row.seller_type),
      sellerName: sourceName(row.purchase_transaction_id, row.seller_name_snapshot, row.farmer_id),
      farmerId: row.farmer_id ?? undefined,
      commodity: row.commodity,
      grade: grade(row.grade),
      weighingMethod: "TOTAL_LANGSUNG",
      grossIncomingWeightKg: asNumber(row.gross_weight_kg),
      activeAllocatedWeightKg: asNumber(row.allocated_gross_weight_kg),
    });
  });
  const allocatedContainerIds = new Set(activeAllocations.flatMap((allocation) => allocation.purchase_container_weight_id ? [allocation.purchase_container_weight_id] : []));
  containerItems.forEach((item) => {
    const transaction = transactionById.get(item.transaction_id);
    if (!transaction) return;
    const itemContainers: StockContainer[] = item.transaction_container_weights.map((container) => ({
      id: container.id,
      label: `${container.container_type === "sack" ? "Karung" : "Peti"} ${container.sequence_number}`,
      weightKg: asNumber(container.weight_kg),
      status: allocatedContainerIds.has(container.id) ? "allocated" : "available",
    }));
    if (!itemContainers.some((container) => container.status === "available")) return;
    sources.set(item.id, {
      id: item.id,
      purchaseTransactionId: item.transaction_id,
      purchaseItemId: item.id,
      purchaseReference: transaction.transaction_number,
      purchaseDate: transaction.transaction_date,
      sellerType: sellerType(transaction.seller_type),
      sellerName: sourceName(item.transaction_id, transaction.seller_name_snapshot, transaction.farmer_id),
      farmerId: transaction.farmer_id ?? undefined,
      commodity: item.commodity,
      grade: grade(item.grade),
      weighingMethod: weighingMethod(item.weighing_method),
      grossIncomingWeightKg: itemContainers.reduce((sum, container) => sum + container.weightKg, 0),
      activeAllocatedWeightKg: activeAllocations.filter((allocation) => allocation.purchase_item_id === item.id).reduce((sum, allocation) => sum + asNumber(allocation.allocated_gross_weight_kg), 0),
      containers: itemContainers,
    });
  });
  return { data: [...sources.values()], error: undefined };
}

function toRpcItems(items: SaleCreateInput["items"] | SaleCorrectionInput["items"], allocations: SaleStockAllocation[]): Json {
  return items.map((item) => ({
    commodity: item.commodity,
    grade: item.grade,
    deduction_weight_kg: item.deductionWeightKg,
    price_per_kg: item.pricePerKg,
    allocations: allocations.filter((allocation) => allocation.commodity === item.commodity && allocation.grade === item.grade && !allocation.releasedAt).map((allocation) => ({
      purchase_item_id: allocation.purchaseItemId,
      purchase_container_weight_id: allocation.purchaseContainerId ?? null,
      allocated_gross_weight_kg: allocation.allocatedGrossWeightKg,
    })),
  })) as Json;
}

export function createSaleArgs(input: SaleCreateInput) {
  return {
    p_sale_date: input.saleDate,
    p_buyer_name: input.buyerName.trim(),
    p_buyer_type: input.buyerType === "MARKET" ? "market" : input.buyerType === "WEIGHER_COLLECTOR" ? "weigher_collector" : "general_buyer",
    p_delivery_method: input.deliveryMethod === "EXPEDITION" ? "expedition" : "buyer_pickup",
    // The applied RPC validates pickup by requiring these SQL values to be NULL.
    p_expedition_name: input.deliveryMethod === "EXPEDITION" ? input.expeditionName?.trim() || "" : null,
    p_expedition_rate_per_kg: input.deliveryMethod === "EXPEDITION" ? input.expeditionRatePerKg ?? 0 : null,
    p_items: toRpcItems(input.items, input.allocations),
    p_initial_payment_amount: input.initialPayment,
  };
}

export function correctSaleArgs(saleId: string, input: SaleCorrectionInput) {
  return {
    p_sale_id: saleId,
    p_buyer_name: input.buyerName.trim(),
    p_buyer_type: input.buyerType === "MARKET" ? "market" : input.buyerType === "WEIGHER_COLLECTOR" ? "weigher_collector" : "general_buyer",
    p_delivery_method: input.deliveryMethod === "EXPEDITION" ? "expedition" : "buyer_pickup",
    p_expedition_name: input.deliveryMethod === "EXPEDITION" ? input.expeditionName?.trim() || "" : null,
    p_expedition_rate_per_kg: input.deliveryMethod === "EXPEDITION" ? input.expeditionRatePerKg ?? 0 : null,
    p_items: toRpcItems(input.items, input.allocations),
    p_reason: input.reason.trim(),
  };
}
