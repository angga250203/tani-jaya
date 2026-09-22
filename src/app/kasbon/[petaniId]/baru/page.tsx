import { KasbonForm } from "@/components/kasbons/kasbon-form";
import { AppShell } from "@/components/layout/app-shell";
import { getFarmerById } from "@/lib/farmers";

export default async function TambahKasbonRoutePage({ params }: PageProps<"/kasbon/[petaniId]/baru">) {
  const { petaniId } = await params;
  const farmer = getFarmerById(petaniId);
  return <AppShell><KasbonForm farmerId={petaniId} initialFarmer={farmer} /></AppShell>;
}
