import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-[background-color,color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tj-primary focus-visible:ring-offset-2 active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-tj-primary text-white shadow-[var(--tj-shadow-sm)] hover:bg-tj-primary-strong",
        secondary: "border border-tj-border bg-tj-surface text-tj-text hover:bg-tj-primary-soft",
        ghost: "text-tj-primary hover:bg-tj-primary-soft",
        danger: "bg-tj-danger text-white hover:bg-[#9e2e25]",
      },
      size: {
        default: "h-11",
        sm: "min-h-9 rounded-lg px-3 text-xs",
        lg: "h-12 px-5 text-base",
        icon: "h-11 w-11 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      ref={ref}
      type={type}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { Button, buttonVariants };
