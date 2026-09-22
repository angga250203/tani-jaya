import { LahanForm } from "@/components/farmers/lahan-form";
import { AppShell } from "@/components/layout/app-shell";
import { getFarmerById } from "@/lib/farmers";

export default async function TambahLahanPage({
  params,
}: PageProps<"/petani/[id]/lahan/baru">) {
  const { id } = await params;
  const farmer = getFarmerById(id);

  return <AppShell><LahanForm farmerId={id} farmerName={farmer?.name} mode="create" /></AppShell>;
}
