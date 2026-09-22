"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  BarChart3,
  Boxes,
  CalendarDays,
  HandCoins,
  History,
  Home,
  MoreHorizontal,
  Plus,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/auth/logout-button";

const primaryNav = [
  { label: "Dashboard", icon: Home, href: "/" },
  { label: "Jadwal", icon: CalendarDays, href: "/jadwal" },
  { label: "Stok", icon: Boxes, href: "/stok" },
];

const secondaryNav = [
  { label: "Petani", description: "Kelola data petani mitra", icon: UsersRound, href: "/petani" },
  { label: "Kasbon", description: "Catat dan lihat sisa kasbon", icon: WalletCards, href: "/kasbon" },
  { label: "Totalan", description: "Pembayaran hasil panen", icon: HandCoins, href: "/totalan" },
  { label: "Riwayat Transaksi", description: "Cari transaksi yang tercatat", icon: History, href: "/riwayat" },
  { label: "Laporan Bulanan", description: "Ringkasan operasional bulanan", icon: BarChart3, href: "/laporan" },
] as const;

function isRouteActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const wasMoreOpenRef = useRef(false);
  const reduceMotion = useReducedMotion();
  const moreIsActive = secondaryNav.some(({ href }) => isRouteActive(pathname, href));

  useEffect(() => {
    if (!isMoreOpen) {
      if (wasMoreOpenRef.current) {
        moreButtonRef.current?.focus();
        wasMoreOpenRef.current = false;
      }
      return;
    }

    wasMoreOpenRef.current = true;
    closeButtonRef.current?.focus();
    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMoreOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
    };
  }, [isMoreOpen]);

  useEffect(() => {
    if (isMoreOpen || !pendingHref) {
      return;
    }

    const navigateTimer = window.setTimeout(() => {
      router.push(pendingHref);
      setPendingHref(null);
    }, reduceMotion ? 20 : 260);

    return () => window.clearTimeout(navigateTimer);
  }, [isMoreOpen, pendingHref, reduceMotion, router]);

  const closeMore = () => {
    setPendingHref(null);
    setIsMoreOpen(false);
  };

  const closeAndNavigate = (
    event: MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    event.preventDefault();
    setPendingHref(href);
    setIsMoreOpen(false);
  };

  const trapFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") {
      return;
    }

    const focusable = sheetRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled])',
    );
    if (!focusable?.length) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      <nav
        aria-label="Navigasi utama"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-tj-border bg-tj-surface/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_24px_rgb(14_61_35_/_0.06)] backdrop-blur lg:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5">
          {primaryNav.slice(0, 2).map(({ label, icon: Icon, href }) => {
            const active = isRouteActive(pathname, href);

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition-colors",
                  active ? "text-tj-primary" : "text-tj-muted",
                )}
                href={href}
                key={label}
              >
                <Icon aria-hidden="true" size={21} strokeWidth={active ? 2.5 : 2} />
                {label}
              </Link>
            );
          })}
          <Link
            aria-label="Buka Transaksi"
            aria-current={isRouteActive(pathname, "/transaksi") ? "page" : undefined}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold transition-colors",
              isRouteActive(pathname, "/transaksi") ? "text-tj-primary" : "text-tj-muted",
            )}
            href="/transaksi"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-tj-primary text-white shadow-[var(--tj-shadow-md)]">
              <Plus aria-hidden="true" size={21} strokeWidth={2.75} />
            </span>
            <span>Transaksi</span>
          </Link>
          {primaryNav.slice(2).map(({ label, icon: Icon, href }) => {
            const active = isRouteActive(pathname, href);

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition-colors",
                  active ? "text-tj-primary" : "text-tj-muted",
                )}
                href={href}
                key={label}
              >
                <Icon aria-hidden="true" size={21} strokeWidth={active ? 2.5 : 2} />
                {label}
              </Link>
            );
          })}
          <button
            aria-controls="mobile-more-sheet"
            aria-current={moreIsActive ? "page" : undefined}
            aria-expanded={isMoreOpen}
            aria-haspopup="dialog"
            aria-label="Buka menu lainnya"
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition-colors",
              moreIsActive ? "text-tj-primary" : "text-tj-muted",
            )}
            onClick={() => setIsMoreOpen(true)}
            ref={moreButtonRef}
            type="button"
          >
            <MoreHorizontal aria-hidden="true" size={21} strokeWidth={moreIsActive ? 2.5 : 2} />
            Lainnya
          </button>
        </div>
      </nav>

      <AnimatePresence initial={false}>
        {isMoreOpen && (
          <motion.button
            animate={{ opacity: 1 }}
            aria-label="Tutup menu lainnya"
            className="fixed inset-0 z-50 cursor-default bg-tj-text/30 lg:hidden"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={closeMore}
            transition={{ duration: reduceMotion ? 0.01 : 0.2, ease: "easeOut" }}
            type="button"
          />
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {isMoreOpen && (
          <motion.div
              animate={{ opacity: 1, y: 0 }}
              aria-labelledby="mobile-more-title"
              aria-modal="true"
              className="fixed inset-x-0 bottom-0 z-[51] max-h-[min(78dvh,680px)] overflow-y-auto rounded-t-[24px] bg-tj-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_32px_rgb(14_61_35_/_0.18)] lg:hidden"
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0.98, y: "100%" }}
              id="mobile-more-sheet"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0.98, y: "100%" }}
              onKeyDown={trapFocus}
              ref={sheetRef}
              role="dialog"
              transition={{ duration: reduceMotion ? 0.01 : 0.24, ease: "easeOut" }}
            >
              <div aria-hidden="true" className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-tj-border" />
              <div className="mb-3 flex min-h-11 items-center justify-between gap-4">
                <h2 className="text-lg font-bold tracking-[-0.015em] text-tj-text" id="mobile-more-title">
                  Menu Lainnya
                </h2>
                <button
                  aria-label="Tutup menu lainnya"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-tj-muted transition-colors hover:bg-tj-canvas hover:text-tj-text"
                  onClick={closeMore}
                  ref={closeButtonRef}
                  type="button"
                >
                  <X aria-hidden="true" size={21} />
                </button>
              </div>
              <div className="space-y-1 pb-1">
                {secondaryNav.map(({ label, description, icon: Icon, href }) => {
                  const active = isRouteActive(pathname, href);

                  return (
                    <Link
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-16 items-center gap-3 rounded-xl px-3 py-2 transition-colors",
                        active
                          ? "bg-tj-primary-soft text-tj-primary-strong"
                          : "text-tj-text hover:bg-tj-canvas",
                      )}
                      href={href}
                      key={href}
                      onClick={(event) => closeAndNavigate(event, href)}
                    >
                      <span
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                          active ? "bg-tj-surface text-tj-primary" : "bg-tj-canvas text-tj-muted",
                        )}
                      >
                        <Icon aria-hidden="true" size={20} strokeWidth={active ? 2.5 : 2} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{label}</span>
                        <span className="mt-0.5 block truncate text-xs font-normal text-tj-muted">
                          {description}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
              <div className="mt-3 border-t border-tj-border pt-2">
                <LogoutButton className="w-full" />
              </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
