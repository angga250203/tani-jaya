import Link from "next/link";
import { Plus, UserRound } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  mobileTitle?: string;
  subtitle: string;
  showAvatar?: boolean;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
};

export function PageHeader({
  title,
  mobileTitle,
  subtitle,
  showAvatar = false,
  actionLabel,
  actionHref,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-center justify-between gap-3 border-b border-tj-border pb-5 lg:pb-6",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="mb-0.5 truncate text-xs font-medium text-tj-muted sm:text-sm">
          {subtitle}
        </p>
        <h1 className="truncate text-[19px] font-bold leading-6 tracking-[-0.02em] text-tj-text lg:text-[28px] lg:leading-8">
          <span className="lg:hidden">{mobileTitle ?? title}</span>
          <span className="hidden lg:inline">{title}</span>
        </h1>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {showAvatar && (
          <div
            aria-label="Profil Admin"
            className="hidden h-11 w-11 items-center justify-center rounded-full bg-tj-primary-soft text-tj-primary lg:flex"
          >
            <UserRound aria-hidden="true" size={20} />
          </div>
        )}
        {actionLabel &&
          (actionHref ? (
            <Link
              className={cn(buttonVariants({ size: "default" }), "h-11 px-3.5 sm:px-4")}
              href={actionHref}
            >
              <Plus aria-hidden="true" size={18} strokeWidth={2.5} />
              <span>{actionLabel}</span>
            </Link>
          ) : (
            <Button className="h-11 px-3.5 sm:px-4" size="default">
              <Plus aria-hidden="true" size={18} strokeWidth={2.5} />
              <span>{actionLabel}</span>
            </Button>
          ))}
      </div>
    </header>
  );
}
