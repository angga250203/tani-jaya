import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { TotalanForm } from "@/components/totalans/totalan-form";

export default function BuatTotalanPage() {
  return <AppShell><Suspense fallback={null}><TotalanForm /></Suspense></AppShell>;
}
