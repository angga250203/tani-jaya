"use client";

import { motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** A small, route-keyed transition shared by every application screen. */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      key={pathname}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
      transition={{ duration: reduceMotion ? 0.01 : 0.18, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
