import { AppShell } from "@/components/layout/app-shell";
import { SalesNotaPage } from "@/components/transactions/sales-nota-page";

export default async function SalesNotaRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AppShell><SalesNotaPage saleId={id} /></AppShell>;
}
