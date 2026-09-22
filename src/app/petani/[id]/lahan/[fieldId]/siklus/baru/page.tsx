import { CycleForm } from "@/components/farmers/cycle-form";
import { AppShell } from "@/components/layout/app-shell";
import { getFarmerById } from "@/lib/farmers";
import { getFieldById } from "@/lib/fields";

export default async function TambahSiklusPage({
  params,
}: PageProps<"/petani/[id]/lahan/[fieldId]/siklus/baru">) {
  const { id, fieldId } = await params;
  const farmer = getFarmerById(id);
  const field = getFieldById(fieldId);

  return <AppShell><CycleForm farmerId={id} farmerName={farmer?.name} fieldId={fieldId} fieldName={field?.farmerId === id ? field.name : undefined} mode="create" /></AppShell>;
}
