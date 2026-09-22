"use client";

import Link from "next/link";
import { ChevronRight, Search, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { useFarmers } from "@/components/farmers/farmers-provider";
import { useKasbons } from "@/components/kasbons/kasbons-provider";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatKasbonDate } from "@/lib/kasbons";
import { cn, formatRupiah } from "@/lib/utils";

type BalanceFilter = "all" | "has-balance" | "zero";

const filterLabels: Record<BalanceFilter, string> = {
  all: "Semua",
  "has-balance": "Ada saldo",
  zero: "Saldo Rp0",
};

function FarmerStatus({ status }: { status: "active" | "inactive" }) {
  return <StatusBadge status={status === "active" ? "today" : "neutral"}>{status === "active" ? "Aktif" : "Nonaktif"}</StatusBadge>;
}

export function KasbonsPage() {
  const { records } = useFarmers();
  const { entries, getBalance } = useKasbons();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<BalanceFilter>("all");
  const rows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("id-ID");
    return records
      .map((farmer) => ({
        farmer,
        balance: getBalance(farmer.id),
        latestEntry: entries.filter((entry) => entry.farmerId === farmer.id).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))[0],
      }))
      .filter(({ farmer, balance }) => (
        (!normalizedQuery || farmer.name.toLocaleLowerCase("id-ID").includes(normalizedQuery))
        && (filter === "all" || (filter === "has-balance" ? balance > 0 : balance === 0))
      ));
  }, [entries, filter, getBalance, query, records]);
  const totalBalance = records.reduce((total, farmer) => total + getBalance(farmer.id), 0);
  const farmersWithBalance = records.filter((farmer) => getBalance(farmer.id) > 0).length;

  return (
    <div className="py-5 sm:py-6 lg:py-8">
      <ContentContainer>
        <PageHeader actionHref="/kasbon/baru" actionLabel="Tambah Kasbon" subtitle="Catat dan pantau saldo petani" title="Kasbon" />

        <div className="mt-5 grid grid-cols-2 gap-3 lg:mt-7 lg:grid-cols-3">
          <Card><CardContent className="p-4"><p className="text-xs font-medium text-tj-muted">Total saldo kasbon</p><p className="mt-2 text-lg font-bold tracking-[-0.02em] text-tj-text">{formatRupiah(totalBalance)}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs font-medium text-tj-muted">Petani ada saldo</p><p className="mt-2 text-lg font-bold text-tj-text">{farmersWithBalance} petani</p></CardContent></Card>
          <Card className="col-span-2 lg:col-span-1"><CardContent className="flex items-center gap-3 p-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tj-primary-soft text-tj-primary"><WalletCards aria-hidden="true" size={20} /></span><p className="text-sm leading-5 text-tj-muted">Saldo dihitung dari seluruh riwayat kasbon dan potongan totalan.</p></CardContent></Card>
        </div>

        <Card className="mt-4 lg:mt-5"><CardContent className="space-y-3 p-4 lg:flex lg:items-center lg:justify-between lg:gap-5 lg:space-y-0 lg:p-5">
          <div className="relative w-full lg:max-w-xl"><Search aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-tj-muted" size={18} /><Input aria-label="Cari nama petani" className="pl-10" onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama petani" value={query} /></div>
          <div aria-label="Filter saldo kasbon" className="flex gap-2 overflow-x-auto pb-0.5 lg:shrink-0" role="group">{(Object.keys(filterLabels) as BalanceFilter[]).map((value) => <button className={cn("min-h-10 shrink-0 rounded-xl px-3 text-sm font-semibold", filter === value ? "bg-tj-primary text-white" : "border border-tj-border bg-tj-surface text-tj-muted hover:bg-tj-primary-soft")} key={value} onClick={() => setFilter(value)} type="button">{filterLabels[value]}</button>)}</div>
        </CardContent></Card>

        <div className="mt-4 space-y-3 lg:hidden">{rows.map(({ farmer, balance, latestEntry }) => <Link aria-label={`Buka kasbon ${farmer.name}`} className="block" href={`/kasbon/${farmer.id}`} key={farmer.id}><Card className="transition-colors hover:border-tj-primary"><CardContent className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-base font-bold text-tj-text">{farmer.name}</p><p className="mt-1 text-xs text-tj-muted">{latestEntry ? `Aktivitas: ${formatKasbonDate(latestEntry.date)}` : "Belum ada aktivitas kasbon"}</p></div><FarmerStatus status={farmer.status} /></div><div className="mt-4 flex items-center justify-between border-t border-tj-border pt-3"><div><p className="text-xs text-tj-muted">Saldo kasbon</p><p className="mt-1 text-base font-bold text-tj-primary-strong">{formatRupiah(balance)}</p></div><ChevronRight aria-hidden="true" className="text-tj-primary" size={20} /></div></CardContent></Card></Link>)}</div>

        <Card className="mt-4 hidden overflow-hidden lg:block"><div className="overflow-x-auto"><table className="min-w-full text-left"><thead className="border-b border-tj-border bg-tj-canvas text-xs font-semibold text-tj-muted"><tr><th className="px-5 py-3">Petani</th><th className="px-5 py-3">Aktivitas Terakhir</th><th className="px-5 py-3 text-right">Saldo Kasbon</th><th className="px-5 py-3">Status</th><th className="px-5 py-3"><span className="sr-only">Aksi</span></th></tr></thead><tbody className="divide-y divide-tj-border">{rows.map(({ farmer, balance, latestEntry }) => <tr className="hover:bg-tj-canvas" key={farmer.id}><td className="px-5 py-4 text-sm font-semibold text-tj-text">{farmer.name}</td><td className="px-5 py-4 text-sm text-tj-muted">{latestEntry ? `${latestEntry.type === "GIVEN" ? "Kasbon diberikan" : "Potongan totalan"} · ${formatKasbonDate(latestEntry.date)}` : "Belum ada aktivitas"}</td><td className="px-5 py-4 text-right text-sm font-bold text-tj-primary-strong">{formatRupiah(balance)}</td><td className="px-5 py-4"><FarmerStatus status={farmer.status} /></td><td className="px-5 py-4 text-right"><Link className="inline-flex h-10 items-center gap-1 rounded-lg px-3 text-sm font-semibold text-tj-primary hover:bg-tj-primary-soft" href={`/kasbon/${farmer.id}`}>Detail <ChevronRight aria-hidden="true" size={16} /></Link></td></tr>)}{!rows.length && <tr><td className="px-5 py-8 text-center text-sm text-tj-muted" colSpan={5}>Tidak ada petani yang sesuai.</td></tr>}</tbody></table></div></Card>
        {!rows.length && <Card className="mt-4 lg:hidden"><CardContent className="p-5 text-center text-sm text-tj-muted">Tidak ada petani yang sesuai.</CardContent></Card>}
      </ContentContainer>
    </div>
  );
}
