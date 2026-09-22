"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  deriveSaleTotals,
  initialSales,
  linkAllocationsToSaleItems,
  type MockSaleCorrectionInput,
  type MockSaleCreateInput,
  type SaleChangeEvent,
  type SaleItem,
  type SalePayment,
  type SaleRecord,
  validateActiveSaleAllocations,
} from "@/lib/sales";
import { useStocks } from "@/components/stocks/stocks-provider";

type MockPaymentResult = { ok: true; payment: SalePayment } | { ok: false; error: string };
type MockMutationResult = { ok: true; sale?: SaleRecord } | { ok: false; error: string };

type SalesContextValue = {
  sales: SaleRecord[];
  createMockSale: (input: MockSaleCreateInput) => SaleRecord | null;
  recordMockPayment: (saleId: string, amount: number) => MockPaymentResult;
  correctMockSale: (saleId: string, input: MockSaleCorrectionInput) => MockMutationResult;
  cancelMockSale: (saleId: string, reason: string) => MockMutationResult;
  deleteMockSale: (saleId: string) => MockMutationResult;
};

const SalesContext = createContext<SalesContextValue | null>(null);

/** TODO: replace this isolated mock generator with public.create_sale Supabase RPC. */
function nextMockSaleNumber(sales: SaleRecord[], saleDate: string) {
  const datePart = saleDate.replaceAll("-", "");
  const sequence = sales.filter((sale) => sale.saleDate === saleDate).length + 1;
  return `PJ-${datePart}-${String(sequence).padStart(4, "0")}`;
}

function event(eventType: SaleChangeEvent["eventType"], reason: string): SaleChangeEvent {
  return { id: `sale-change-local-${Date.now()}`, eventType, reason: reason.trim(), occurredAt: new Date().toISOString() };
}

function toSaleItems(items: MockSaleCorrectionInput["items"], seed: number): SaleItem[] {
  return items.map((saleItem, index) => ({ ...saleItem, id: `sale-item-local-${seed}-${index}` }));
}

export function SalesProvider({ children }: { children: ReactNode }) {
  const [sales, setSales] = useState<SaleRecord[]>(initialSales);
  const { releaseStock, replaceSaleStock, reserveStock } = useStocks();

  const createMockSale = useCallback((input: MockSaleCreateInput) => {
    const saleDate = "2026-09-22";
    const idSeed = Date.now();
    const items = input.items.map((saleItem, index) => ({ ...saleItem, id: `sale-item-local-${idSeed}-${index}` }));
    const allocations = linkAllocationsToSaleItems(input.allocations, items);
    if (!allocations) return null;
    const sale: SaleRecord = {
      id: `penjualan-local-${idSeed}`,
      saleNumber: nextMockSaleNumber(sales, saleDate),
      saleDate,
      buyerName: input.buyerName.trim(),
      buyerType: input.buyerType,
      deliveryMethod: input.deliveryMethod,
      expeditionName: input.expeditionName?.trim() || undefined,
      expeditionRatePerKg: input.expeditionRatePerKg,
      lifecycleStatus: "ACTIVE",
      items,
      payments: [],
      allocations,
    };
    const totals = deriveSaleTotals(sale);
    if (input.initialPayment < 0 || input.initialPayment > totals.totalAmount || validateActiveSaleAllocations(sale) || !reserveStock(allocations)) return null;
    if (input.initialPayment > 0) {
      sale.payments = [{
        id: `sale-payment-local-${idSeed}`,
        paymentDate: saleDate,
        amount: input.initialPayment,
        remainingBalanceAfter: totals.totalAmount - input.initialPayment,
      }];
    }
    setSales((current) => [sale, ...current]);
    return sale;
  }, [reserveStock, sales]);

  /** TODO: replace with the narrow record-sale-payment Supabase RPC. */
  const recordMockPayment = useCallback((saleId: string, amount: number): MockPaymentResult => {
    const sale = sales.find((record) => record.id === saleId);
    if (!sale) return { ok: false, error: "Transaksi penjualan tidak ditemukan." };
    const totals = deriveSaleTotals(sale);
    if (sale.lifecycleStatus !== "ACTIVE") return { ok: false, error: "Pembayaran tidak dapat dicatat pada transaksi yang dibatalkan." };
    if (!Number.isSafeInteger(amount) || amount <= 0) return { ok: false, error: "Nominal pembayaran harus lebih dari Rp0." };
    if (amount > totals.remainingBalance) return { ok: false, error: "Pembayaran tidak boleh melebihi sisa piutang." };

    const payment: SalePayment = {
      id: `sale-payment-local-${Date.now()}`,
      paymentDate: "2026-09-22",
      amount,
      remainingBalanceAfter: totals.remainingBalance - amount,
    };
    setSales((current) => current.map((record) => record.id === saleId ? { ...record, payments: [...record.payments, payment] } : record));
    return { ok: true, payment };
  }, [sales]);

  /** TODO: replace with public.correct_sale RPC; it keeps the payment ledger immutable. */
  const correctMockSale = useCallback((saleId: string, input: MockSaleCorrectionInput): MockMutationResult => {
    const sale = sales.find((record) => record.id === saleId);
    const reason = input.reason.trim();
    if (!sale) return { ok: false, error: "Transaksi penjualan tidak ditemukan." };
    if (sale.lifecycleStatus !== "ACTIVE") return { ok: false, error: "Transaksi yang dibatalkan tidak dapat dikoreksi." };
    if (!reason) return { ok: false, error: "Alasan koreksi wajib diisi." };
    if (!input.buyerName.trim() || !input.items.length || !input.allocations.length) return { ok: false, error: "Lengkapi data Penjualan dan stok yang digunakan." };

    const seed = Date.now();
    const items = toSaleItems(input.items, seed);
    const allocations = linkAllocationsToSaleItems(input.allocations, items);
    if (!allocations) return { ok: false, error: "Alokasi stok tidak cocok dengan item Penjualan." };
    const proposed: SaleRecord = {
      ...sale,
      buyerName: input.buyerName.trim(),
      buyerType: input.buyerType,
      deliveryMethod: input.deliveryMethod,
      expeditionName: input.deliveryMethod === "EXPEDITION" ? input.expeditionName?.trim() || undefined : undefined,
      expeditionRatePerKg: input.deliveryMethod === "EXPEDITION" ? input.expeditionRatePerKg : undefined,
      items,
      allocations,
    };
    const oldTotals = deriveSaleTotals(sale);
    const proposedTotals = deriveSaleTotals(proposed);
    const allocationError = validateActiveSaleAllocations(proposed);
    if (allocationError) return { ok: false, error: allocationError };
    if (proposedTotals.totalAmount < oldTotals.totalPaid) {
      return { ok: false, error: "Total nota setelah koreksi tidak boleh lebih kecil dari pembayaran yang sudah diterima." };
    }
    if (!replaceSaleStock(sale.allocations ?? [], allocations)) {
      return { ok: false, error: "Stok yang dipilih sudah tidak tersedia. Data Penjualan tidak diubah." };
    }

    const nextSale: SaleRecord = { ...proposed, changeEvents: [...(sale.changeEvents ?? []), event("CORRECTED", reason)] };
    setSales((current) => current.map((record) => record.id === saleId ? nextSale : record));
    return { ok: true, sale: nextSale };
  }, [replaceSaleStock, sales]);

  /** TODO: replace with public.cancel_sale RPC. Cancellation retains payments and allocation history. */
  const cancelMockSale = useCallback((saleId: string, suppliedReason: string): MockMutationResult => {
    const sale = sales.find((record) => record.id === saleId);
    const reason = suppliedReason.trim();
    if (!sale) return { ok: false, error: "Transaksi penjualan tidak ditemukan." };
    if (sale.lifecycleStatus !== "ACTIVE") return { ok: false, error: "Transaksi ini sudah dibatalkan." };
    if (!reason) return { ok: false, error: "Alasan pembatalan wajib diisi." };

    releaseStock(sale.allocations ?? []);
    const nextSale: SaleRecord = {
      ...sale,
      lifecycleStatus: "CANCELLED",
      cancellationReason: reason,
      changeEvents: [...(sale.changeEvents ?? []), event("CANCELLED", reason)],
    };
    setSales((current) => current.map((record) => record.id === saleId ? nextSale : record));
    return { ok: true, sale: nextSale };
  }, [releaseStock, sales]);

  /** TODO: replace with public.hard_delete_sale RPC; payment history always blocks deletion. */
  const deleteMockSale = useCallback((saleId: string): MockMutationResult => {
    const sale = sales.find((record) => record.id === saleId);
    if (!sale) return { ok: false, error: "Transaksi penjualan tidak ditemukan." };
    if (sale.lifecycleStatus !== "ACTIVE") return { ok: false, error: "Hanya transaksi aktif yang dapat dihapus permanen." };
    if (sale.payments.length > 0) return { ok: false, error: "Transaksi dengan riwayat pembayaran tidak dapat dihapus permanen." };

    releaseStock(sale.allocations ?? []);
    setSales((current) => current.filter((record) => record.id !== saleId));
    return { ok: true };
  }, [releaseStock, sales]);

  const value = useMemo(() => ({ sales, createMockSale, recordMockPayment, correctMockSale, cancelMockSale, deleteMockSale }), [cancelMockSale, correctMockSale, createMockSale, deleteMockSale, recordMockPayment, sales]);
  return <SalesContext.Provider value={value}>{children}</SalesContext.Provider>;
}

export function useSales() {
  const context = useContext(SalesContext);
  if (!context) throw new Error("useSales harus digunakan di dalam SalesProvider.");
  return context;
}
