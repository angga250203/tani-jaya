"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

const loginSchema = z.object({
  email: z.email("Masukkan alamat email yang valid.").trim(),
  password: z.string().min(1, "Masukkan kata sandi Anda."),
})

export type LoginState = {
  error?: string
}

export async function login(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const result = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Periksa kembali data masuk Anda." }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(result.data)

  if (error) {
    return { error: "Email atau kata sandi tidak sesuai. Silakan coba lagi." }
  }

  const { data: isAdmin, error: adminCheckError } = await supabase.rpc(
    "is_current_admin",
  )

  if (adminCheckError || !isAdmin) {
    await supabase.auth.signOut()
    return { error: "Akun ini belum terdaftar sebagai Admin Tani Jaya." }
  }

  redirect("/")
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
