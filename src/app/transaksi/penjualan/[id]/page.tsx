import { AppShell } from "@/components/layout/app-shell";
import { SaleDetail } from "@/components/transactions/sale-detail";

export default async function DetailPenjualanPage({
  params,
}: PageProps<"/transaksi/penjualan/[id]">) {
  const { id } = await params;
  return <AppShell><SaleDetail saleId={id} /></AppShell>;
}
