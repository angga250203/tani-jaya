import type { SupabaseClient } from "@supabase/supabase-js";
import { readPurchases } from "@/lib/purchases";
import type { TransactionRecord } from "@/lib/transactions";
import type { Database } from "@/types/database.types";

export type IncludedTransaction = { transactionId: string; transactionDate: string; commoditySummary: string; totalNetWeight: number; totalAmount: number };
export type TotalanRecord = { id: string; number: string | null; totalanDate: string; farmerId: string; farmerName: string; transactions: IncludedTransaction[]; totalTransactions: number; totalNetWeight: number; totalHarvestValue: number; kasbonDeduction: number; finalPayment: number; status: "COMPLETED" };
type Result<T> = { data?: T; error?: string };

export function createIncludedTransaction(transaction: TransactionRecord): IncludedTransaction { return { transactionId: transaction.id, transactionDate: transaction.transactionDate, commoditySummary: transaction.items.map((item) => item.commodity).join(", "), totalNetWeight: transaction.totalNetWeight, totalAmount: transaction.totalAmount }; }
export const calculateSelectedTransactionTotal = (rows: Pick<TransactionRecord, "totalAmount">[]) => rows.reduce((total, row) => total + row.totalAmount, 0);
export const calculateSelectedNetWeight = (rows: Pick<TransactionRecord, "totalNetWeight">[]) => rows.reduce((total, row) => total + row.totalNetWeight, 0);
export const calculateKasbonDeduction = (requested: number, balance: number, total: number) => Math.min(Math.max(0, requested), balance, total);
export const calculateFinalPayment = (total: number, deduction: number) => Math.max(0, total - deduction);

export async function readTotalans(supabase: SupabaseClient<Database>): Promise<Result<TotalanRecord[]>> {
  const [totalansResult, farmersResult, membershipsResult, purchasesResult] = await Promise.all([supabase.from("totalans").select().order("totalan_date", { ascending: false }).order("created_at", { ascending: false }), supabase.from("farmers").select("id, name"), supabase.from("totalan_transactions").select("totalan_id, transaction_id"), readPurchases(supabase)]);
  const error = totalansResult.error ?? farmersResult.error ?? membershipsResult.error ?? purchasesResult.error;
  if (error || !totalansResult.data || !farmersResult.data || !membershipsResult.data || !purchasesResult.data) return { error: typeof error === "string" ? error : error?.message ?? "Data Totalan belum dapat dimuat." };
  const farmers = new Map(farmersResult.data.map((farmer) => [farmer.id, farmer.name])); const purchases = new Map(purchasesResult.data.map((purchase) => [purchase.id, purchase])); const memberships = new Map<string, string[]>();
  membershipsResult.data.forEach((row) => memberships.set(row.totalan_id, [...(memberships.get(row.totalan_id) ?? []), row.transaction_id]));
  return { data: totalansResult.data.map((row) => { const transactions = (memberships.get(row.id) ?? []).map((id) => purchases.get(id)).filter((row): row is TransactionRecord => Boolean(row)).map(createIncludedTransaction); return { id: row.id, number: row.totalan_number, totalanDate: row.totalan_date, farmerId: row.farmer_id, farmerName: farmers.get(row.farmer_id) ?? "Petani", transactions, totalTransactions: transactions.length, totalNetWeight: Number(row.total_net_weight_kg), totalHarvestValue: Number(row.gross_harvest_amount), kasbonDeduction: Number(row.kasbon_deduction_amount), finalPayment: Number(row.final_payment_amount), status: "COMPLETED" }; }) };
}
export const formatTotalanDate = (date: string) => new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${date}T00:00:00`));
