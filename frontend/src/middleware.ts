import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import {
  BETA_COOKIE_NAME,
  computeBetaToken,
  getBetaCode,
  isBetaModeEnabled,
} from "./lib/beta-auth"

export async function middleware(req: NextRequest) {
  // If beta mode is explicitly disabled in ENV, bypass completely
  if (!isBetaModeEnabled()) {
    return NextResponse.next()
  }

  const { pathname, search } = req.nextUrl

  // Whitelist gate page and the verification API endpoint
  if (pathname === "/beta" || pathname === "/api/beta-verify") {
    return NextResponse.next()
  }

  // Check the beta access cookie
  const cookie = req.cookies.get(BETA_COOKIE_NAME)
  const expectedToken = await computeBetaToken(getBetaCode())

  if (cookie && cookie.value === expectedToken) {
    return NextResponse.next()
  }

  // If user tries to access API endpoints without beta authorization, block with 403
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Access denied. Beta tester code required." },
      { status: 403 }
    )
  }

  // For all regular pages, redirect to the beta security gate
  const gateUrl = req.nextUrl.clone()
  gateUrl.pathname = "/beta"
  if (pathname !== "/") {
    gateUrl.searchParams.set("redirect", pathname + search)
  }

  return NextResponse.redirect(gateUrl)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files with image extensions (svg, png, jpg, jpeg, gif, webp)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
