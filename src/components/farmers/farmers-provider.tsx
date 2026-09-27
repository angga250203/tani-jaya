"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Farmer, FarmerStatus } from "@/lib/farmers";
import type { FieldRecord, HarvestCycle } from "@/lib/fields";
import { toMasterData, toSupabaseErrorMessage } from "@/lib/master-data";
import { getOperationalDateISO } from "@/lib/operational-date";
import { createClient } from "@/lib/supabase/client";
import type { CycleEditValues, CycleFormValues, FarmerFormValues, FieldFormValues } from "@/lib/validations";

type FarmerUpdate = FarmerFormValues & { status?: FarmerStatus };
type MutationResult<T> = { data?: T; error?: string };

type FarmersContextValue = {
  records: Farmer[];
  fields: FieldRecord[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<boolean>;
  createFarmer: (values: FarmerFormValues) => Promise<MutationResult<Farmer>>;
  updateFarmer: (id: string, values: Partial<FarmerUpdate>) => Promise<MutationResult<Farmer>>;
  createField: (farmerId: string, values: FieldFormValues) => Promise<MutationResult<FieldRecord>>;
  updateField: (id: string, values: Partial<FieldFormValues>) => Promise<MutationResult<FieldRecord>>;
  createCycle: (fieldId: string, values: CycleFormValues) => Promise<MutationResult<HarvestCycle>>;
  updateCycle: (fieldId: string, cycleId: string, values: CycleEditValues) => Promise<MutationResult<HarvestCycle>>;
  endCycle: (fieldId: string, cycleId: string) => Promise<MutationResult<HarvestCycle>>;
};

const FarmersContext = createContext<FarmersContextValue | null>(null);

export function FarmersProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<Farmer[]>([]);
  const [fields, setFields] = useState<FieldRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const supabase = createClient();
    const [farmersResult, fieldsResult, cyclesResult] = await Promise.all([
      supabase.from("farmers").select().order("created_at", { ascending: false }),
      supabase.from("fields").select().order("created_at", { ascending: true }),
      supabase.from("harvest_cycles").select().order("created_at", { ascending: true }),
    ]);
    const queryError = farmersResult.error ?? fieldsResult.error ?? cyclesResult.error;
    if (queryError || !farmersResult.data || !fieldsResult.data || !cyclesResult.data) {
      setRecords([]);
      setFields([]);
      setError(toSupabaseErrorMessage(queryError, "Data Petani belum dapat dimuat. Periksa koneksi lalu coba lagi."));
      setIsLoading(false);
      return false;
    }
    const data = toMasterData(farmersResult.data, fieldsResult.data, cyclesResult.data);
    setRecords(data.farmers);
    setFields(data.fields);
    setIsLoading(false);
    return true;
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  const createFarmer = useCallback(async (values: FarmerFormValues): Promise<MutationResult<Farmer>> => {
    const { data, error: insertError } = await createClient().from("farmers").insert({
      name: values.name.trim(), whatsapp: values.whatsapp.trim(), location_reference: values.landmark.trim(), notes: values.note?.trim() ?? "", status: "active",
    }).select().single();
    if (insertError || !data) return { error: toSupabaseErrorMessage(insertError) };
    return await refresh() ? { data: toMasterData([data], [], []).farmers[0] } : { error: "Petani tersimpan, tetapi daftar belum dapat dimuat ulang." };
  }, [refresh]);

  const updateFarmer = useCallback(async (id: string, values: Partial<FarmerUpdate>): Promise<MutationResult<Farmer>> => {
    const update = {
      ...(values.name !== undefined ? { name: values.name.trim() } : {}),
      ...(values.whatsapp !== undefined ? { whatsapp: values.whatsapp.trim() } : {}),
      ...(values.landmark !== undefined ? { location_reference: values.landmark.trim() } : {}),
      ...(values.note !== undefined ? { notes: values.note.trim() } : {}),
      ...(values.status !== undefined ? { status: values.status } : {}),
    };
    const { data, error: updateError } = await createClient().from("farmers").update(update).eq("id", id).select().single();
    if (updateError || !data) return { error: toSupabaseErrorMessage(updateError) };
    return await refresh() ? { data: toMasterData([data], [], []).farmers[0] } : { error: "Perubahan tersimpan, tetapi daftar belum dapat dimuat ulang." };
  }, [refresh]);

  const createField = useCallback(async (farmerId: string, values: FieldFormValues): Promise<MutationResult<FieldRecord>> => {
    const { data, error: insertError } = await createClient().from("fields").insert({
      farmer_id: farmerId, name: values.name.trim(), location_reference: values.landmark.trim(), notes: values.note?.trim() ?? "",
    }).select().single();
    if (insertError || !data) return { error: toSupabaseErrorMessage(insertError) };
    return await refresh() ? { data: { id: data.id, farmerId: data.farmer_id, name: data.name, landmark: data.location_reference, note: data.notes, cycles: [] } } : { error: "Lahan tersimpan, tetapi data belum dapat dimuat ulang." };
  }, [refresh]);

  const updateField = useCallback(async (id: string, values: Partial<FieldFormValues>): Promise<MutationResult<FieldRecord>> => {
    const update = {
      ...(values.name !== undefined ? { name: values.name.trim() } : {}),
      ...(values.landmark !== undefined ? { location_reference: values.landmark.trim() } : {}),
      ...(values.note !== undefined ? { notes: values.note.trim() } : {}),
    };
    const { data, error: updateError } = await createClient().from("fields").update(update).eq("id", id).select().single();
    if (updateError || !data) return { error: toSupabaseErrorMessage(updateError) };
    return await refresh() ? { data: { id: data.id, farmerId: data.farmer_id, name: data.name, landmark: data.location_reference, note: data.notes, cycles: [] } } : { error: "Perubahan tersimpan, tetapi data belum dapat dimuat ulang." };
  }, [refresh]);

  const createCycle = useCallback(async (fieldId: string, values: CycleFormValues): Promise<MutationResult<HarvestCycle>> => {
    const duplicate = fields.find((field) => field.id === fieldId)?.cycles.some((cycle) => cycle.status === "active" && cycle.commodity === values.commodity);
    if (duplicate) return { error: "Sudah ada siklus aktif untuk komoditas ini di lahan tersebut." };
    const { data, error: insertError } = await createClient().from("harvest_cycles").insert({
      field_id: fieldId, commodity: values.commodity, harvest_interval_days: values.intervalDays,
      default_receiving_method: values.defaultReceivingMethod === "DIANTAR" ? "delivered" : "picked_up", notes: values.notes?.trim() ?? "", status: "active",
    }).select().single();
    if (insertError || !data) return { error: toSupabaseErrorMessage(insertError) };
    const cycle: HarvestCycle = { id: data.id, commodity: data.commodity, status: "active", intervalDays: data.harvest_interval_days, defaultReceivingMethod: data.default_receiving_method === "delivered" ? "DIANTAR" : "DIAMBIL", createdAt: data.created_at, notes: data.notes, harvestHistory: [] };
    return await refresh() ? { data: cycle } : { error: "Siklus tersimpan, tetapi data belum dapat dimuat ulang." };
  }, [fields, refresh]);

  const updateCycle = useCallback(async (fieldId: string, cycleId: string, values: CycleEditValues): Promise<MutationResult<HarvestCycle>> => {
    const { data, error: updateError } = await createClient().from("harvest_cycles").update({
      harvest_interval_days: values.intervalDays, default_receiving_method: values.defaultReceivingMethod === "DIANTAR" ? "delivered" : "picked_up", notes: values.notes?.trim() ?? "",
    }).eq("id", cycleId).eq("field_id", fieldId).select().single();
    if (updateError || !data) return { error: toSupabaseErrorMessage(updateError) };
    const cycle: HarvestCycle = { id: data.id, commodity: data.commodity, status: data.status === "completed" ? "completed" : "active", intervalDays: data.harvest_interval_days, defaultReceivingMethod: data.default_receiving_method === "delivered" ? "DIANTAR" : "DIAMBIL", createdAt: data.created_at, notes: data.notes, harvestHistory: [] };
    return await refresh() ? { data: cycle } : { error: "Perubahan tersimpan, tetapi data belum dapat dimuat ulang." };
  }, [refresh]);

  const endCycle = useCallback(async (fieldId: string, cycleId: string): Promise<MutationResult<HarvestCycle>> => {
    const { data, error: updateError } = await createClient().from("harvest_cycles").update({ status: "completed", ended_at: getOperationalDateISO() }).eq("id", cycleId).eq("field_id", fieldId).select().single();
    if (updateError || !data) return { error: toSupabaseErrorMessage(updateError) };
    const cycle: HarvestCycle = { id: data.id, commodity: data.commodity, status: "completed", intervalDays: data.harvest_interval_days, defaultReceivingMethod: data.default_receiving_method === "delivered" ? "DIANTAR" : "DIAMBIL", createdAt: data.created_at, notes: data.notes, harvestHistory: [] };
    return await refresh() ? { data: cycle } : { error: "Siklus diakhiri, tetapi data belum dapat dimuat ulang." };
  }, [refresh]);

  const value = useMemo(() => ({ records, fields, isLoading, error, refresh, createFarmer, updateFarmer, createField, updateField, createCycle, updateCycle, endCycle }), [createCycle, createFarmer, createField, endCycle, error, fields, isLoading, records, refresh, updateCycle, updateFarmer, updateField]);
  return <FarmersContext.Provider value={value}>{children}</FarmersContext.Provider>;
}

export function useFarmers() {
  const context = useContext(FarmersContext);
  if (!context) throw new Error("useFarmers harus digunakan di dalam FarmersProvider.");
  return context;
}
