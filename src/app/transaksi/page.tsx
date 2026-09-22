import { TransactionsPage } from "@/components/transactions/transactions-page";
import { AppShell } from "@/components/layout/app-shell";

type PageProps = { searchParams: Promise<{ tab?: string }> };

export default async function TransaksiPage({ searchParams }: PageProps) {
  const { tab } = await searchParams;
  return <AppShell><TransactionsPage initialTab={tab === "penjualan" ? "penjualan" : "pembelian"} /></AppShell>;
}
