import { CycleForm } from "@/components/farmers/cycle-form";
import { AppShell } from "@/components/layout/app-shell";
import { getFarmerById } from "@/lib/farmers";
import { getFieldById } from "@/lib/fields";

export default async function EditSiklusPage({
  params,
}: PageProps<"/petani/[id]/lahan/[fieldId]/siklus/[cycleId]/edit">) {
  const { id, fieldId, cycleId } = await params;
  const farmer = getFarmerById(id);
  const field = getFieldById(fieldId);
  const cycle = field?.cycles.find((item) => item.id === cycleId);

  const isOwnedField = field?.farmerId === id;
  return <AppShell><CycleForm cycleId={cycleId} farmerId={id} farmerName={farmer?.name} fieldId={fieldId} fieldName={isOwnedField ? field.name : undefined} initialValues={isOwnedField && cycle ? { commodity: cycle.commodity, intervalDays: cycle.intervalDays, defaultReceivingMethod: cycle.defaultReceivingMethod, notes: cycle.notes } : undefined} mode="edit" /></AppShell>;
}
