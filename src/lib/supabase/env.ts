type SupabasePublicEnvironment = {
  publishableKey: string
  url: string
}

const requiredVariables = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
] as const

/**
 * Returns the public Supabase connection details used by both application
 * clients. Values are checked when a client is requested so a production build
 * can still be created before its runtime environment is attached.
 */
export function getSupabasePublicEnvironment(): SupabasePublicEnvironment {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  const missingVariables = requiredVariables.filter((variable) => {
    if (variable === "NEXT_PUBLIC_SUPABASE_URL") {
      return !url
    }

    return !publishableKey
  })

  if (missingVariables.length > 0) {
    const message = `Supabase belum dikonfigurasi. Tambahkan ${missingVariables.join(
      ", ",
    )} ke .env.local lalu mulai ulang server Next.js.`

    throw new Error(
      process.env.NODE_ENV === "development"
        ? message
        : "Supabase environment belum dikonfigurasi.",
    )
  }

  // The guard above has already reported the missing variable names. Keeping
  // this explicit check also narrows values for TypeScript.
  if (!url || !publishableKey) {
    throw new Error("Supabase environment belum dikonfigurasi.")
  }

  try {
    new URL(url)
  } catch {
    throw new Error(
      process.env.NODE_ENV === "development"
        ? "NEXT_PUBLIC_SUPABASE_URL harus berupa URL Supabase yang valid."
        : "Supabase environment tidak valid.",
    )
  }

  return { publishableKey, url }
}
