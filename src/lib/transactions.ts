export type SellerType = "PETANI_MITRA" | "PENJUAL_UMUM";
export type PaymentStatus = "PAID" | "UNPAID";
export type WeighingMethod = "TOTAL_LANGSUNG" | "PER_KARUNG" | "PER_PETI";
export type PurchaseGrade = "SP" | "TG" | "BR";

export type TransactionItem = { id: string; commodity: string; grade: PurchaseGrade; weighingMethod: WeighingMethod; containerWeights: number[]; grossWeight: number; deduction: number; netWeight: number; pricePerKg: number; subtotal: number; stockHistoryLocked?: boolean };
export type TransactionRecord = { id: string; transactionDate: string; transactionTime: string; sellerType: SellerType; farmerId?: string; sellerName: string; scheduleId?: string; cycleId?: string; paymentStatus: PaymentStatus; totalanId?: string; notes: string; items: TransactionItem[]; totalNetWeight: number; totalAmount: number };

export function calculateGrossWeight(method: WeighingMethod, directWeight: number, containerWeights: number[]) { return method === "TOTAL_LANGSUNG" ? directWeight : containerWeights.reduce((sum, weight) => sum + weight, 0); }
export function calculateNetWeight(grossWeight: number, deduction: number) { return Math.max(0, grossWeight - deduction); }
export function calculateCommoditySubtotal(netWeight: number, pricePerKg: number) { return netWeight * pricePerKg; }
export function calculateTransactionTotal(items: Pick<TransactionItem, "netWeight" | "subtotal">[]) { return items.reduce((total, item) => total + item.subtotal, 0); }
export function calculateTransactionWeight(items: Pick<TransactionItem, "netWeight">[]) { return items.reduce((total, item) => total + item.netWeight, 0); }

export const initialTransactions: TransactionRecord[] = [
  { id: "transaksi-007", transactionDate: "2026-09-12", transactionTime: "08.10 WIB", sellerType: "PETANI_MITRA", farmerId: "petani-001", sellerName: "Budi Santoso", paymentStatus: "PAID", notes: "Pembayaran tunai panen Cabai Rawit.", items: [
    { id: "detail-008", commodity: "Cabai Rawit", grade: "SP", weighingMethod: "TOTAL_LANGSUNG", containerWeights: [], grossWeight: 122, deduction: 2, netWeight: 120, pricePerKg: 25_000, subtotal: 3_000_000 },
  ], totalNetWeight: 120, totalAmount: 3_000_000 },
  { id: "transaksi-006", transactionDate: "2026-09-13", transactionTime: "09.25 WIB", sellerType: "PETANI_MITRA", farmerId: "petani-002", sellerName: "Siti Aminah", paymentStatus: "PAID", notes: "Pembayaran tunai panen Tomat.", items: [
    { id: "detail-007", commodity: "Tomat", grade: "TG", weighingMethod: "PER_PETI", containerWeights: [92, 92], grossWeight: 184, deduction: 4, netWeight: 180, pricePerKg: 10_000, subtotal: 1_800_000 },
  ], totalNetWeight: 180, totalAmount: 1_800_000 },
  { id: "transaksi-001", transactionDate: "2026-09-15", transactionTime: "07.40 WIB", sellerType: "PETANI_MITRA", farmerId: "petani-001", sellerName: "Budi Santoso", paymentStatus: "UNPAID", notes: "Panen Cabai Rawit dari Lahan Utara.", items: [
    { id: "detail-001", commodity: "Cabai Rawit", grade: "SP", weighingMethod: "PER_KARUNG", containerWeights: [40, 40, 40], grossWeight: 120, deduction: 5, netWeight: 115, pricePerKg: 25_000, subtotal: 2_875_000 },
  ], totalNetWeight: 115, totalAmount: 2_875_000 },
  { id: "transaksi-002", transactionDate: "2026-09-16", transactionTime: "10.15 WIB", sellerType: "PENJUAL_UMUM", sellerName: "Pak Herman", paymentStatus: "PAID", notes: "Penjual umum dari pasar desa.", items: [
    { id: "detail-003", commodity: "Timun", grade: "SP", weighingMethod: "TOTAL_LANGSUNG", containerWeights: [], grossWeight: 80, deduction: 0, netWeight: 80, pricePerKg: 13_000, subtotal: 1_040_000 },
  ], totalNetWeight: 80, totalAmount: 1_040_000 },
  { id: "transaksi-003", transactionDate: "2026-09-16", transactionTime: "11.05 WIB", sellerType: "PETANI_MITRA", farmerId: "petani-001", sellerName: "Budi Santoso", paymentStatus: "UNPAID", notes: "Panen Tomat dari Lahan Selatan.", items: [
    { id: "detail-004", commodity: "Tomat", grade: "TG", weighingMethod: "PER_PETI", containerWeights: [92, 92], grossWeight: 184, deduction: 4, netWeight: 180, pricePerKg: 10_000, subtotal: 1_800_000 },
  ], totalNetWeight: 180, totalAmount: 1_800_000 },
  { id: "transaksi-004", transactionDate: "2026-09-16", transactionTime: "13.20 WIB", sellerType: "PETANI_MITRA", farmerId: "petani-001", sellerName: "Budi Santoso", paymentStatus: "UNPAID", notes: "Panen Cabai Rawit susulan dari Lahan Utara.", items: [
    { id: "detail-005", commodity: "Cabai Rawit", grade: "BR", weighingMethod: "TOTAL_LANGSUNG", containerWeights: [], grossWeight: 72, deduction: 2, netWeight: 70, pricePerKg: 25_000, subtotal: 1_750_000 },
  ], totalNetWeight: 70, totalAmount: 1_750_000 },
  { id: "transaksi-005", transactionDate: "2026-09-16", transactionTime: "15.10 WIB", sellerType: "PETANI_MITRA", farmerId: "petani-001", sellerName: "Budi Santoso", paymentStatus: "PAID", totalanId: "totalan-001", notes: "Panen sebelumnya, sudah masuk totalan.", items: [
    { id: "detail-006", commodity: "Terong", grade: "BR", weighingMethod: "TOTAL_LANGSUNG", containerWeights: [], grossWeight: 100, deduction: 0, netWeight: 100, pricePerKg: 15_000, subtotal: 1_500_000 },
  ], totalNetWeight: 100, totalAmount: 1_500_000 },
];

export function getTransactionById(id: string) { return initialTransactions.find((transaction) => transaction.id === id); }
export function formatTransactionDate(date: string) { return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${date}T00:00:00`)); }
export function sellerTypeLabel(type: SellerType) { return type === "PETANI_MITRA" ? "Petani Mitra" : "Penjual Umum"; }
export function paymentStatusLabel(status: PaymentStatus) { return status === "PAID" ? "Lunas" : "Belum Dibayar"; }
export function transactionPaymentStatusLabel(transaction: TransactionRecord) { return transaction.totalanId ? "Lunas / Ditotal" : paymentStatusLabel(transaction.paymentStatus); }
export function weighingMethodLabel(method: WeighingMethod) { return method === "PER_KARUNG" ? "Per Karung" : method === "PER_PETI" ? "Per Peti" : "Total Langsung"; }
export function purchaseGradeLabel(grade: PurchaseGrade) { return grade === "SP" ? "Super" : grade === "TG" ? "Tanggung" : "Barang Jelek"; }
