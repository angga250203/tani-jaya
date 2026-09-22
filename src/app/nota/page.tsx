import { redirect } from "next/navigation";

/** Legacy hub URL: receipts are opened from their transaction detail. */
export default function NotaPage() {
  redirect("/transaksi");
}
