import { KasbonDetailPage } from "@/components/kasbons/kasbon-detail-page";
import { AppShell } from "@/components/layout/app-shell";

export default async function DetailKasbonRoutePage({ params }: PageProps<"/kasbon/[petaniId]">) {
  const { petaniId } = await params;
  return <AppShell><KasbonDetailPage farmerId={petaniId} /></AppShell>;
}
