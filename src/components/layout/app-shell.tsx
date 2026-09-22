import type { ReactNode } from "react";
import { DesktopSidebar } from "./desktop-sidebar";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { PageTransition } from "./page-transition";
import { SalesNotaShortcut } from "@/components/transactions/sales-nota-shortcut";
import { SalesManagementActions } from "@/components/transactions/sales-management-actions";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-tj-canvas">
      <DesktopSidebar />
      <main className="min-h-dvh pb-24 lg:pl-[248px] lg:pb-0"><PageTransition>{children}</PageTransition></main>
      <SalesNotaShortcut />
      <SalesManagementActions />
      <MobileBottomNav />
    </div>
  );
}
