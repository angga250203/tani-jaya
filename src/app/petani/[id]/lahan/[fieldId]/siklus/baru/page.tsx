import { CycleForm } from "@/components/farmers/cycle-form";
import { AppShell } from "@/components/layout/app-shell";

export default async function TambahSiklusPage({
  params,
}: PageProps<"/petani/[id]/lahan/[fieldId]/siklus/baru">) {
  const { id, fieldId } = await params;
  return <AppShell><CycleForm farmerId={id} fieldId={fieldId} mode="create" /></AppShell>;
}
