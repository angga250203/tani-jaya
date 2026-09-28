import { AppShell } from "@/components/layout/app-shell";
import { TotalanNotaPage } from "@/components/totalans/totalan-nota-page";

type TotalanNotaPageProps = { params: Promise<{ id: string }>; searchParams: Promise<{ mode?: string }> };

export default async function TotalanNotaRoutePage({ params, searchParams }: TotalanNotaPageProps) {
  const [{ id }, { mode }] = await Promise.all([params, searchParams]);
  return <AppShell><TotalanNotaPage initialMode={mode === "thermal" ? "THERMAL" : "DIGITAL"} totalanId={id} /></AppShell>;
}
