import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"

import { getSupabasePublicEnvironment } from "@/lib/supabase/env"
import type { Database } from "@/types/database.types"

const protectedPrefixes = [
  "/jadwal",
  "/petani",
  "/transaksi",
  "/stok",
  "/totalan",
  "/kasbon",
  "/nota",
  "/riwayat",
  "/laporan",
]

function isProtectedPath(pathname: string) {
  return (
    pathname === "/" ||
    protectedPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  )
}

function redirectWithSessionCookies(
  request: NextRequest,
  response: NextResponse,
  destination: string,
) {
  const redirectResponse = NextResponse.redirect(new URL(destination, request.url))

  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie)
  })

  return redirectResponse
}

/**
 * Refreshes Supabase auth cookies and redirects only the operational routes.
 * `getClaims()` verifies the token; do not replace it with `getSession()` here.
 */
export async function updateSession(request: NextRequest) {
  const { publishableKey, url } = getSupabasePublicEnvironment()
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, options, value }) =>
          response.cookies.set(name, value, options),
        )
      },
    },
  })

  const { data: claimsData } = await supabase.auth.getClaims()
  const pathname = request.nextUrl.pathname
  const { data: isAdmin } = claimsData?.claims.sub
    ? await supabase.rpc("is_current_admin")
    : { data: false }

  if (!isAdmin && isProtectedPath(pathname)) {
    return redirectWithSessionCookies(request, response, "/login")
  }

  if (isAdmin && pathname === "/login") {
    return redirectWithSessionCookies(request, response, "/")
  }

  return response
}
