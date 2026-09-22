import { AppShell } from "@/components/layout/app-shell";
import { ScheduleDetailLoader } from "@/components/schedules/schedule-detail-loader";

export default async function DetailJadwalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AppShell><ScheduleDetailLoader scheduleId={id} /></AppShell>;
}
