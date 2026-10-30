/** Konstanta sesi bersama (proxy dan server). */
/** Awalan cookie Better Auth → `tryoutyuk.session_token`. */
export const AUTH_COOKIE_PREFIX = "tryoutyuk";

/** Halaman yang wajib masuk dulu. */
export const PROTECTED_PREFIXES = ["/akun", "/mulai", "/nilai", "/pengaturan", "/riwayat", "/tryout"];

/** API data pribadi yang wajib masuk (tanpa cookie sesi → 401). */
export const PROTECTED_API_PREFIXES = [
  "/api/scores",
  "/api/history",
  "/api/tryout",
  "/api/account/session",
  "/api/account/sessions",
  "/api/settings",
];

export function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
