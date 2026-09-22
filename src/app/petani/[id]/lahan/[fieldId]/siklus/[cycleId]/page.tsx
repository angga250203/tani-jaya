import { DetailSiklusPage } from "@/components/farmers/detail-siklus-page";
import { AppShell } from "@/components/layout/app-shell";
import { getFieldById } from "@/lib/fields";

export default async function DetailSiklusRoutePage({
  params,
}: PageProps<"/petani/[id]/lahan/[fieldId]/siklus/[cycleId]">) {
  const { id, fieldId, cycleId } = await params;
  const initialCycle = getFieldById(fieldId)?.cycles.find((cycle) => cycle.id === cycleId);

  return <AppShell><DetailSiklusPage cycleId={cycleId} farmerId={id} fieldId={fieldId} initialCycle={initialCycle} /></AppShell>;
}
