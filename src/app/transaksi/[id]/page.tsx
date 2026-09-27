import { DetailTransactionPage } from "@/components/transactions/detail-transaction-page";
import { AppShell } from "@/components/layout/app-shell";

export default async function DetailTransaksiRoutePage({ params }: PageProps<"/transaksi/[id]">) {
  const { id } = await params;
  return <AppShell><DetailTransactionPage transactionId={id} /></AppShell>;
}
