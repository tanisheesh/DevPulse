import { NextRequest, NextResponse } from "next/server";

const PROTECTED = [
  "/dashboard",
  "/api/sync",
  "/api/repos",
  "/api/standup",
  "/api/summary",
  "/api/settings",
  "/api/goals",
  "/api/monthly-review",
  "/api/pr-summarize",
  "/api/blackout",
];

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!PROTECTED.some((p) => pathname.startsWith(p))) return NextResponse.next();

  // NextAuth v5 session cookie — "authjs.session-token" on HTTP, Secure- prefix on HTTPS
  const hasSession =
    req.cookies.has("authjs.session-token") ||
    req.cookies.has("__Secure-authjs.session-token");

  if (!hasSession) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/sync",
    "/api/repos",
    "/api/standup",
    "/api/summary/:path*",
    "/api/settings/:path*",
    "/api/goals/:path*",
    "/api/monthly-review",
    "/api/pr-summarize",
    "/api/blackout/:path*",
  ],
};
