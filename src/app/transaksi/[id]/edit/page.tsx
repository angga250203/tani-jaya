import { TransactionForm } from "@/components/transactions/transaction-form";
import { AppShell } from "@/components/layout/app-shell";

export default async function EditTransaksiPage({ params }: PageProps<"/transaksi/[id]/edit">) {
  const { id } = await params;
  return <AppShell><TransactionForm mode="edit" transactionId={id} /></AppShell>;
}
