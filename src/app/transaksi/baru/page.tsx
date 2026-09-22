import { TransactionForm } from "@/components/transactions/transaction-form";
import { AppShell } from "@/components/layout/app-shell";

export default function TransaksiBaruPage() {
  return <AppShell><Suspense fallback={null}><TransactionForm mode="create" /></Suspense></AppShell>;
}
import { Suspense } from "react";
