import type { Metadata } from "next";
import { AppProviders } from "@/components/providers/app-providers";
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
      <body><AppProviders>{children}</AppProviders></body>
    </html>
  );
}
