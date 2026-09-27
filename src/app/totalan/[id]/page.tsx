import { AppShell } from "@/components/layout/app-shell";
import { DetailTotalanPage } from "@/components/totalans/detail-totalan-page";

export default async function DetailTotalanRoutePage({ params }: PageProps<"/totalan/[id]">) {
  const { id } = await params;
  return <AppShell><DetailTotalanPage totalanId={id} /></AppShell>;
}
