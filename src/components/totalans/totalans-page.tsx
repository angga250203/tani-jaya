"use client";

import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatTotalanDate } from "@/lib/totalans";
import { formatRupiah } from "@/lib/utils";
import { useTotalans } from "./totalans-provider";

export function TotalansPage() {
  const { totalans } = useTotalans();
  const [search, setSearch] = useState("");
  const filteredTotalans = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("id-ID");
    return totalans.filter((totalan) => !query || totalan.farmerName.toLocaleLowerCase("id-ID").includes(query));
  }, [search, totalans]);

  return (
    <div className="py-5 sm:py-6 lg:py-8">
      <ContentContainer>
        <PageHeader actionHref="/totalan/baru" actionLabel="Buat Totalan" subtitle="Pembayaran hasil panen" title="Totalan" />
        <Card className="mt-5 lg:mt-7">
          <CardContent className="p-4 lg:p-5">
            <div className="relative max-w-xl">
              <Search aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-tj-muted" size={18} />
              <Input aria-label="Cari nama petani" className="pl-10" onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama petani" value={search} />
            </div>
          </CardContent>
        </Card>

        <div className="mt-4 space-y-3 lg:hidden">
          {filteredTotalans.map((totalan) => (
            <Link aria-label={`Buka ${totalan.number}`} className="block" href={`/totalan/${totalan.id}`} key={totalan.id}>
              <Card className="transition-colors hover:border-tj-primary">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-tj-muted">{formatTotalanDate(totalan.totalanDate)}</p>
                      <p className="mt-1 truncate text-base font-bold text-tj-text">{totalan.farmerName}</p>
                      <p className="mt-0.5 text-xs text-tj-muted">{totalan.totalTransactions} transaksi</p>
                    </div>
                    <StatusBadge status="paid">Selesai</StatusBadge>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-tj-border pt-3">
                    <div><p className="text-xs text-tj-muted">Hasil Panen</p><p className="mt-1 text-sm font-bold text-tj-text">{formatRupiah(totalan.totalHarvestValue)}</p></div>
                    <div className="text-right"><p className="text-xs text-tj-muted">Dibayar</p><p className="mt-1 text-sm font-bold text-tj-primary-strong">{formatRupiah(totalan.finalPayment)}</p></div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {!filteredTotalans.length && <Card><CardContent className="p-5 text-center text-sm text-tj-muted">Tidak ada totalan yang sesuai.</CardContent></Card>}
        </div>

        <Card className="mt-4 hidden overflow-hidden lg:block">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="border-b border-tj-border bg-tj-canvas text-xs font-semibold text-tj-muted">
                <tr><th className="px-4 py-3">Tanggal</th><th className="px-4 py-3">Petani</th><th className="px-4 py-3 text-center">Transaksi</th><th className="px-4 py-3 text-right">Total Hasil</th><th className="px-4 py-3 text-right">Potongan</th><th className="px-4 py-3 text-right">Dibayar</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"><span className="sr-only">Aksi</span></th></tr>
              </thead>
              <tbody className="divide-y divide-tj-border">
                {filteredTotalans.map((totalan) => (
                  <tr className="hover:bg-tj-canvas" key={totalan.id}>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-tj-muted">{formatTotalanDate(totalan.totalanDate)}</td>
                    <td className="px-4 py-4 text-sm font-semibold text-tj-text">{totalan.farmerName}</td>
                    <td className="px-4 py-4 text-center text-sm text-tj-text">{totalan.totalTransactions}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-semibold text-tj-text">{formatRupiah(totalan.totalHarvestValue)}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-tj-muted">{totalan.kasbonDeduction ? formatRupiah(totalan.kasbonDeduction) : "—"}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-bold text-tj-primary-strong">{formatRupiah(totalan.finalPayment)}</td>
                    <td className="px-4 py-4"><StatusBadge status="paid">Selesai</StatusBadge></td>
                    <td className="px-4 py-4 text-right"><Link aria-label={`Buka ${totalan.number}`} className="inline-flex h-10 items-center gap-1 rounded-lg px-3 text-sm font-semibold text-tj-primary hover:bg-tj-primary-soft" href={`/totalan/${totalan.id}`}>Detail <ChevronRight aria-hidden="true" size={16} /></Link></td>
                  </tr>
                ))}
                {!filteredTotalans.length && <tr><td className="px-4 py-8 text-center text-sm text-tj-muted" colSpan={8}>Tidak ada totalan yang sesuai.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </ContentContainer>
    </div>
  );
}
