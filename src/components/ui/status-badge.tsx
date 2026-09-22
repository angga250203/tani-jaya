import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusBadgeVariants = cva(
  "inline-flex min-h-6 items-center rounded-full px-2.5 text-xs font-semibold whitespace-nowrap",
  {
    variants: {
      status: {
        today: "bg-tj-primary-soft text-tj-primary-strong",
        upcoming: "bg-tj-info-soft text-tj-info",
        warning: "bg-tj-warning-soft text-tj-warning",
        paid: "bg-tj-primary-soft text-tj-primary-strong",
        pending: "bg-tj-warning-soft text-tj-warning",
        neutral: "bg-[#edf1ee] text-tj-muted",
      },
    },
    defaultVariants: {
      status: "neutral",
    },
  },
);

export function StatusBadge({
  className,
  status,
  children,
}: React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof statusBadgeVariants>) {
  return (
    <span className={cn(statusBadgeVariants({ status }), className)}>
      {children}
    </span>
  );
}
