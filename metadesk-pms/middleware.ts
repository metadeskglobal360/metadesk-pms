import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

function usesSecureAuthCookie(req: NextRequest) {
  return req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow static files, images, auth API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/brand-logo") ||
    pathname.startsWith("/api/departments") ||
    pathname.startsWith("/api/users/register") ||
    pathname.startsWith("/api/users/verify-email") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const isAuthPage = pathname === "/login" || pathname === "/register" || pathname === "/verify-email";

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    secureCookie: usesSecureAuthCookie(req),
  });

  const isLoggedIn = !!token;

  // Already logged in — don't show auth pages again
  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  // Not logged in — redirect to login
  if (!isAuthPage && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  const role = token?.role as string | undefined;
  const managerOnly =
    pathname.startsWith("/team") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/projects/new") ||
    pathname.startsWith("/tasks/new");

  if (managerOnly && role !== "manager") {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
