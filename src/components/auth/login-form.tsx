"use client"

import { useActionState } from "react"

import { login, type LoginState } from "@/app/login/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const initialState: LoginState = {}

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, initialState)

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-tj-text" htmlFor="email">
          Email
        </label>
        <Input
          autoComplete="email"
          autoFocus
          id="email"
          name="email"
          placeholder="admin@tanijaya.id"
          required
          type="email"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-tj-text" htmlFor="password">
          Kata sandi
        </label>
        <Input
          autoComplete="current-password"
          id="password"
          name="password"
          required
          type="password"
        />
      </div>

      {state.error && (
        <p
          aria-live="polite"
          className="rounded-xl border border-tj-danger/25 bg-tj-danger-soft px-3 py-2.5 text-sm font-medium text-tj-danger"
          role="alert"
        >
          {state.error}
        </p>
      )}

      <Button className="w-full" disabled={isPending} size="lg" type="submit">
        {isPending ? "Memeriksa akses…" : "Masuk"}
      </Button>
    </form>
  )
}
