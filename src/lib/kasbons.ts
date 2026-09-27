import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
export type KasbonEntryType = "GIVEN" | "TOTALAN_DEDUCTION";
export type KasbonEntry = { id: string; farmerId: string; date: string; type: KasbonEntryType; amount: number; note?: string; relatedTotalanId?: string; createdAt: string };
export const isKasbonCredit = (entry: Pick<KasbonEntry, "type">) => entry.type === "GIVEN";
export const calculateKasbonBalance = (entries: Pick<KasbonEntry, "type" | "amount">[]) => entries.reduce((balance, entry) => balance + (isKasbonCredit(entry) ? entry.amount : -entry.amount), 0);
export const calculateKasbonBalances = (entries: KasbonEntry[]) => entries.reduce<Record<string, number>>((balances, entry) => { balances[entry.farmerId] = (balances[entry.farmerId] ?? 0) + (isKasbonCredit(entry) ? entry.amount : -entry.amount); return balances; }, {});
export const getKasbonTotals = (entries: KasbonEntry[]) => entries.reduce((totals, entry) => { if (isKasbonCredit(entry)) totals.given += entry.amount; else totals.deducted += entry.amount; return totals; }, { given: 0, deducted: 0 });
export const kasbonEntryTypeLabel = (type: KasbonEntryType) => type === "GIVEN" ? "Kasbon Diberikan" : "Potongan Totalan";
export const formatKasbonDate = (date: string) => new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(`${date}T00:00:00`));
export async function readKasbonEntries(supabase: SupabaseClient<Database>) { const { data, error } = await supabase.from("kasbon_ledger_entries").select().order("entry_date", { ascending: false }).order("created_at", { ascending: false }); if (error || !data) return { error: error?.message ?? "Riwayat Kasbon belum dapat dimuat." }; return { data: data.map((row): KasbonEntry => ({ id: row.id, farmerId: row.farmer_id, date: row.entry_date, type: row.entry_type === "advance" ? "GIVEN" : "TOTALAN_DEDUCTION", amount: Number(row.amount), note: row.notes || undefined, relatedTotalanId: row.related_totalan_id ?? undefined, createdAt: row.created_at })) }; }
