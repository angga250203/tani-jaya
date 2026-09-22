import { AppShell } from "@/components/layout/app-shell";
import { SaleCorrectionForm } from "@/components/transactions/sale-correction-form";

export default async function EditPenjualanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AppShell><SaleCorrectionForm saleId={id} /></AppShell>;
}
