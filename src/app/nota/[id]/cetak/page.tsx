import { NotaPrintPage } from "@/components/notas/nota-print-page";

export default async function CetakNotaRoutePage({ params }: PageProps<"/nota/[id]/cetak">) {
  const { id } = await params;
  return <NotaPrintPage notaId={id} />;
}
