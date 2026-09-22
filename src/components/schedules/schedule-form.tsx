"use client";

import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useFarmers } from "@/components/farmers/farmers-provider";
import { ContentContainer } from "@/components/layout/content-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, SelectField } from "@/components/ui/input";
import { useSchedules } from "./schedules-provider";

export function ScheduleForm() {
  const router = useRouter();
  const { records, fields } = useFarmers();
  const { addSchedule } = useSchedules();
  const [farmerId, setFarmerId] = useState("");
  const [fieldId, setFieldId] = useState("");
  const [cycleId, setCycleId] = useState("");
  const [dateISO, setDateISO] = useState("2026-09-16");
  const [method, setMethod] = useState<"Diambil" | "Diantar">("Diambil");
  const [saved, setSaved] = useState(false);
  const activeFarmers = records.filter((farmer) => farmer.status === "active");
  const availableFields = useMemo(() => fields.filter((field) => field.farmerId === farmerId), [farmerId, fields]);
  const selectedFarmer = records.find((farmer) => farmer.id === farmerId);
  const selectedField = fields.find((field) => field.id === fieldId);
  const availableCycles = selectedField?.cycles.filter((cycle) => cycle.status === "active") ?? [];
  const selectedCycle = availableCycles.find((cycle) => cycle.id === cycleId);
  const canSave = Boolean(selectedFarmer && selectedField && selectedCycle && dateISO);

  const save = () => {
    if (!selectedFarmer || !selectedField || !selectedCycle || !dateISO) return;
    const schedule = addSchedule({ farmerId: selectedFarmer.id, fieldId: selectedField.id, cycleId: selectedCycle.id, farmer: selectedFarmer.name, field: selectedField.name, commodity: selectedCycle.commodity, dateISO, method });
    setSaved(true);
    window.setTimeout(() => router.push(`/jadwal/${schedule.id}`), 500);
  };

  return <div className="py-5 sm:py-6 lg:py-8"><ContentContainer><header className="flex items-center gap-3 border-b border-tj-border pb-5 lg:pb-6"><button aria-label="Kembali ke Jadwal Panen" className="flex h-11 w-11 items-center justify-center rounded-xl text-tj-muted hover:bg-tj-primary-soft hover:text-tj-primary" onClick={() => router.push("/jadwal")} type="button"><ArrowLeft aria-hidden="true" size={21} /></button><div><p className="text-xs font-medium text-tj-muted sm:text-sm">Jadwal Panen</p><h1 className="text-[19px] font-bold leading-6 tracking-[-0.02em] text-tj-text lg:text-[28px] lg:leading-8">Tambah Jadwal</h1></div></header><Card className="mt-5 max-w-xl lg:mt-7"><CardContent className="space-y-5 p-4 lg:p-5"><p className="rounded-xl bg-tj-primary-soft px-3 py-3 text-sm leading-6 text-tj-primary-strong">Pilih petani, lahan, siklus, tanggal, dan metode penerimaan untuk jadwal panen baru.</p><div className="space-y-1.5"><label className="text-sm font-semibold text-tj-text" htmlFor="schedule-farmer">Petani</label><SelectField id="schedule-farmer" onChange={(event) => { setFarmerId(event.target.value); setFieldId(""); setCycleId(""); }} value={farmerId}><option value="">Pilih petani aktif</option>{activeFarmers.map((farmer) => <option key={farmer.id} value={farmer.id}>{farmer.name}</option>)}</SelectField></div><div className="space-y-1.5"><label className="text-sm font-semibold text-tj-text" htmlFor="schedule-field">Lahan</label><SelectField disabled={!farmerId} id="schedule-field" onChange={(event) => { setFieldId(event.target.value); setCycleId(""); }} value={fieldId}><option value="">Pilih lahan</option>{availableFields.map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}</SelectField></div><div className="space-y-1.5"><label className="text-sm font-semibold text-tj-text" htmlFor="schedule-cycle">Siklus</label><SelectField disabled={!fieldId} id="schedule-cycle" onChange={(event) => setCycleId(event.target.value)} value={cycleId}><option value="">Pilih siklus aktif</option>{availableCycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.commodity}</option>)}</SelectField></div><div className="space-y-1.5"><label className="text-sm font-semibold text-tj-text" htmlFor="schedule-date">Tanggal panen rencana</label><Input id="schedule-date" onChange={(event) => setDateISO(event.target.value)} type="date" value={dateISO} /></div><fieldset className="space-y-2"><legend className="text-sm font-semibold text-tj-text">Metode penerimaan</legend><div className="grid grid-cols-2 gap-2">{(["Diambil", "Diantar"] as const).map((choice) => <label className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-tj-border px-3 text-sm font-semibold has-[:checked]:border-tj-primary has-[:checked]:bg-tj-primary-soft" key={choice}><input checked={method === choice} className="h-4 w-4 accent-[#2f7d4a]" name="schedule-method" onChange={() => setMethod(choice)} type="radio" />{choice}</label>)}</div></fieldset><Button className="w-full" disabled={!canSave || saved} onClick={save}>{saved && <CheckCircle2 aria-hidden="true" size={18} />}{saved ? "Jadwal tersimpan" : "Simpan Jadwal"}</Button></CardContent></Card></ContentContainer></div>;
}
