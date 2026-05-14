import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

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

  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

  // Try both cookie names to handle HTTP and HTTPS environments
  const token =
    (await getToken({
      req,
      secret,
      cookieName: "next-auth.session-token",
    })) ||
    (await getToken({
      req,
      secret,
      cookieName: "__Secure-next-auth.session-token",
    })) ||
    (await getToken({
      req,
      secret,
      cookieName: "__Secure-authjs.session-token",
    })) ||
    (await getToken({
      req,
      secret,
      cookieName: "authjs.session-token",
    }));

  const isLoggedIn = !!token;
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/verify-email";

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
