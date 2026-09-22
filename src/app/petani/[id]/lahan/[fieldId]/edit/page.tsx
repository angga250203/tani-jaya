import { LahanForm } from "@/components/farmers/lahan-form";
import { AppShell } from "@/components/layout/app-shell";
import { getFarmerById } from "@/lib/farmers";
import { getFieldById } from "@/lib/fields";

export default async function EditLahanPage({
  params,
}: PageProps<"/petani/[id]/lahan/[fieldId]/edit">) {
  const { id, fieldId } = await params;
  const farmer = getFarmerById(id);
  const field = getFieldById(fieldId);

  return (
    <AppShell>
      <LahanForm
        farmerId={id}
        farmerName={farmer?.name}
        fieldId={fieldId}
        initialValues={field?.farmerId === id ? { name: field.name, landmark: field.landmark, note: field.note } : undefined}
        mode="edit"
      />
    </AppShell>
  );
}
