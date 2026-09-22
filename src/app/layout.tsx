import type { Metadata } from "next";
import { FarmersProvider } from "@/components/farmers/farmers-provider";
import { KasbonsProvider } from "@/components/kasbons/kasbons-provider";
import { TotalansProvider } from "@/components/totalans/totalans-provider";
import { TransactionsProvider } from "@/components/transactions/transactions-provider";
import { SchedulesProvider } from "@/components/schedules/schedules-provider";
import { StocksProvider } from "@/components/stocks/stocks-provider";
import { SalesProvider } from "@/components/transactions/sales-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tani Jaya",
  description: "Operasional pengepul sayur Tani Jaya",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body><FarmersProvider><SchedulesProvider><TransactionsProvider><StocksProvider><SalesProvider><KasbonsProvider><TotalansProvider>{children}</TotalansProvider></KasbonsProvider></SalesProvider></StocksProvider></TransactionsProvider></SchedulesProvider></FarmersProvider></body>
    </html>
  );
}
