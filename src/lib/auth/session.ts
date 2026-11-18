/** Konstanta sesi bersama (proxy dan server). */
export const AUTH_COOKIE_PREFIX = "tryoutyuk";
export const STUDENT_COOKIE_NAME = "tryoutyuk_student";

/** Halaman yang memerlukan identitas siswa (cukup isi nama siswa). */
export const PROTECTED_PREFIXES = ["/akun", "/mulai", "/nilai", "/pengaturan", "/riwayat", "/tryout"];

/** API data pribadi yang wajib memiliki sesi siswa. */
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
