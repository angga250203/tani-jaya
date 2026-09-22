import { FarmerForm } from "@/components/farmers/farmer-form";
import { AppShell } from "@/components/layout/app-shell";
import { getFarmerById } from "@/lib/farmers";

export default async function EditPetaniPage({
  params,
}: PageProps<"/petani/[id]/edit">) {
  const { id } = await params;
  const farmer = getFarmerById(id);

  return (
    <AppShell>
      <FarmerForm
        farmerId={id}
        initialValues={farmer ? {
          name: farmer.name,
          whatsapp: farmer.whatsapp,
          landmark: farmer.id === "petani-001"
            ? "Dekat jembatan kecil, masuk sekitar 300 meter dari jalan utama."
            : farmer.landmark,
          note: farmer.id === "petani-001" ? "Biasanya panen dilakukan pagi hari." : farmer.note,
        } : undefined}
        mode="edit"
      />
    </AppShell>
  );
}
