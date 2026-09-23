"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { FarmersProvider } from "@/components/farmers/farmers-provider";
import { KasbonsProvider } from "@/components/kasbons/kasbons-provider";
import { SchedulesProvider } from "@/components/schedules/schedules-provider";
import { StocksProvider } from "@/components/stocks/stocks-provider";
import { TotalansProvider } from "@/components/totalans/totalans-provider";
import { SalesProvider } from "@/components/transactions/sales-provider";
import { TransactionsProvider } from "@/components/transactions/transactions-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") return children;

  return (
    <FarmersProvider>
      <SchedulesProvider>
        <TransactionsProvider>
          <StocksProvider>
            <SalesProvider>
              <KasbonsProvider>
                <TotalansProvider>{children}</TotalansProvider>
              </KasbonsProvider>
            </SalesProvider>
          </StocksProvider>
        </TransactionsProvider>
      </SchedulesProvider>
    </FarmersProvider>
  );
}
