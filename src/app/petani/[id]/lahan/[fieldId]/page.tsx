import { DetailLahanPage } from "@/components/farmers/detail-lahan-page";
import { AppShell } from "@/components/layout/app-shell";

export default async function DetailLahanRoutePage({
  params,
}: PageProps<"/petani/[id]/lahan/[fieldId]">) {
  const { id, fieldId } = await params;

  return <AppShell><DetailLahanPage farmerId={id} fieldId={fieldId} /></AppShell>;
}
