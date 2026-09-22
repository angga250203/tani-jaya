"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent } from "react";
import { ContentContainer } from "@/components/layout/content-container";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import { PurchaseHistory } from "./purchase-history";
import { SalesHistory } from "./sales-history";

type TransactionTab = "pembelian" | "penjualan";

function TransactionTabs({ activeTab, onSelect }: { activeTab: TransactionTab; onSelect: (tab: TransactionTab) => void }) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      onSelect(activeTab === "pembelian" ? "penjualan" : "pembelian");
    }
  };
  return <div aria-label="Jenis transaksi" className="grid max-w-md grid-cols-2 rounded-xl bg-tj-primary-soft p-1" onKeyDown={handleKeyDown} role="tablist">{(["pembelian", "penjualan"] as TransactionTab[]).map((tab) => <button aria-controls={`${tab}-panel`} aria-selected={activeTab === tab} className={cn("min-h-11 rounded-lg px-3 text-sm font-semibold transition-colors", activeTab === tab ? "bg-tj-surface text-tj-primary-strong shadow-[var(--tj-shadow-sm)]" : "text-tj-muted hover:text-tj-text")} id={`${tab}-tab`} key={tab} onClick={() => onSelect(tab)} role="tab" tabIndex={activeTab === tab ? 0 : -1} type="button">{tab === "pembelian" ? "Pembelian" : "Penjualan"}</button>)}</div>;
}

export function TransactionsPage({ initialTab }: { initialTab: TransactionTab }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const activeTab = initialTab;
  const selectTab = (tab: TransactionTab) => {
    router.replace(tab === "penjualan" ? "/transaksi?tab=penjualan" : "/transaksi", { scroll: false });
  };
  const header = activeTab === "penjualan" ? { title: "Penjualan", subtitle: "Riwayat nota dan piutang pembeli", actionLabel: "Penjualan Baru", actionHref: "/transaksi/penjualan/baru" } : { title: "Pembelian", subtitle: "Riwayat transaksi pembelian dari petani dan penjual", actionLabel: "Pembelian Baru", actionHref: "/transaksi/baru" };

  return <div className="py-5 sm:py-6 lg:py-8"><ContentContainer><PageHeader actionHref={header.actionHref} actionLabel={header.actionLabel} subtitle={header.subtitle} title={header.title} /><div className="mt-5 lg:mt-6"><TransactionTabs activeTab={activeTab} onSelect={selectTab} /></div><AnimatePresence initial={false} mode="wait"><motion.div animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : -5 }} initial={{ opacity: 0, y: reduceMotion ? 0 : 5 }} key={activeTab} transition={{ duration: reduceMotion ? 0.01 : 0.18, ease: "easeOut" }}><div aria-labelledby={`${activeTab}-tab`} id={`${activeTab}-panel`} role="tabpanel">{activeTab === "pembelian" ? <PurchaseHistory /> : <SalesHistory />}</div></motion.div></AnimatePresence></ContentContainer></div>;
}
