"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, CheckCircle2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { ResponsiveConfirmDialog } from "@/components/farmers/farmer-form";
import { useKasbons } from "@/components/kasbons/kasbons-provider";
import { ContentContainer } from "@/components/layout/content-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Farmer } from "@/lib/farmers";
import { useFarmers } from "@/components/farmers/farmers-provider";
import { emptyNumericValue, toOptionalInteger } from "@/lib/form-numbers";
import { getOperationalDateISO } from "@/lib/operational-date";
import { formatRupiah } from "@/lib/utils";
import { kasbonFormSchema, type KasbonFormValues } from "@/lib/validations";

export function KasbonForm({ farmerId, initialFarmer }: { farmerId: string; initialFarmer?: Farmer }) {
  const router = useRouter();
  const { addKasbon, getBalance } = useKasbons();
  const { records } = useFarmers();
  const farmer = records.find((record) => record.id === farmerId) ?? initialFarmer;
  const reduceMotion = useReducedMotion();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<KasbonFormValues | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { control, formState: { errors }, handleSubmit, register } = useForm<KasbonFormValues>({
    defaultValues: { date: getOperationalDateISO(), amount: emptyNumericValue, note: "" },
    resolver: zodResolver(kasbonFormSchema),
  });
  const amount = useWatch({ control, name: "amount" }) ?? 0;

  useEffect(() => () => { if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current); }, []);

  const saveKasbon = async () => {
    const values = pendingValues;
    if (!values || !values.date || !values.amount || values.amount <= 0) return;
    const result = await addKasbon({ farmerId, date: values.date, amount: values.amount, note: values.note });
    if (result.error) { setConfirmOpen(false); setToast(result.error); return; }
    setConfirmOpen(false);
    setToast("Kasbon berhasil ditambahkan.");
    redirectTimerRef.current = setTimeout(() => router.push(`/kasbon/${farmerId}`), 700);
  };

  if (!farmer) {
    return <div className="py-5 sm:py-6 lg:py-8"><ContentContainer><Card className="mx-auto max-w-xl"><CardContent className="p-5"><h1 className="text-lg font-bold text-tj-text">Petani tidak ditemukan</h1><Button className="mt-5" onClick={() => router.push("/kasbon")} variant="secondary">Kembali ke Kasbon</Button></CardContent></Card></ContentContainer></div>;
  }

  if (farmer.status === "inactive") {
    return <div className="py-5 sm:py-6 lg:py-8"><ContentContainer><Card className="mx-auto max-w-xl"><CardContent className="p-5"><h1 className="text-lg font-bold text-tj-text">Kasbon tidak dapat ditambahkan</h1><p className="mt-2 text-sm leading-6 text-tj-muted">{farmer.name} berstatus nonaktif. Riwayat kasbon tetap dapat dilihat, tetapi penambahan baru menunggu konfirmasi aturan bisnis final.</p><Button className="mt-5" onClick={() => router.push(`/kasbon/${farmer.id}`)} variant="secondary">Kembali ke Detail Kasbon</Button></CardContent></Card></ContentContainer></div>;
  }

  return <div className="py-5 sm:py-6 lg:py-8"><ContentContainer>
    <header className="flex items-center gap-3 border-b border-tj-border pb-5 lg:pb-6"><button aria-label="Kembali ke Detail Kasbon" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-tj-muted hover:bg-tj-primary-soft hover:text-tj-primary" onClick={() => router.push(`/kasbon/${farmer.id}`)} type="button"><ArrowLeft aria-hidden="true" size={21} /></button><div className="min-w-0"><p className="text-xs font-medium text-tj-muted sm:text-sm">Kasbon · {farmer.name}</p><h1 className="text-[19px] font-bold leading-6 tracking-[-0.02em] text-tj-text lg:text-[28px] lg:leading-8">Tambah Kasbon</h1></div></header>
    <form className="mt-5 max-w-xl space-y-5 lg:mt-7" noValidate onSubmit={handleSubmit((values) => { setPendingValues(values); setConfirmOpen(true); })}><Card><CardContent className="space-y-4 p-4 lg:p-5"><div className="rounded-xl bg-tj-primary-soft p-3"><p className="text-xs font-medium text-tj-primary">Petani</p><p className="mt-1 text-sm font-bold text-tj-primary-strong">{farmer.name}</p><p className="mt-1 text-xs text-tj-primary">Saldo saat ini: {formatRupiah(getBalance(farmer.id))}</p></div><div className="space-y-1.5"><label className="text-sm font-semibold text-tj-text" htmlFor="kasbon-date">Tanggal</label><Input aria-invalid={Boolean(errors.date)} className={errors.date ? "border-tj-danger" : undefined} id="kasbon-date" type="date" {...register("date")} />{errors.date?.message && <p className="text-xs text-tj-danger">{errors.date.message}</p>}</div><div className="space-y-1.5"><label className="text-sm font-semibold text-tj-text" htmlFor="kasbon-amount">Nominal Kasbon</label><Input aria-invalid={Boolean(errors.amount)} className={errors.amount ? "border-tj-danger" : undefined} id="kasbon-amount" inputMode="numeric" min={1} placeholder="Masukkan nominal Rupiah" type="number" {...register("amount", { setValueAs: toOptionalInteger })} />{errors.amount?.message && <p className="text-xs text-tj-danger">{errors.amount.message}</p>}</div><div className="space-y-1.5"><label className="text-sm font-semibold text-tj-text" htmlFor="kasbon-note">Catatan <span className="font-normal text-tj-muted">(opsional)</span></label><textarea className="min-h-24 w-full rounded-xl border border-tj-border bg-tj-surface px-3.5 py-3 text-sm text-tj-text outline-none placeholder:text-tj-muted focus:border-tj-primary" id="kasbon-note" placeholder="Contoh: Keperluan pupuk" {...register("note")} /></div></CardContent></Card><div className="flex gap-2"><Button className="flex-1" type="button" variant="secondary" onClick={() => router.push(`/kasbon/${farmer.id}`)}>Batal</Button><Button className="flex-1" type="submit">Simpan Kasbon</Button></div></form>
  </ContentContainer><ResponsiveConfirmDialog cancelLabel="Batal" confirmLabel="Tambah Kasbon" description={`${formatRupiah(amount)} akan dicatat sebagai kasbon baru untuk ${farmer.name}.`} onClose={() => setConfirmOpen(false)} onConfirm={saveKasbon} open={confirmOpen} title="Tambah Kasbon?" /><AnimatePresence initial={false}>{toast && <motion.div animate={{ opacity: 1, y: 0 }} className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] mx-auto flex max-w-md items-center gap-2 rounded-xl bg-tj-text px-4 py-3 text-sm font-semibold text-white shadow-[var(--tj-shadow-md)] lg:bottom-6" exit={{ opacity: 0, y: reduceMotion ? 0 : 8 }} initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }} role="status" transition={{ duration: reduceMotion ? 0.01 : 0.2 }}><CheckCircle2 aria-hidden="true" className="text-[#bce7c9]" size={20} /><span className="flex-1">{toast}</span><button aria-label="Tutup notifikasi" className="flex h-8 w-8 items-center justify-center" onClick={() => setToast(null)} type="button"><X aria-hidden="true" size={17} /></button></motion.div>}</AnimatePresence></div>;
}
