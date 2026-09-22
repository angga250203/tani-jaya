"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { farmers, type Farmer, type FarmerStatus } from "@/lib/farmers";
import { fields as initialFields, type FieldRecord, type HarvestCycle } from "@/lib/fields";
import type { CycleEditValues, CycleFormValues, FarmerFormValues, FieldFormValues } from "@/lib/validations";

type FarmerUpdate = FarmerFormValues & { status?: FarmerStatus };
type CycleCreateResult = { cycle?: HarvestCycle; error?: string };

type FarmersContextValue = {
  records: Farmer[];
  fields: FieldRecord[];
  createFarmer: (values: FarmerFormValues) => Farmer;
  updateFarmer: (id: string, values: Partial<FarmerUpdate>) => void;
  createField: (farmerId: string, values: FieldFormValues) => FieldRecord;
  updateField: (id: string, values: Partial<FieldFormValues>) => void;
  createCycle: (fieldId: string, values: CycleFormValues) => CycleCreateResult;
  updateCycle: (fieldId: string, cycleId: string, values: CycleEditValues) => void;
  endCycle: (fieldId: string, cycleId: string) => void;
};

const FarmersContext = createContext<FarmersContextValue | null>(null);

function createInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function FarmersProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<Farmer[]>(farmers);
  const [fields, setFields] = useState<FieldRecord[]>(initialFields);

  const createFarmer = useCallback((values: FarmerFormValues) => {
    const newFarmer: Farmer = {
      id: `petani-local-${Date.now()}`,
      name: values.name.trim(),
      initials: createInitials(values.name),
      whatsapp: values.whatsapp.trim(),
      landmark: values.landmark.trim(),
      note: values.note?.trim() ?? "",
      status: "active",
      fieldCount: 0,
    };
    setRecords((current) => [newFarmer, ...current]);
    return newFarmer;
  }, []);

  const updateFarmer = useCallback((id: string, values: Partial<FarmerUpdate>) => {
    setRecords((current) =>
      current.map((farmer) => {
        if (farmer.id !== id) {
          return farmer;
        }
        const name = values.name?.trim() ?? farmer.name;
        return {
          ...farmer,
          ...values,
          name,
          initials: values.name ? createInitials(values.name) : farmer.initials,
          whatsapp: values.whatsapp?.trim() ?? farmer.whatsapp,
          landmark: values.landmark?.trim() ?? farmer.landmark,
          note: values.note?.trim() ?? farmer.note,
        };
      }),
    );
  }, []);

  const createField = useCallback((farmerId: string, values: FieldFormValues) => {
    const newField: FieldRecord = {
      id: `lahan-local-${Date.now()}`,
      farmerId,
      name: values.name.trim(),
      landmark: values.landmark.trim(),
      note: values.note?.trim() ?? "",
      cycles: [],
    };
    setFields((current) => [newField, ...current]);
    setRecords((current) => current.map((farmer) => (
      farmer.id === farmerId ? { ...farmer, fieldCount: farmer.fieldCount + 1 } : farmer
    )));
    return newField;
  }, []);

  const updateField = useCallback((id: string, values: Partial<FieldFormValues>) => {
    setFields((current) => current.map((field) => (
      field.id === id
        ? {
            ...field,
            name: values.name?.trim() || field.name,
            landmark: values.landmark?.trim() || field.landmark,
            note: values.note?.trim() ?? field.note,
          }
        : field
    )));
  }, []);

  const createCycle = useCallback((fieldId: string, values: CycleFormValues): CycleCreateResult => {
    const field = fields.find((item) => item.id === fieldId);
    if (!field) return { error: "Lahan tidak ditemukan." };

    const duplicate = field.cycles.some(
      (cycle) => cycle.status === "active" && cycle.commodity === values.commodity,
    );
    if (duplicate) {
      return { error: `${values.commodity} sudah memiliki siklus aktif di lahan ini.` };
    }

    const cycle: HarvestCycle = {
      id: `siklus-local-${Date.now()}`,
      commodity: values.commodity,
      status: "active",
      intervalDays: values.intervalDays,
      defaultReceivingMethod: values.defaultReceivingMethod,
      createdAt: "16 September 2026",
      notes: values.notes?.trim() ?? "",
      harvestHistory: [],
    };
    setFields((current) => current.map((item) => (
      item.id === fieldId ? { ...item, cycles: [...item.cycles, cycle] } : item
    )));
    return { cycle };
  }, [fields]);

  const updateCycle = useCallback((fieldId: string, cycleId: string, values: CycleEditValues) => {
    // Jadwal yang telah terjadi tidak diubah; penyusunan ulang jadwal mendatang belum ditentukan oleh PRD.
    setFields((current) => current.map((field) => (
      field.id === fieldId
        ? {
            ...field,
            cycles: field.cycles.map((cycle) => (
              cycle.id === cycleId
                ? { ...cycle, intervalDays: values.intervalDays, defaultReceivingMethod: values.defaultReceivingMethod, notes: values.notes?.trim() ?? "" }
                : cycle
            )),
          }
        : field
    )));
  }, []);

  const endCycle = useCallback((fieldId: string, cycleId: string) => {
    setFields((current) => current.map((field) => (
      field.id === fieldId
        ? {
            ...field,
            cycles: field.cycles.map((cycle) => (
              cycle.id === cycleId
                ? { ...cycle, status: "completed", endedAt: "16 September 2026", nextHarvest: undefined }
                : cycle
            )),
          }
        : field
    )));
  }, []);

  const value = useMemo(
    () => ({ records, fields, createFarmer, updateFarmer, createField, updateField, createCycle, updateCycle, endCycle }),
    [createCycle, createFarmer, createField, endCycle, fields, records, updateCycle, updateFarmer, updateField],
  );

  return <FarmersContext.Provider value={value}>{children}</FarmersContext.Provider>;
}

export function useFarmers() {
  const context = useContext(FarmersContext);
  if (!context) {
    throw new Error("useFarmers harus digunakan di dalam FarmersProvider.");
  }
  return context;
}
