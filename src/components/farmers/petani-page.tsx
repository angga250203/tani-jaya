"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronRight, LandPlot, MapPin, Phone, Search, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { useFarmers } from "@/components/farmers/farmers-provider";
import type { Farmer, FarmerStatus } from "@/lib/farmers";
import { cn } from "@/lib/utils";

type FarmerFilter = "all" | FarmerStatus;

const filterOptions: { id: FarmerFilter; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "active", label: "Aktif" },
  { id: "inactive", label: "Nonaktif" },
];

function FarmerAvatar({ farmer }: { farmer: Farmer }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tj-primary-soft text-xs font-bold text-tj-primary-strong">
      {farmer.initials}
    </span>
  );
}

function FarmerStatusBadge({ status }: { status: FarmerStatus }) {
  return <StatusBadge status={status === "active" ? "today" : "neutral"}>{status === "active" ? "Aktif" : "Nonaktif"}</StatusBadge>;
}

function FarmerCard({ farmer }: { farmer: Farmer }) {
  return (
    <Link
      aria-label={`Buka detail petani ${farmer.name}`}
      className="block rounded-2xl focus-visible:outline-none"
      href={`/petani/${farmer.id}`}
    >
      <Card className="transition-colors hover:border-tj-primary">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <FarmerAvatar farmer={farmer} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="truncate text-sm font-bold text-tj-text">{farmer.name}</p>
                <FarmerStatusBadge status={farmer.status} />
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-tj-muted">
                <Phone aria-hidden="true" size={15} />
                {farmer.whatsapp}
              </p>
              <p className="mt-1.5 flex items-start gap-1.5 text-sm leading-5 text-tj-muted">
                <MapPin aria-hidden="true" className="mt-0.5 shrink-0" size={15} />
                <span>{farmer.landmark}</span>
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-tj-border pt-3">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-tj-muted">
              <LandPlot aria-hidden="true" size={15} />
              {farmer.fieldCount} {farmer.fieldCount === 1 ? "Lahan" : "Lahan"}
            </span>
            <span className="flex h-9 items-center gap-1 text-xs font-semibold text-tj-primary">
              Detail
              <ChevronRight aria-hidden="true" size={16} />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function FarmerTable({ items }: { items: Farmer[] }) {
  return (
    <Card className="hidden overflow-hidden lg:block">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px] text-left">
          <thead className="border-b border-tj-border bg-tj-canvas text-xs font-semibold text-tj-muted">
            <tr>
              <th className="px-5 py-3">Nama Petani</th>
              <th className="px-4 py-3">WhatsApp</th>
              <th className="px-4 py-3">Patokan Kebun</th>
              <th className="px-4 py-3">Jumlah Lahan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-5 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.map((farmer) => (
              <tr className="border-b border-tj-border last:border-0 hover:bg-tj-canvas/70" key={farmer.id}>
                <td className="px-5 py-4">
                  <Link className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none" href={`/petani/${farmer.id}`}>
                    <FarmerAvatar farmer={farmer} />
                    <span className="text-sm font-semibold text-tj-text">{farmer.name}</span>
                  </Link>
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-sm text-tj-text">{farmer.whatsapp}</td>
                <td className="px-4 py-4 text-sm text-tj-muted">{farmer.landmark}</td>
                <td className="whitespace-nowrap px-4 py-4 text-sm text-tj-text">{farmer.fieldCount} lahan</td>
                <td className="px-4 py-4"><FarmerStatusBadge status={farmer.status} /></td>
                <td className="px-5 py-4 text-right">
                  <Link
                    aria-label={`Lihat detail petani ${farmer.name}`}
                    className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-tj-primary hover:bg-tj-primary-soft"
                    href={`/petani/${farmer.id}`}
                  >
                    Detail
                    <ChevronRight aria-hidden="true" size={15} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function EmptyFarmers({ hasFilter }: { hasFilter: boolean }) {
  return (
    <Card>
      <CardContent className="flex min-h-52 flex-col items-center justify-center px-6 py-8 text-center">
        <UsersRound aria-hidden="true" className="mb-3 text-tj-primary" size={28} />
        <h2 className="text-base font-bold text-tj-text">{hasFilter ? "Tidak ada petani yang sesuai" : "Belum ada petani"}</h2>
        <p className="mt-1 max-w-xs text-sm leading-6 text-tj-muted">
          {hasFilter
            ? "Coba ubah kata pencarian atau filter status untuk melihat petani lainnya."
            : "Tambahkan petani mitra beserta informasi kebun untuk mulai mengelola jadwal panen."}
        </p>
      </CardContent>
    </Card>
  );
}

export function PetaniPage() {
  const { records, error, isLoading, refresh } = useFarmers();
  const [filter, setFilter] = useState<FarmerFilter>("all");
  const [query, setQuery] = useState("");
  const reduceMotion = useReducedMotion();

  const filteredFarmers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return records.filter((farmer) => {
      const matchesQuery =
        !normalizedQuery ||
        [farmer.name, farmer.whatsapp, farmer.landmark].some((value) =>
          value.toLowerCase().includes(normalizedQuery),
        );
      const matchesFilter = filter === "all" || farmer.status === filter;
      return matchesQuery && matchesFilter;
    });
  }, [filter, query, records]);

  const hasFilter = Boolean(query.trim()) || filter !== "all";
  if (isLoading) return <div className="px-4 py-6 text-sm text-tj-muted">Memuat data Petani…</div>;
  if (error) return <div className="px-4 py-6 text-sm text-tj-danger"><p>{error}</p><button className="mt-3 font-semibold text-tj-primary hover:underline" onClick={() => void refresh()} type="button">Coba lagi</button></div>;

  return (
    <div className="py-5 sm:py-6 lg:py-8">
      <ContentContainer>
        <PageHeader
          actionHref="/petani/baru"
          actionLabel="Tambah Petani"
          subtitle="Kelola petani mitra dan lahan"
          title="Petani"
        />

        <div className="mt-5 space-y-5 lg:mt-7 lg:space-y-6">
          <section aria-label="Cari dan saring petani" className="lg:flex lg:items-center lg:gap-3">
            <div className="relative lg:max-w-md lg:flex-1">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-tj-muted" size={18} />
              <Input
                aria-label="Cari petani"
                className="pl-10"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari petani..."
                type="search"
                value={query}
              />
            </div>
            <div aria-label="Filter status petani" className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 lg:mt-0" role="tablist">
              {filterOptions.map((option) => {
                const selected = filter === option.id;
                return (
                  <button
                    aria-selected={selected}
                    className={cn(
                      "min-h-11 shrink-0 rounded-xl border px-3.5 text-sm font-semibold transition-colors",
                      selected
                        ? "border-tj-primary bg-tj-primary text-white"
                        : "border-tj-border bg-tj-surface text-tj-muted hover:bg-tj-primary-soft hover:text-tj-text",
                    )}
                    key={option.id}
                    onClick={() => setFilter(option.id)}
                    role="tab"
                    type="button"
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="daftar-petani">
            <div className="mb-3">
              <h2 className="text-lg font-bold tracking-[-0.015em] text-tj-text" id="daftar-petani">
                Daftar petani
              </h2>
              <p className="mt-0.5 text-sm text-tj-muted">{filteredFarmers.length} petani ditemukan</p>
            </div>
            <AnimatePresence initial={false} mode="wait">
              {filteredFarmers.length ? (
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: reduceMotion ? 0 : 4 }}
                  initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
                  key={`${filter}-${query}`}
                  transition={{ duration: reduceMotion ? 0.01 : 0.18, ease: "easeOut" }}
                >
                  <div className="space-y-3 lg:hidden">
                    {filteredFarmers.map((farmer) => <FarmerCard farmer={farmer} key={farmer.id} />)}
                  </div>
                  <FarmerTable items={filteredFarmers} />
                </motion.div>
              ) : (
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: reduceMotion ? 0 : 4 }}
                  initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
                  key="empty"
                  transition={{ duration: reduceMotion ? 0.01 : 0.18, ease: "easeOut" }}
                >
                  <EmptyFarmers hasFilter={hasFilter} />
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>
      </ContentContainer>
    </div>
  );
}
