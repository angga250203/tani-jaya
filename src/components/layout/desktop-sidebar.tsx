"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  Boxes,
  Home,
  History,
  UsersRound,
  WalletCards,
  HandCoins,
} from "lucide-react";
import { businessInfo } from "@/config/business";
import { LogoutButton } from "@/components/auth/logout-button";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "Dashboard", icon: Home, href: "/" },
  { label: "Jadwal Panen", icon: CalendarDays, href: "/jadwal" },
  { label: "Transaksi", icon: ClipboardList, href: "/transaksi" },
  { label: "Stok", icon: Boxes, href: "/stok" },
  { label: "Petani", icon: UsersRound, href: "/petani" },
  { label: "Kasbon", icon: WalletCards, href: "/kasbon" },
  { label: "Totalan", icon: HandCoins, href: "/totalan" },
  { label: "Riwayat", icon: History, href: "/riwayat" },
  { label: "Laporan Bulanan", icon: BarChart3, href: "/laporan" },
];

export function DesktopSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-tj-border bg-tj-surface px-4 py-6 lg:flex">
      <Link className="flex items-center gap-3 px-2" href="/" aria-label={businessInfo.name}>
        <Image
          alt={businessInfo.name}
          className="h-16 w-16 shrink-0 object-contain"
          height={1080}
          loading="eager"
          sizes="40px"
          src={businessInfo.logo}
          width={1080}
        />
        <div>
          <p className="text-base font-bold tracking-[-0.01em] text-tj-text">{businessInfo.name}</p>
          <p className="text-xs text-tj-muted">Operasional</p>
        </div>
      </Link>

      <nav aria-label="Navigasi utama" className="mt-9 space-y-1">
        {navigation.map(({ label, icon: Icon, href }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors",
                active
                  ? "bg-tj-primary-soft text-tj-primary-strong"
                  : "text-tj-muted hover:bg-tj-canvas hover:text-tj-text",
              )}
              href={href}
              key={label}
            >
              <Icon aria-hidden="true" size={19} strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <LogoutButton className="mb-2 w-full" />
        <div className="rounded-2xl border border-tj-border bg-tj-canvas p-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-tj-primary text-xs font-bold text-white">
            A
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-tj-text">Admin</p>
            <p className="truncate text-xs text-tj-muted">{businessInfo.name}</p>
          </div>
        </div>
        </div>
      </div>
    </aside>
  );
}
