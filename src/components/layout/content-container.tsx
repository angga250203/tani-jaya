import * as React from "react";
import { cn } from "@/lib/utils";

export function ContentContainer({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mx-auto w-full max-w-[1536px] px-4 sm:px-6 lg:px-8", className)}
      {...props}
    />
  );
}
