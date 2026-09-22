import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ className, ...props }, ref) => (
  <input
    className={cn(
      "h-12 w-full rounded-xl border border-tj-border bg-tj-surface px-3.5 text-sm text-tj-text outline-none placeholder:text-tj-muted focus:border-tj-primary",
      className,
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";

export function SelectField({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-12 w-full rounded-xl border border-tj-border bg-tj-surface px-3.5 text-sm text-tj-text outline-none focus:border-tj-primary",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
