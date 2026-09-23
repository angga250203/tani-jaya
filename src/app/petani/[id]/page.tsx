import { DetailPetaniPage } from "@/components/farmers/detail-petani-page";
import { AppShell } from "@/components/layout/app-shell";

export default async function DetailPetaniRoutePage({
  params,
}: PageProps<"/petani/[id]">) {
  const { id } = await params;
  return <AppShell><DetailPetaniPage farmerId={id} /></AppShell>;
}
