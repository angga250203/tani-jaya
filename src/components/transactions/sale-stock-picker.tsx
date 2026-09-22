"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CheckSquare, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, SelectField } from "@/components/ui/input";
import { allocatedStockWeight, availableStockWeight, gradeLabels, weighingMethodLabel, type StockGrade, type StockSource } from "@/lib/stocks";
import type { SaleStockAllocation } from "@/lib/sales";
import { cn } from "@/lib/utils";

type GradeFilter = "ALL" | StockGrade;
type SellerFilter = "ALL" | "PETANI_MITRA" | "PENJUAL_UMUM";
type MethodFilter = "ALL" | "TOTAL_LANGSUNG" | "PER_KARUNG" | "PER_PETI";

type SaleStockPickerProps = {
  open: boolean;
  sources: StockSource[];
  selectedAllocations: SaleStockAllocation[];
  onClose: () => void;
  onConfirm: (allocations: SaleStockAllocation[]) => void;
};

function toAllocation(source: StockSource, amount: number, containerId?: string, containerLabel?: string): SaleStockAllocation {
  return { id: `allocation-draft-${source.id}-${containerId ?? "direct"}`, sourceId: source.id, purchaseItemId: source.purchaseItemId, sellerType: source.sellerType, sellerName: source.sellerName, farmerId: source.farmerId, commodity: source.commodity, grade: source.grade, weighingMethod: source.weighingMethod, purchaseContainerId: containerId, purchaseContainerLabel: containerLabel, allocatedGrossWeightKg: amount };
}

function GradeBadge({ grade }: { grade: StockGrade }) {
  const colors: Record<StockGrade, string> = { SP: "bg-tj-primary-soft text-tj-primary-strong", TG: "bg-tj-info-soft text-tj-info", BR: "bg-tj-warning-soft text-tj-warning" };
  return <span className={cn("inline-flex min-h-6 items-center rounded-full px-2 text-xs font-semibold", colors[grade])}>{grade} · {gradeLabels[grade]}</span>;
}

export function SaleStockPicker({ open, sources, selectedAllocations, onClose, onConfirm }: SaleStockPickerProps) {
  const [query, setQuery] = useState("");
  const [grade, setGrade] = useState<GradeFilter>("ALL");
  const [sellerType, setSellerType] = useState<SellerFilter>("ALL");
  const [method, setMethod] = useState<MethodFilter>("ALL");
  const [directAmounts, setDirectAmounts] = useState<Record<string, string>>(() => Object.fromEntries(selectedAllocations.filter((allocation) => !allocation.purchaseContainerId).map((allocation) => [allocation.sourceId, String(allocation.allocatedGrossWeightKg)])));
  const [containerIds, setContainerIds] = useState<string[]>(() => selectedAllocations.flatMap((allocation) => allocation.purchaseContainerId ? [`${allocation.sourceId}:${allocation.purchaseContainerId}`] : []));
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeydown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") { onClose(); return; }
      if (event.key !== "Tab") return;
      const dialog = document.querySelector<HTMLElement>("[role='dialog'][aria-labelledby='stock-picker-title']");
      const focusable = dialog?.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), select:not([disabled]), [href]");
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [onClose, open]);

  const filteredSources = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("id-ID");
    return sources.filter((source) => {
      const matchesSearch = !normalized || [source.commodity, source.sellerName].some((value) => value.toLocaleLowerCase("id-ID").includes(normalized));
      return availableStockWeight(source) > 0 && matchesSearch && (grade === "ALL" || source.grade === grade) && (sellerType === "ALL" || source.sellerType === sellerType) && (method === "ALL" || source.weighingMethod === method);
    });
  }, [grade, method, query, sellerType, sources]);

  const selectedWeight = useMemo(() => {
    const direct = Object.values(directAmounts).reduce((total, value) => total + (Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : 0), 0);
    const containers = containerIds.reduce((total, key) => { const [sourceId, containerId] = key.split(":"); const container = sources.find((source) => source.id === sourceId)?.containers?.find((item) => item.id === containerId); return total + (container?.weightKg ?? 0); }, 0);
    return direct + containers;
  }, [containerIds, directAmounts, sources]);

  const toggleContainer = (sourceId: string, containerId: string) => setContainerIds((current) => current.includes(`${sourceId}:${containerId}`) ? current.filter((id) => id !== `${sourceId}:${containerId}`) : [...current, `${sourceId}:${containerId}`]);
  const toggleAllContainers = (source: StockSource) => {
    const availableIds = source.containers?.filter((container) => container.status === "available").map((container) => `${source.id}:${container.id}`) ?? [];
    const allSelected = availableIds.every((id) => containerIds.includes(id));
    setContainerIds((current) => allSelected ? current.filter((id) => !availableIds.includes(id)) : [...new Set([...current, ...availableIds])]);
  };
  const confirm = () => {
    const allocations: SaleStockAllocation[] = [];
    for (const source of sources) {
      if (!source.containers) {
        const value = directAmounts[source.id] ?? "";
        if (!value) continue;
        if (!/^\d+$/.test(value) || Number(value) <= 0 || Number(value) > availableStockWeight(source)) { setError(`Jumlah ambil ${source.commodity} dari ${source.sellerName} harus berupa kg bulat, lebih dari 0, dan tidak melebihi stok tersedia.`); return; }
        allocations.push(toAllocation(source, Number(value)));
      } else {
        source.containers.filter((container) => container.status === "available" && containerIds.includes(`${source.id}:${container.id}`)).forEach((container) => allocations.push(toAllocation(source, container.weightKg, container.id, container.label)));
      }
    }
    if (!allocations.length) { setError("Pilih minimal satu stok untuk Penjualan."); return; }
    onConfirm(allocations);
  };

  return <AnimatePresence initial={false}>{open && <motion.div animate={{ opacity: 1 }} className="fixed inset-0 z-[70]" exit={{ opacity: 0 }} initial={{ opacity: 0 }}><button aria-label="Tutup pilihan stok" className="absolute inset-0 cursor-default bg-tj-text/35" onClick={onClose} type="button" /><motion.div animate={{ opacity: 1, scale: 1, y: 0 }} aria-labelledby="stock-picker-title" aria-modal="true" className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-[24px] bg-tj-surface px-4 pt-3 shadow-[0_-12px_32px_rgb(14_61_35_/_0.18)] lg:inset-x-auto lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:max-h-[calc(100dvh-48px)] lg:w-[min(960px,calc(100vw-64px))] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl lg:px-6 lg:shadow-[var(--tj-shadow-md)]" exit={reduceMotion ? { opacity: 0 } : { opacity: 0.98, y: "100%" }} initial={reduceMotion ? { opacity: 0 } : { opacity: 0.98, y: "100%" }} role="dialog" transition={{ duration: reduceMotion ? 0.01 : 0.2, ease: "easeOut" }}><div aria-hidden="true" className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-tj-border lg:hidden" /><div className="mb-4 flex min-h-11 items-center justify-between gap-4"><div><h2 className="text-lg font-bold text-tj-text" id="stock-picker-title">Pilih Stok</h2><p className="mt-0.5 text-xs text-tj-muted">Stok fisik dari Pembelian</p></div><button aria-label="Tutup pilihan stok" className="flex h-11 w-11 items-center justify-center rounded-xl text-tj-muted hover:bg-tj-canvas" onClick={onClose} ref={closeRef} type="button"><X aria-hidden="true" size={21} /></button></div><div className="grid gap-2.5 border-b border-tj-border pb-4 lg:grid-cols-[minmax(0,1fr)_160px_160px]"><div className="relative"><Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-tj-muted" size={18} /><Input aria-label="Cari komoditas atau sumber penjual" className="pl-10" onChange={(event) => setQuery(event.target.value)} placeholder="Cari komoditas atau sumber" type="search" value={query} /></div><SelectField aria-label="Filter jenis sumber" onChange={(event) => setSellerType(event.target.value as SellerFilter)} value={sellerType}><option value="ALL">Semua sumber</option><option value="PETANI_MITRA">Petani Mitra</option><option value="PENJUAL_UMUM">Penjual Umum</option></SelectField><SelectField aria-label="Filter metode timbang" onChange={(event) => setMethod(event.target.value as MethodFilter)} value={method}><option value="ALL">Semua metode</option><option value="TOTAL_LANGSUNG">Timbang Langsung</option><option value="PER_KARUNG">Karung</option><option value="PER_PETI">Peti</option></SelectField><div className="flex gap-1 overflow-x-auto lg:col-span-3">{(["ALL", "SP", "TG", "BR"] as GradeFilter[]).map((value) => <button aria-pressed={grade === value} className={cn("min-h-9 shrink-0 rounded-full px-3 text-xs font-semibold", grade === value ? "bg-tj-primary text-white" : "bg-tj-canvas text-tj-muted")} key={value} onClick={() => setGrade(value)} type="button">{value === "ALL" ? "Semua grade" : value}</button>)}</div></div><div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-4">{filteredSources.map((source) => { const available = availableStockWeight(source); const allAvailableSelected = source.containers?.filter((container) => container.status === "available").every((container) => containerIds.includes(`${source.id}:${container.id}`)); return <div className="rounded-xl border border-tj-border p-3.5" key={source.id}><div className="flex flex-wrap items-start justify-between gap-2"><div><div className="flex flex-wrap items-center gap-2"><p className="font-bold text-tj-text">{source.commodity}</p><GradeBadge grade={source.grade} /></div><p className="mt-1 text-sm text-tj-muted">{source.sellerName} · {source.sellerType === "PETANI_MITRA" ? "Petani Mitra" : "Penjual Umum"}</p><p className="mt-1 text-xs text-tj-muted">{weighingMethodLabel(source.weighingMethod)} · Masuk {source.grossIncomingWeightKg} kg · Dialokasikan {allocatedStockWeight(source)} kg</p></div><span className="rounded-full bg-tj-primary-soft px-2.5 py-1 text-xs font-bold text-tj-primary-strong">{available} kg tersedia</span></div>{source.containers ? <div className="mt-3"><div className="mb-2 flex items-center justify-between gap-2"><p className="text-xs font-semibold text-tj-text">Pilih wadah utuh</p><button className="min-h-9 rounded-lg px-2 text-xs font-semibold text-tj-primary hover:bg-tj-primary-soft" onClick={() => toggleAllContainers(source)} type="button"><CheckSquare aria-hidden="true" className="mr-1 inline" size={15} />{allAvailableSelected ? "Batalkan semua" : "Pilih semua stok penjual"}</button></div><div className="space-y-1.5">{source.containers.map((container) => { const isAvailable = container.status === "available"; const checked = containerIds.includes(`${source.id}:${container.id}`); return <label className={cn("flex min-h-11 items-center justify-between gap-3 rounded-lg border px-3 text-sm", isAvailable ? "cursor-pointer bg-tj-surface" : "cursor-not-allowed bg-tj-canvas text-tj-muted")} key={container.id}><span className="flex items-center gap-2"><input aria-label={`${source.commodity} ${container.label} ${container.weightKg} kg`} checked={checked} disabled={!isAvailable} onChange={() => toggleContainer(source.id, container.id)} type="checkbox" /><span>{container.label} · {container.weightKg} kg</span></span><span className="text-xs font-semibold">{isAvailable ? "Tersedia" : "Sudah dialokasikan"}</span></label>; })}</div></div> : <div className="mt-3 grid grid-cols-[1fr_120px] items-end gap-3"><div><p className="text-xs text-tj-muted">Ambil stok fisik dalam kg bulat.</p></div><div className="space-y-1"><label className="text-xs font-semibold text-tj-text" htmlFor={`direct-${source.id}`}>Ambil (kg)</label><Input id={`direct-${source.id}`} inputMode="numeric" min="1" onChange={(event) => setDirectAmounts((current) => ({ ...current, [source.id]: event.target.value }))} placeholder="kg" type="text" value={directAmounts[source.id] ?? ""} /></div></div>}</div>; })}{!filteredSources.length && <p className="py-8 text-center text-sm text-tj-muted">Tidak ada stok yang sesuai filter.</p>}</div><div className="border-t border-tj-border pb-[max(1rem,env(safe-area-inset-bottom))] pt-3"><div className="mb-3 flex justify-between text-sm"><span className="text-tj-muted">Stok dipilih</span><strong className="text-tj-primary-strong">{selectedWeight} kg fisik</strong></div>{error && <p className="mb-3 rounded-xl bg-tj-danger-soft px-3 py-2 text-sm font-medium text-tj-danger" role="alert">{error}</p>}<div className="flex gap-2"><Button className="flex-1" onClick={onClose} variant="secondary">Batal</Button><Button className="flex-1" onClick={confirm}>Gunakan Stok</Button></div></div></motion.div></motion.div>}</AnimatePresence>;
}
