import { CycleForm } from "@/components/farmers/cycle-form";
import { AppShell } from "@/components/layout/app-shell";

export default async function EditSiklusPage({
  params,
}: PageProps<"/petani/[id]/lahan/[fieldId]/siklus/[cycleId]/edit">) {
  const { id, fieldId, cycleId } = await params;
  return <AppShell><CycleForm cycleId={cycleId} farmerId={id} fieldId={fieldId} mode="edit" /></AppShell>;
}
