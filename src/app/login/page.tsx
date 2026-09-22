import Image from "next/image"
import { redirect } from "next/navigation"

import { LoginForm } from "@/components/auth/login-form"
import { Card, CardContent } from "@/components/ui/card"
import { businessInfo } from "@/config/business"
import { createClient } from "@/lib/supabase/server"

export default async function LoginPage() {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()

  const { data: isAdmin } = claimsData?.claims.sub
    ? await supabase.rpc("is_current_admin")
    : { data: false }

  if (isAdmin) {
    redirect("/")
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-tj-canvas px-4 py-8 sm:px-6">
      <Card className="w-full max-w-[420px] shadow-[var(--tj-shadow-md)]">
        <CardContent className="p-6 sm:p-8">
          <div className="mb-7 flex flex-col items-center text-center">
            <Image
              alt={businessInfo.name}
              className="mb-4 h-20 w-20 object-contain"
              height={1080}
              priority
              src="/logo.png"
              width={1080}
            />
            <p className="text-xl font-bold tracking-[-0.02em] text-tj-text">
              Selamat datang di {businessInfo.name}
            </p>
            <p className="mt-1.5 text-sm text-tj-muted">
              Masuk untuk melanjutkan operasional.
            </p>
          </div>

          <LoginForm />
        </CardContent>
      </Card>
    </main>
  )
}
