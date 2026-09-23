import { LahanForm } from "@/components/farmers/lahan-form";
import { AppShell } from "@/components/layout/app-shell";

export default async function EditLahanPage({
  params,
}: PageProps<"/petani/[id]/lahan/[fieldId]/edit">) {
  const { id, fieldId } = await params;
  return <AppShell><LahanForm farmerId={id} fieldId={fieldId} mode="edit" /></AppShell>;
}
