import { NextResponse } from "next/server";

export function middleware(request) {
  const accessToken = request.cookies.get("access_token")?.value;

  const isLoggedIn = Boolean(accessToken && accessToken.trim());

  const pathname = request.nextUrl.pathname;

  const isAuthPage = pathname.startsWith("/auth");
  const isDashboardPage = pathname.startsWith("/dashboard");

  // 🔐 Not logged in → block dashboard
  if (isDashboardPage && !isLoggedIn) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // 🔁 Already logged in → block auth pages (redirect to dashboard)
  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/auth/:path*"],
};
