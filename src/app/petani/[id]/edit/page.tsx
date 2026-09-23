import { FarmerForm } from "@/components/farmers/farmer-form";
import { AppShell } from "@/components/layout/app-shell";

export default async function EditPetaniPage({
  params,
}: PageProps<"/petani/[id]/edit">) {
  const { id } = await params;
  return <AppShell><FarmerForm farmerId={id} mode="edit" /></AppShell>;
}
