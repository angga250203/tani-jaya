import { LahanForm } from "@/components/farmers/lahan-form";
import { AppShell } from "@/components/layout/app-shell";

export default async function TambahLahanPage({
  params,
}: PageProps<"/petani/[id]/lahan/baru">) {
  const { id } = await params;
  return <AppShell><LahanForm farmerId={id} mode="create" /></AppShell>;
}
