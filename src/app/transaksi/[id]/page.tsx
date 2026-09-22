import { DetailTransactionPage } from "@/components/transactions/detail-transaction-page";
import { AppShell } from "@/components/layout/app-shell";
import { getTransactionById } from "@/lib/transactions";

export default async function DetailTransaksiRoutePage({ params }: PageProps<"/transaksi/[id]">) {
  const { id } = await params;
  return <AppShell><DetailTransactionPage initialTransaction={getTransactionById(id)} transactionId={id} /></AppShell>;
}
