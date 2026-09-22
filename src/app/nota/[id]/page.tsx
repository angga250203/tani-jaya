import { AppShell } from "@/components/layout/app-shell";
import { NotaDetailPage } from "@/components/notas/nota-detail-page";

export default async function DetailNotaRoutePage({ params }: PageProps<"/nota/[id]">) {
  const { id } = await params;
  return <AppShell><NotaDetailPage notaId={id} /></AppShell>;
}
