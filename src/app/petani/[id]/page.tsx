import { notFound } from "next/navigation";
import { DetailPetaniPage } from "@/components/farmers/detail-petani-page";
import { AppShell } from "@/components/layout/app-shell";
import { getFarmerDetailById } from "@/lib/farmers";

export default async function DetailPetaniRoutePage({
  params,
}: PageProps<"/petani/[id]">) {
  const { id } = await params;
  const farmer = getFarmerDetailById(id);

  if (!farmer) {
    notFound();
  }

  return <AppShell><DetailPetaniPage farmer={farmer} /></AppShell>;
}
