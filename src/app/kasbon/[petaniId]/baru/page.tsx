import { KasbonForm } from "@/components/kasbons/kasbon-form";
import { AppShell } from "@/components/layout/app-shell";

export default async function TambahKasbonRoutePage({ params }: PageProps<"/kasbon/[petaniId]/baru">) {
  const { petaniId } = await params;
  return <AppShell><KasbonForm farmerId={petaniId} /></AppShell>;
}
