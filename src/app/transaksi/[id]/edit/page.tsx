import { TransactionForm } from "@/components/transactions/transaction-form";
import { AppShell } from "@/components/layout/app-shell";
import { getTransactionById } from "@/lib/transactions";

export default async function EditTransaksiPage({ params }: PageProps<"/transaksi/[id]/edit">) {
  const { id } = await params;
  return <AppShell><TransactionForm initialTransaction={getTransactionById(id)} mode="edit" transactionId={id} /></AppShell>;
}
