"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Box, Filter, PackageOpen, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input, SelectField } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  allocatedStockWeight,
  availableStockWeight,
  gradeLabels,
  stockSummary,
  weighingMethodLabel,
  type StockGrade,
  type StockSource,
} from "@/lib/stocks";
import { useStocks } from "./stocks-provider";
import { cn } from "@/lib/utils";

type GradeFilter = "ALL" | StockGrade;
type SellerTypeFilter = "ALL" | "PETANI_MITRA" | "PENJUAL_UMUM";
type MethodFilter = "ALL" | "TOTAL_LANGSUNG" | "PER_KARUNG" | "PER_PETI";

type StockGroup = {
  id: string;
  commodity: string;
  grade: StockGrade;
  sources: StockSource[];
};

const gradeOptions: { value: GradeFilter; label: string }[] = [
  { value: "ALL", label: "Semua" },
  { value: "SP", label: "SP" },
  { value: "TG", label: "TG" },
  { value: "BR", label: "BR" },
];

const gradeClassNames: Record<StockGrade, string> = {
  SP: "border-tj-primary-soft bg-tj-primary-soft text-tj-primary-strong",
  TG: "border-tj-info-soft bg-tj-info-soft text-tj-info",
  BR: "border-tj-warning-soft bg-tj-warning-soft text-tj-warning",
};

function GradeBadge({ grade }: { grade: StockGrade }) {
  return (
    <span className={cn("inline-flex min-h-6 items-center rounded-full border px-2.5 text-xs font-semibold", gradeClassNames[grade])}>
      {grade} · {gradeLabels[grade]}
    </span>
  );
}

function SummaryCard({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <Card>
      <CardContent className="min-h-[98px] p-3.5 lg:p-4">
        <p className="text-xs font-medium text-tj-muted">{label}</p>
        <p className="mt-3 text-[25px] font-bold leading-none tracking-[-0.03em] text-tj-primary-strong lg:text-[28px]">{value}</p>
        <p className="mt-1.5 text-xs text-tj-muted">{detail}</p>
      </CardContent>
    </Card>
  );
}

function SourceTypeBadge({ source }: { source: StockSource }) {
  if (source.sellerType === "PETANI_MITRA") {
    return <span className="text-xs font-medium text-tj-muted">Petani Mitra</span>;
  }

  return <StatusBadge status="neutral">Penjual Umum</StatusBadge>;
}

function SourceCard({ source }: { source: StockSource }) {
  const allocatedWeight = allocatedStockWeight(source);
  const availableWeight = availableStockWeight(source);

  return (
    <div className="rounded-xl border border-tj-border bg-tj-canvas/55 p-3.5 lg:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-bold text-tj-text">{source.sellerName}</p>
            <SourceTypeBadge source={source} />
          </div>
          <p className="mt-1 text-xs text-tj-muted">{source.purchaseReference} · {source.purchaseDate}</p>
        </div>
        <span className="inline-flex min-h-7 items-center rounded-full bg-tj-primary-soft px-2.5 text-xs font-bold text-tj-primary-strong">
          {availableWeight} kg tersedia
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 border-y border-tj-border py-3 text-center">
        <div>
          <p className="text-[11px] text-tj-muted">Masuk</p>
          <p className="mt-0.5 text-sm font-bold text-tj-text">{source.grossIncomingWeightKg} kg</p>
        </div>
        <div className="border-x border-tj-border">
          <p className="text-[11px] text-tj-muted">Dialokasikan</p>
          <p className="mt-0.5 text-sm font-bold text-tj-text">{allocatedWeight} kg</p>
        </div>
        <div>
          <p className="text-[11px] text-tj-muted">Tersedia</p>
          <p className="mt-0.5 text-sm font-bold text-tj-primary-strong">{availableWeight} kg</p>
        </div>
      </div>

      <p className="mt-3 text-xs font-medium text-tj-muted">{weighingMethodLabel(source.weighingMethod)}</p>
      {source.containers && (
        <details className="mt-2.5 rounded-lg border border-tj-border bg-tj-surface px-2.5">
          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold text-tj-primary"><span>Rincian {source.containers.length} wadah</span><span className="text-tj-muted">Buka</span></summary>
          <ul aria-label={`Rincian wadah ${source.sellerName}`} className="space-y-1.5 border-t border-tj-border py-2.5">
            {source.containers.map((container) => {
              const available = container.status === "available";
              return (
                <li className="flex min-h-10 items-center justify-between gap-3 rounded-lg bg-tj-canvas px-2.5 py-1.5" key={container.id}>
                  <span className="text-xs font-semibold text-tj-text">{container.label} · {container.weightKg} kg</span>
                  <StatusBadge status={available ? "paid" : "warning"}>{available ? "Tersedia" : "Sudah dialokasikan"}</StatusBadge>
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </div>
  );
}

function StockGroupCard({ group }: { group: StockGroup }) {
  const availableWeight = group.sources.reduce((total, source) => total + availableStockWeight(source), 0);

  return (
    <Card className="overflow-hidden">
      <div className="flex min-h-16 items-center justify-between gap-3 border-b border-tj-border p-4">
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-base font-bold text-tj-text">{group.commodity}</span>
            <GradeBadge grade={group.grade} />
          </span>
          <span className="mt-1 block text-xs text-tj-muted">{group.sources.length} sumber · {availableWeight} kg fisik tersedia</span>
        </span>
      </div>
      <div className="space-y-2.5 p-3.5 lg:p-4">
        {group.sources.map((source) => <SourceCard key={source.id} source={source} />)}
      </div>
    </Card>
  );
}

function EmptyStockState({ kind }: { kind: "all" | "filtered" | "sold" }) {
  const copy = kind === "all"
    ? { title: "Belum ada stok tersedia", description: "Stok akan muncul setelah transaksi Pembelian disimpan." }
    : kind === "sold"
      ? { title: "Stok sudah habis dialokasikan", description: "Semua sumber yang cocok telah terjual atau dialokasikan. Ubah filter untuk melihat stok lain." }
      : { title: "Stok tidak ditemukan", description: "Coba ubah kata pencarian atau pilihan filter Anda." };

  return (
    <Card>
      <CardContent className="flex min-h-56 flex-col items-center justify-center px-6 py-8 text-center">
        <PackageOpen aria-hidden="true" className="mb-3 text-tj-primary" size={30} />
        <h2 className="text-base font-bold text-tj-text">{copy.title}</h2>
        <p className="mt-1 max-w-sm text-sm leading-6 text-tj-muted">{copy.description}</p>
      </CardContent>
    </Card>
  );
}

type FilterControlsProps = {
  sellerType: SellerTypeFilter;
  method: MethodFilter;
  onSellerTypeChange: (value: SellerTypeFilter) => void;
  onMethodChange: (value: MethodFilter) => void;
};

function FilterControls({ sellerType, method, onSellerTypeChange, onMethodChange }: FilterControlsProps) {
  return (
    <>
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-tj-text" htmlFor="stock-seller-type">Sumber</label>
        <SelectField id="stock-seller-type" onChange={(event) => onSellerTypeChange(event.target.value as SellerTypeFilter)} value={sellerType}>
          <option value="ALL">Semua sumber</option>
          <option value="PETANI_MITRA">Petani Mitra</option>
          <option value="PENJUAL_UMUM">Penjual Umum</option>
        </SelectField>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-tj-text" htmlFor="stock-method">Metode timbang</label>
        <SelectField id="stock-method" onChange={(event) => onMethodChange(event.target.value as MethodFilter)} value={method}>
          <option value="ALL">Semua metode</option>
          <option value="TOTAL_LANGSUNG">Timbang Langsung</option>
          <option value="PER_KARUNG">Karung</option>
          <option value="PER_PETI">Peti</option>
        </SelectField>
      </div>
    </>
  );
}

export function StocksPage() {
  const { sources: stockSources, isLoading, error } = useStocks();
  const [query, setQuery] = useState("");
  const [grade, setGrade] = useState<GradeFilter>("ALL");
  const [sellerType, setSellerType] = useState<SellerTypeFilter>("ALL");
  const [method, setMethod] = useState<MethodFilter>("ALL");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const summary = useMemo(() => stockSummary(stockSources), [stockSources]);

  const matchingSources = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("id-ID");
    return stockSources.filter((source) => {
      const matchesSearch = !normalizedQuery || [source.commodity, source.sellerName]
        .some((value) => value.toLocaleLowerCase("id-ID").includes(normalizedQuery));
      return matchesSearch
        && (grade === "ALL" || source.grade === grade)
        && (sellerType === "ALL" || source.sellerType === sellerType)
        && (method === "ALL" || source.weighingMethod === method);
    });
  }, [grade, method, query, sellerType, stockSources]);

  const availableSources = useMemo(
    () => matchingSources.filter((source) => availableStockWeight(source) > 0),
    [matchingSources],
  );

  const groups = useMemo(() => {
    const grouped = new Map<string, StockGroup>();
    availableSources.forEach((source) => {
      const id = `${source.commodity.toLocaleLowerCase("id-ID").replaceAll(" ", "-")}-${source.grade.toLocaleLowerCase("id-ID")}`;
      const existing = grouped.get(id);
      if (existing) {
        existing.sources.push(source);
      } else {
        grouped.set(id, { id, commodity: source.commodity, grade: source.grade, sources: [source] });
      }
    });
    return [...grouped.values()].sort((a, b) => a.commodity.localeCompare(b.commodity, "id-ID"));
  }, [availableSources]);

  const hasActiveFilters = Boolean(query || grade !== "ALL" || sellerType !== "ALL" || method !== "ALL");
  const emptyKind = stockSources.length === 0 ? "all" : matchingSources.length === 0 ? "filtered" : "sold";
  const clearFilters = () => { setQuery(""); setGrade("ALL"); setSellerType("ALL"); setMethod("ALL"); };
  return (
    <div className="py-5 sm:py-6 lg:py-8">
      <ContentContainer>
        <PageHeader subtitle="Stok fisik dari Pembelian" title="Stok" />
        <div className="mt-5 space-y-5 lg:mt-7 lg:space-y-6">
          <section aria-labelledby="stock-summary-title">
            <div className="mb-3 flex items-center gap-2">
              <Box aria-hidden="true" className="text-tj-primary" size={19} />
              <h2 className="text-base font-bold text-tj-text lg:text-lg" id="stock-summary-title">Ringkasan stok</h2>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3 lg:gap-4">
              <SummaryCard detail="berat fisik belum teralokasi" label="Stok Tersedia" value={`${summary.totalAvailableWeightKg} kg`} />
              <SummaryCard detail="berat fisik pada riwayat Penjualan" label="Total Dialokasikan" value={`${summary.totalAllocatedWeightKg} kg`} />
              <SummaryCard detail="sumber dengan stok tersedia" label="Sumber Aktif" value={summary.activeSourceCount} />
              <SummaryCard detail="jenis komoditas tersedia" label="Komoditas Tersedia" value={summary.commodityCount} />
            </div>
          </section>

          <section aria-label="Cari dan filter stok" className="space-y-3">
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-tj-muted" size={18} />
              <Input aria-label="Cari komoditas atau sumber penjual" className="pl-10" onChange={(event) => setQuery(event.target.value)} placeholder="Cari komoditas atau sumber penjual" type="search" value={query} />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:overflow-visible">
              {gradeOptions.map((option) => (
                <button
                  aria-pressed={grade === option.value}
                  className={cn("min-h-10 shrink-0 rounded-full border px-3 text-sm font-semibold transition-colors", grade === option.value ? "border-tj-primary bg-tj-primary text-white" : "border-tj-border bg-tj-surface text-tj-muted hover:bg-tj-primary-soft hover:text-tj-primary-strong")}
                  key={option.value}
                  onClick={() => setGrade(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
              <button aria-expanded={isFilterOpen} aria-haspopup="dialog" className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-tj-border bg-tj-surface px-3 text-sm font-semibold text-tj-text hover:bg-tj-primary-soft lg:hidden" onClick={() => setIsFilterOpen(true)} type="button">
                <Filter aria-hidden="true" size={17} />Filter
              </button>
            </div>
            <div className="hidden gap-3 lg:grid lg:grid-cols-2">
              <FilterControls method={method} onMethodChange={setMethod} onSellerTypeChange={setSellerType} sellerType={sellerType} />
            </div>
          </section>

          <section aria-live="polite" aria-labelledby="stock-list-title">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold tracking-[-0.015em] text-tj-text" id="stock-list-title">Stok tersedia</h2>
                <p className="mt-0.5 text-sm text-tj-muted">{availableSources.length} sumber · berat menggunakan kg fisik</p>
              </div>
              {hasActiveFilters && <button className="min-h-10 shrink-0 rounded-lg px-2.5 text-sm font-semibold text-tj-primary hover:bg-tj-primary-soft" onClick={clearFilters} type="button">Reset</button>}
            </div>
            {isLoading ? <Card><CardContent className="py-8 text-center text-sm text-tj-muted">Memuat stok dari Pembelian...</CardContent></Card> : error ? <Card><CardContent className="py-8 text-center text-sm text-tj-danger" role="alert">{error}</CardContent></Card> : availableSources.length ? (
              <motion.div className="space-y-3 lg:space-y-4" layout>
                <AnimatePresence initial={false} mode="popLayout">
                  {groups.map((group) => (
                    <motion.div animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }} initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }} key={group.id} layout transition={{ duration: reduceMotion ? 0.01 : 0.18, ease: "easeOut" }}>
                      <StockGroupCard group={group} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : <EmptyStockState kind={emptyKind} />}
          </section>
        </div>
      </ContentContainer>

      <AnimatePresence initial={false}>
        {isFilterOpen && (
          <>
            <motion.button animate={{ opacity: 1 }} aria-label="Tutup filter stok" className="fixed inset-0 z-50 bg-tj-text/30 lg:hidden" exit={{ opacity: 0 }} initial={{ opacity: 0 }} onClick={() => setIsFilterOpen(false)} transition={{ duration: reduceMotion ? 0.01 : 0.18 }} type="button" />
            <motion.div animate={{ opacity: 1, y: 0 }} aria-labelledby="stock-filter-title" aria-modal="true" className="fixed inset-x-0 bottom-0 z-[51] rounded-t-[24px] bg-tj-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_32px_rgb(14_61_35_/_0.18)] lg:hidden" exit={reduceMotion ? { opacity: 0 } : { opacity: 0.98, y: "100%" }} initial={reduceMotion ? { opacity: 0 } : { opacity: 0.98, y: "100%" }} role="dialog" transition={{ duration: reduceMotion ? 0.01 : 0.22, ease: "easeOut" }}>
              <div aria-hidden="true" className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-tj-border" />
              <div className="mb-4 flex min-h-11 items-center justify-between gap-4">
                <h2 className="text-lg font-bold text-tj-text" id="stock-filter-title">Filter stok</h2>
                <button aria-label="Tutup filter stok" className="flex h-11 w-11 items-center justify-center rounded-xl text-tj-muted hover:bg-tj-canvas" onClick={() => setIsFilterOpen(false)} type="button"><X aria-hidden="true" size={21} /></button>
              </div>
              <div className="space-y-4"><FilterControls method={method} onMethodChange={setMethod} onSellerTypeChange={setSellerType} sellerType={sellerType} /></div>
              <button className="mt-5 min-h-12 w-full rounded-xl bg-tj-primary px-4 text-sm font-semibold text-white shadow-[var(--tj-shadow-sm)]" onClick={() => setIsFilterOpen(false)} type="button">Terapkan Filter</button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
