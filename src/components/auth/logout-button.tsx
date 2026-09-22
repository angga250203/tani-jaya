"use client"

import { useFormStatus } from "react-dom"
import { LogOut } from "lucide-react"

import { logout } from "@/app/login/actions"
import { cn } from "@/lib/utils"

function LogoutSubmitButton({ className }: { className?: string }) {
  const { pending } = useFormStatus()

  return (
    <button
      aria-label="Keluar dari aplikasi"
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-tj-muted transition-colors hover:bg-tj-canvas hover:text-tj-text disabled:opacity-60",
        className,
      )}
      disabled={pending}
      type="submit"
    >
      <LogOut aria-hidden="true" size={19} />
      {pending ? "Keluar…" : "Keluar"}
    </button>
  )
}

export function LogoutButton({ className }: { className?: string }) {
  return (
    <form action={logout}>
      <LogoutSubmitButton className={className} />
    </form>
  )
}
