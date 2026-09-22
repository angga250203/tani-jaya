"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ClipboardList, FilePenLine, MoreHorizontal, Trash2, X, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useSales } from "@/components/transactions/sales-provider";

type DialogMode = "cancel" | "delete" | "history" | null;

function ManagementDialog({
  mode,
  saleId,
  onClose,
}: {
  mode: DialogMode;
  saleId: string;
  onClose: () => void;
}) {
  const { cancelMockSale, deleteMockSale, sales } = useSales();
  const router = useRouter();
  const sale = sales.find((record) => record.id === saleId);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => { if (mode) closeRef.current?.focus(); }, [mode]);
  useEffect(() => {
    if (!mode) return;
    const handleEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [mode, onClose]);

  if (!sale) return null;
  const title = mode === "cancel" ? "Batalkan Penjualan" : mode === "delete" ? "Hapus Penjualan" : "Riwayat Perubahan";
  const confirm = () => {
    if (mode === "cancel") {
      const result = cancelMockSale(sale.id, reason);
      if (!result.ok) { setError(result.error); return; }
      setToast("Penjualan berhasil dibatalkan.");
      window.setTimeout(onClose, 420);
      return;
    }
    if (mode === "delete") {
      const result = deleteMockSale(sale.id);
      if (!result.ok) { setError(result.error); return; }
      setToast("Penjualan berhasil dihapus.");
      window.setTimeout(() => router.push("/transaksi?tab=penjualan"), 420);
    }
  };

  return <AnimatePresence initial={false}>{mode && <motion.div animate={{ opacity: 1 }} className="fixed inset-0 z-[80]" exit={{ opacity: 0 }} initial={{ opacity: 0 }}><button aria-label={`Tutup ${title}`} className="absolute inset-0 cursor-default bg-tj-text/35" onClick={onClose} type="button" /><motion.div animate={{ opacity: 1, scale: 1, y: 0 }} aria-labelledby="sales-management-title" aria-modal="true" className="absolute inset-x-0 bottom-0 max-h-[84dvh] overflow-y-auto rounded-t-[24px] bg-tj-surface px-4 pt-3 shadow-[0_-12px_32px_rgb(14_61_35_/_0.18)] lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:w-full lg:max-w-[520px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl lg:px-6 lg:shadow-[var(--tj-shadow-md)]" exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 56 }} initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 56 }} role="dialog" transition={{ duration: reduceMotion ? 0.01 : 0.2, ease: "easeOut" }}><div aria-hidden="true" className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-tj-border lg:hidden" /><div className="mb-4 flex min-h-11 items-center justify-between gap-3"><h2 className="text-lg font-bold text-tj-text" id="sales-management-title">{title}</h2><button aria-label={`Tutup ${title}`} className="flex h-11 w-11 items-center justify-center rounded-xl text-tj-muted hover:bg-tj-canvas" onClick={onClose} ref={closeRef} type="button"><X aria-hidden="true" size={21} /></button></div>{mode === "history" ? <div className="pb-[max(1rem,env(safe-area-inset-bottom))]"><p className="text-sm text-tj-muted">Catatan administratif untuk {sale.saleNumber}.</p><div className="mt-4 space-y-3">{sale.changeEvents?.length ? [...sale.changeEvents].reverse().map((entry) => <article className="rounded-xl border border-tj-border p-3.5" key={entry.id}><p className="font-semibold text-tj-text">{entry.eventType === "CORRECTED" ? "Penjualan dikoreksi" : "Penjualan dibatalkan"}</p><p className="mt-1 text-sm leading-5 text-tj-muted">{entry.reason}</p><p className="mt-2 text-xs text-tj-muted">{new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(entry.occurredAt))}</p></article>) : <p className="rounded-xl bg-tj-canvas p-4 text-sm text-tj-muted">Belum ada riwayat koreksi atau pembatalan.</p>}</div></div> : <><div className="rounded-xl bg-tj-warning-soft px-3.5 py-3 text-sm leading-5 text-tj-warning">{mode === "cancel" ? "Penjualan akan ditandai Dibatalkan. Riwayat dan pembayaran tetap tersimpan, stok dikembalikan, dan tidak ada refund otomatis." : "Penjualan aktif tanpa riwayat pembayaran akan dihapus permanen. Stok akan dikembalikan ke ketersediaan."}</div>{mode === "cancel" && <label className="mt-4 block space-y-1.5"><span className="text-sm font-semibold text-tj-text">Alasan pembatalan</span><textarea autoFocus className="min-h-24 w-full rounded-xl border border-tj-border bg-tj-surface px-3.5 py-3 text-sm text-tj-text outline-none focus:border-tj-primary" onChange={(event) => setReason(event.target.value)} placeholder="Jelaskan alasan pembatalan" value={reason} /></label>}{error && <p className="mt-4 rounded-xl bg-tj-danger-soft px-3 py-2.5 text-sm font-medium text-tj-danger" role="alert">{error}</p>}{toast && <p className="mt-4 rounded-xl bg-tj-success-soft px-3 py-2.5 text-sm font-semibold text-tj-success" role="status">{toast}</p>}<div className="mt-5 flex gap-2 border-t border-tj-border pb-[max(1rem,env(safe-area-inset-bottom))] pt-3"><Button className="flex-1" onClick={onClose} variant="secondary">Kembali</Button><Button className="flex-1" onClick={confirm} variant="danger">{mode === "cancel" ? "Batalkan Penjualan" : "Hapus Permanen"}</Button></div></>}</motion.div></motion.div>}</AnimatePresence>;
}

/** Admin-only controls for the Sale detail. Buyer Nota routes never render these actions. */
export function SalesManagementActions() {
  const pathname = usePathname();
  const match = pathname.match(/^\/transaksi\/penjualan\/([^/]+)$/);
  const { sales } = useSales();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  if (!match) return null;
  const sale = sales.find((record) => record.id === match[1]);
  if (!sale) return null;
  const active = sale.lifecycleStatus === "ACTIVE";

  return <><div className="fixed bottom-[calc(9rem+env(safe-area-inset-bottom))] right-4 z-40 print:hidden lg:bottom-24 lg:right-8"><div className="relative"><AnimatePresence>{menuOpen && <motion.div animate={{ opacity: 1, y: 0 }} className="absolute bottom-[calc(100%+0.5rem)] right-0 w-56 overflow-hidden rounded-2xl border border-tj-border bg-tj-surface p-1.5 shadow-[var(--tj-shadow-md)]" exit={{ opacity: 0, y: 4 }} initial={{ opacity: 0, y: 4 }} transition={{ duration: 0.16 }}><button className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-tj-text hover:bg-tj-canvas" onClick={() => { setMenuOpen(false); setDialogMode("history"); }} type="button"><ClipboardList aria-hidden="true" size={18} />Riwayat Perubahan</button>{active && <Link className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-tj-text hover:bg-tj-canvas" href={`/transaksi/penjualan/${sale.id}/edit`} onClick={() => setMenuOpen(false)}><FilePenLine aria-hidden="true" size={18} />Koreksi</Link>}{active && <button className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-tj-warning hover:bg-tj-warning-soft" onClick={() => { setMenuOpen(false); setDialogMode("cancel"); }} type="button"><XCircle aria-hidden="true" size={18} />Batalkan</button>}{active && sale.payments.length === 0 && <button className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-tj-danger hover:bg-tj-danger-soft" onClick={() => { setMenuOpen(false); setDialogMode("delete"); }} type="button"><Trash2 aria-hidden="true" size={18} />Hapus Permanen</button>}</motion.div>}</AnimatePresence><button aria-expanded={menuOpen} aria-haspopup="menu" aria-label="Kelola Penjualan" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-tj-text px-4 text-sm font-semibold text-white shadow-[var(--tj-shadow-md)] transition-colors hover:bg-tj-text/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tj-primary focus-visible:ring-offset-2" onClick={() => setMenuOpen((open) => !open)} type="button"><MoreHorizontal aria-hidden="true" size={19} />Kelola</button></div></div><ManagementDialog mode={dialogMode} onClose={() => setDialogMode(null)} saleId={sale.id} /></>;
}
