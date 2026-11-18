/**
 * Pengguna yang masuk tanpa email asli (nomor HP atau nama siswa saja)
 * memakai alamat internal yang tidak ditampilkan di profil.
 */
const INTERNAL_EMAIL_DOMAIN = "hp.tryoutyuk.local";
const STUDENT_EMAIL_DOMAIN = "siswa.tryout.local";

export function phoneToInternalEmail(phone: string) {
  return `${phone}@${INTERNAL_EMAIL_DOMAIN}`;
}

export function isInternalEmail(email: string | null | undefined) {
  return Boolean(
    email?.endsWith(`@${INTERNAL_EMAIL_DOMAIN}`) || email?.endsWith(`@${STUDENT_EMAIL_DOMAIN}`),
  );
}
