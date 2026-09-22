"use client";

import Link from "next/link";
import { ReceiptText } from "lucide-react";
import { usePathname } from "next/navigation";

/** A focused entry point shown only on a Sales detail, never on the Nota itself. */
export function SalesNotaShortcut() {
  const pathname = usePathname();
  const match = pathname.match(/^\/transaksi\/penjualan\/([^/]+)$/);
  if (!match) return null;

  return <Link aria-label="Lihat Nota Penjualan" className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-40 inline-flex min-h-11 items-center gap-2 rounded-xl bg-tj-primary px-4 text-sm font-semibold text-white shadow-[var(--tj-shadow-md)] transition-colors hover:bg-tj-primary-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tj-primary focus-visible:ring-offset-2 print:hidden lg:bottom-8 lg:right-8" href={`/transaksi/penjualan/${match[1]}/nota`}><ReceiptText aria-hidden="true" size={18} />Lihat Nota</Link>;
}
