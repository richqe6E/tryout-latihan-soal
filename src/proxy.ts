import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_COOKIE_PREFIX,
  PROTECTED_API_PREFIXES,
  PROTECTED_PREFIXES,
  matchesPrefix,
} from "@/lib/auth/session";

/**
 * Proteksi optimistis halaman & API data pribadi (nilai, riwayat, tryout, akun): hanya melihat
 * ada/tidaknya cookie sesi supaya permintaan tanpa sesi ditolak cepat. Validasi sesi yang
 * sesungguhnya tetap di server (halaman: getCurrentUser, API: requireApiUser), dan setiap query
 * dibatasi ke `user_id` pengguna yang masuk.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(getSessionCookie(request, { cookiePrefix: AUTH_COOKIE_PREFIX }));
  if (hasSession) return NextResponse.next();

  if (matchesPrefix(pathname, PROTECTED_API_PREFIXES)) {
    return NextResponse.json(
      { error: "Silakan masuk dulu.", code: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  // Tanpa cookie sesi pasti belum masuk → langsung ke halaman masuk.
  // (Halaman khusus tamu mengecek sesi yang sudah divalidasi di server, bukan di sini:
  //  cookie yang basi tidak boleh mengunci pengguna di luar halaman masuk.)
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
