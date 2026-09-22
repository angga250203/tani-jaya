import { createBrowserClient } from "@supabase/ssr"

import { getSupabasePublicEnvironment } from "@/lib/supabase/env"
import type { Database } from "@/types/database.types"

let client: ReturnType<typeof createBrowserClient<Database>> | undefined

/**
 * Returns the typed, browser-side Supabase client.
 *
 * The module cache keeps one client per browser runtime instead of creating a
 * new client whenever a React component renders.
 */
export function createClient() {
  if (!client) {
    const { publishableKey, url } = getSupabasePublicEnvironment()

    client = createBrowserClient<Database>(url, publishableKey)
  }

  return client
}
