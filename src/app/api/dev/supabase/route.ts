import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * Development-only connectivity check. It is intentionally not linked from
 * application navigation and returns 404 in production.
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 })
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from("farmers").select("id").limit(1)

    if (error) {
      const accessDenied = error.code === "42501"

      return NextResponse.json(
        {
          configured: true,
          connected: accessDenied,
          databaseAccess: accessDenied ? "denied" : "error",
          errorCode: error.code,
          errorDetails: error.details,
          errorHint: error.hint,
          error: error.message,
        },
        { status: accessDenied ? 200 : 502 },
      )
    }

    return NextResponse.json({
      configured: true,
      connected: true,
      farmersSampleSize: data.length,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Supabase tidak dapat diuji."

    return NextResponse.json(
      { configured: false, connected: false, error: message },
      { status: 500 },
    )
  }
}
