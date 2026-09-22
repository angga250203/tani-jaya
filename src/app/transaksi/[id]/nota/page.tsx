import { AppShell } from "@/components/layout/app-shell";
import { ThermalReceiptPreview } from "@/components/transactions/thermal-receipt-preview";

export default async function TransactionReceiptPage({ params }: PageProps<"/transaksi/[id]/nota">) {
  const { id } = await params;
  return <AppShell><ThermalReceiptPreview transactionId={id} /></AppShell>;
}
