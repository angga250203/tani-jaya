import "server-only"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

import { getSupabasePublicEnvironment } from "@/lib/supabase/env"
import type { Database } from "@/types/database.types"

/**
 * Creates a typed Supabase client for Server Components, Server Actions, and
 * Route Handlers. The cookie adapter is compatible with Next.js 16's async
 * cookies API.
 */
export async function createClient() {
  const cookieStore = await cookies()
  const { publishableKey, url } = getSupabasePublicEnvironment()

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, options, value }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Server Components cannot write response cookies. Authentication
          // session refresh will be added with the Next.js proxy when auth is
          // implemented; Route Handlers and Server Actions can write them now.
        }
      },
    },
  })
}
