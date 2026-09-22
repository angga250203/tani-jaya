import { KasbonDetailPage } from "@/components/kasbons/kasbon-detail-page";
import { AppShell } from "@/components/layout/app-shell";
import { getFarmerById } from "@/lib/farmers";

export default async function DetailKasbonRoutePage({ params }: PageProps<"/kasbon/[petaniId]">) {
  const { petaniId } = await params;
  const farmer = getFarmerById(petaniId);
  return <AppShell><KasbonDetailPage farmerId={petaniId} initialFarmer={farmer} /></AppShell>;
}
