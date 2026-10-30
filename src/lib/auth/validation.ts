/**
 * Validasi form akun. Fungsi murni — dipakai di form (klien) dan nanti di server.
 */

export type FieldErrors<T extends string> = Partial<Record<T, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Nomor HP Indonesia: 08xx / +628xx / 628xx, 10–14 digit. */
const PHONE_PATTERN = /^(?:\+?62|0)8\d{8,11}$/;

export const PASSWORD_MIN_LENGTH = 8;

export type IdentifierKind = "email" | "phone";

/** Kenali isian "email atau nomor HP". */
export function parseIdentifier(raw: string): { kind: IdentifierKind; value: string } | null {
  const value = raw.trim();
  if (EMAIL_PATTERN.test(value)) return { kind: "email", value: value.toLowerCase() };
  const digits = value.replace(/[\s-]/g, "");
  if (PHONE_PATTERN.test(digits)) return { kind: "phone", value: digits.replace(/^(\+?62)/, "0") };
  return null;
}

export type RegisterValues = { name: string; identifier: string; password: string };

export function validateRegister(values: RegisterValues): FieldErrors<keyof RegisterValues> {
  const errors: FieldErrors<keyof RegisterValues> = {};
  if (values.name.trim().length < 2) errors.name = "Isi nama minimal 2 huruf.";
  if (!values.identifier.trim()) errors.identifier = "Isi email atau nomor HP.";
  else if (!parseIdentifier(values.identifier))
    errors.identifier = "Gunakan email (nama@contoh.id) atau nomor HP (08xxxxxxxxxx).";
  const passwordError = validatePassword(values.password);
  if (passwordError) errors.password = passwordError;
  return errors;
}

/** Aturan password: minimal 8 karakter, kombinasi huruf dan angka. */
export function validatePassword(password: string): string | undefined {
  if (password.length < PASSWORD_MIN_LENGTH) return `Password minimal ${PASSWORD_MIN_LENGTH} karakter.`;
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Password perlu kombinasi huruf dan angka.";
  return undefined;
}

/** Samarkan tujuan pengiriman kode: n***@contoh.id / 0812****7890 */
export function maskIdentifier(kind: IdentifierKind, value: string) {
  if (kind === "email") {
    const [local, domain] = value.split("@");
    return `${local.slice(0, 1)}***@${domain}`;
  }
  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}

export type LoginValues = { identifier: string; password: string };

export function validateLogin(values: LoginValues): FieldErrors<keyof LoginValues> {
  const errors: FieldErrors<keyof LoginValues> = {};
  if (!values.identifier.trim()) errors.identifier = "Isi email atau nomor HP.";
  else if (!parseIdentifier(values.identifier))
    errors.identifier = "Gunakan email (nama@contoh.id) atau nomor HP (08xxxxxxxxxx).";
  if (!values.password) errors.password = "Isi password.";
  return errors;
}

/** Hanya izinkan pengalihan ke path internal (cegah open redirect). */
export function safeNextPath(next: string | null | undefined, fallback = "/") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
