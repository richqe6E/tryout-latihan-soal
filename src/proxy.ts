import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_COOKIE_PREFIX,
  PROTECTED_API_PREFIXES,
  PROTECTED_PREFIXES,
  STUDENT_COOKIE_NAME,
  matchesPrefix,
} from "@/lib/auth/session";

/**
 * Proteksi optimistis halaman & API data pribadi:
 * mengizinkan sesi siswa berbasis nama (`tryoutyuk_student`) maupun sesi Better Auth.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasStudentCookie = Boolean(request.cookies.get(STUDENT_COOKIE_NAME)?.value);
  const hasBetterAuthCookie = Boolean(getSessionCookie(request, { cookiePrefix: AUTH_COOKIE_PREFIX }));
  if (hasStudentCookie || hasBetterAuthCookie) return NextResponse.next();

  if (matchesPrefix(pathname, PROTECTED_API_PREFIXES)) {
    return NextResponse.json(
      { error: "Silakan isi nama siswa dulu.", code: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  if (matchesPrefix(pathname, PROTECTED_PREFIXES)) {
    const url = new URL("/masuk", request.url);
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/akun/:path*",
    "/mulai/:path*",
    "/nilai/:path*",
    "/pengaturan/:path*",
    "/riwayat/:path*",
    "/tryout/:path*",
    "/api/scores/:path*",
    "/api/history/:path*",
    "/api/tryout/:path*",
    "/api/account/session",
    "/api/account/sessions/:path*",
    "/api/settings",
  ],
};
