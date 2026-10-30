/**
 * Pengguna yang daftar dengan nomor HP saja tetap butuh email unik (wajib di Better Auth).
 * Dipakai alamat internal yang tidak pernah ditampilkan atau dikirimi email.
 */
const INTERNAL_EMAIL_DOMAIN = "hp.tryoutyuk.local";

export function phoneToInternalEmail(phone: string) {
  return `${phone}@${INTERNAL_EMAIL_DOMAIN}`;
}

export function isInternalEmail(email: string | null | undefined) {
  return Boolean(email?.endsWith(`@${INTERNAL_EMAIL_DOMAIN}`));
}
