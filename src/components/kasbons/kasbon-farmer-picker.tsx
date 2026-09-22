"use client";

import { ArrowLeft, ChevronRight, WalletCards } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFarmers } from "@/components/farmers/farmers-provider";
import { ContentContainer } from "@/components/layout/content-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SelectField } from "@/components/ui/input";

export function KasbonFarmerPicker() {
  const router = useRouter();
  const { records } = useFarmers();
  const [farmerId, setFarmerId] = useState("");
  const activeFarmers = records.filter((farmer) => farmer.status === "active");

  return <div className="py-5 sm:py-6 lg:py-8"><ContentContainer><header className="flex items-center gap-3 border-b border-tj-border pb-5 lg:pb-6"><button aria-label="Kembali ke Kasbon" className="flex h-11 w-11 items-center justify-center rounded-xl text-tj-muted hover:bg-tj-primary-soft hover:text-tj-primary" onClick={() => router.push("/kasbon")} type="button"><ArrowLeft aria-hidden="true" size={21} /></button><div><p className="text-xs font-medium text-tj-muted sm:text-sm">Kasbon</p><h1 className="text-[19px] font-bold leading-6 tracking-[-0.02em] text-tj-text lg:text-[28px] lg:leading-8">Pilih Petani</h1></div></header><Card className="mx-auto mt-5 max-w-xl lg:mt-7"><CardContent className="space-y-5 p-4 lg:p-5"><div className="flex items-start gap-3 rounded-xl bg-tj-primary-soft p-3"><WalletCards aria-hidden="true" className="mt-0.5 text-tj-primary" size={20} /><p className="text-sm leading-6 text-tj-primary-strong">Pilih petani aktif sebelum mencatat kasbon baru.</p></div><div className="space-y-1.5"><label className="text-sm font-semibold text-tj-text" htmlFor="quick-kasbon-farmer">Petani</label><SelectField id="quick-kasbon-farmer" onChange={(event) => setFarmerId(event.target.value)} value={farmerId}><option value="">Pilih petani mitra</option>{activeFarmers.map((farmer) => <option key={farmer.id} value={farmer.id}>{farmer.name}</option>)}</SelectField></div><Button className="w-full" disabled={!farmerId} onClick={() => router.push(`/kasbon/${farmerId}/baru`)}>Lanjutkan <ChevronRight aria-hidden="true" size={18} /></Button></CardContent></Card></ContentContainer></div>;
}
