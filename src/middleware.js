import { NextResponse } from "next/server";

export function middleware(request) {
  const accessToken = request.cookies.get("access_token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;

  // User is authenticated if BOTH tokens exist and are not empty
  const isAuthenticated =
    Boolean(accessToken && accessToken.trim()) &&
    Boolean(refreshToken && refreshToken.trim());

  const pathname = request.nextUrl.pathname;

  const isAuthRoute = pathname.startsWith("/auth");
  const isDashboardRoute = pathname.startsWith("/dashboard");

  // 🔐 Protect /dashboard route - must have both tokens
  if (isDashboardRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  // 🔁 Redirect authenticated users away from auth pages
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/auth/:path*"],
};
