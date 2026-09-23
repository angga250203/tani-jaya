import { DetailSiklusPage } from "@/components/farmers/detail-siklus-page";
import { AppShell } from "@/components/layout/app-shell";

export default async function DetailSiklusRoutePage({
  params,
}: PageProps<"/petani/[id]/lahan/[fieldId]/siklus/[cycleId]">) {
  const { id, fieldId, cycleId } = await params;
  return <AppShell><DetailSiklusPage cycleId={cycleId} farmerId={id} fieldId={fieldId} /></AppShell>;
}
