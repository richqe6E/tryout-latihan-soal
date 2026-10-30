import "server-only";

import { APIError } from "better-auth/api";
import { and, desc, eq, gt, lt } from "drizzle-orm";
import { db } from "@/db";
import { authSessions, authVerifications, users } from "@/db/schema";
import { phoneToInternalEmail } from "@/lib/auth/internal-email";
import { isInternalEmail } from "@/lib/auth/internal-email";
import {
  parseIdentifier,
  validateLogin,
  validatePassword,
  validateRegister,
  type LoginValues,
  type RegisterValues,
} from "@/lib/auth/validation";
import { auth } from "@/server/auth";

export type AccountResult<T = object> =
  | ({ ok: true } & T)
  | {
      ok: false;
      code: "invalid" | "conflict" | "unauthorized" | "rate_limited" | "server_error";
      field?: "name" | "identifier" | "password";
      message: string;
    };

/**
 * Daftar akun baru dengan email ATAU nomor HP + password, lalu langsung masuk (cookie sesi
 * Better Auth diset lewat plugin nextCookies). Validasi diulang di server.
 */
export async function registerAccount(
  values: RegisterValues,
  requestHeaders: Headers,
): Promise<AccountResult<{ user: { id: string; name: string } }>> {
  const errors = validateRegister(values);
  const firstField = (["name", "identifier", "password"] as const).find((field) => errors[field]);
  if (firstField) return { ok: false, code: "invalid", field: firstField, message: errors[firstField]! };

  const identifier = parseIdentifier(values.identifier)!;
  const name = values.name.trim();
  const taken = {
    ok: false as const,
    code: "conflict" as const,
    field: "identifier" as const,
    message:
      identifier.kind === "email"
        ? "Email ini sudah terdaftar. Coba masuk saja."
        : "Nomor HP ini sudah terdaftar. Coba masuk saja.",
  };

  if (identifier.kind === "phone") {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.phoneNumber, identifier.value))
      .limit(1);
    if (existing) return taken;
  }

  const email = identifier.kind === "email" ? identifier.value : phoneToInternalEmail(identifier.value);
  let userId: string;
  try {
    const result = await auth.api.signUpEmail({
      body: { name, email, password: values.password },
      headers: requestHeaders,
    });
    userId = result.user.id;
  } catch (error) {
    if (error instanceof APIError) {
      if (error.body?.code === "USER_ALREADY_EXISTS" || error.status === "UNPROCESSABLE_ENTITY") return taken;
      return { ok: false, code: "invalid", field: "password", message: "Password belum memenuhi syarat." };
    }
    console.error(error);
    return { ok: false, code: "server_error", message: "Akun belum bisa dibuat. Coba lagi sebentar lagi." };
  }

  if (identifier.kind === "phone") {
    try {
      await db.update(users).set({ phoneNumber: identifier.value }).where(eq(users.id, userId));
    } catch {
      // Nomor yang sama didaftarkan bersamaan oleh orang lain: batalkan akun yang baru dibuat.
      await db.delete(users).where(eq(users.id, userId));
      return taken;
    }
  }

  return { ok: true, user: { id: userId, name } };
}

export type AccountUser = {
  id: string;
  name: string;
  /** null untuk pengguna yang daftar dengan nomor HP saja (email internal tidak ditampilkan). */
  email: string | null;
  phone: string | null;
  createdAt: string;
};

type BetterAuthUser = {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string | null;
  createdAt: Date | string;
};

function toAccountUser(user: BetterAuthUser): AccountUser {
  return {
    id: user.id,
    name: user.name,
    email: isInternalEmail(user.email) ? null : user.email,
    phone: user.phoneNumber ?? null,
    createdAt: new Date(user.createdAt).toISOString(),
  };
}

/**
 * Masuk dengan email ATAU nomor HP + password. Pesan gagal sengaja umum supaya tidak
 * membocorkan apakah akunnya terdaftar. Cookie sesi diset lewat plugin nextCookies.
 */
export async function signInAccount(
  values: LoginValues,
  requestHeaders: Headers,
): Promise<AccountResult<{ user: AccountUser }>> {
  const errors = validateLogin(values);
  const firstField = (["identifier", "password"] as const).find((field) => errors[field]);
  if (firstField) return { ok: false, code: "invalid", field: firstField, message: errors[firstField]! };

  const identifier = parseIdentifier(values.identifier)!;
  try {
    const result =
      identifier.kind === "email"
        ? await auth.api.signInEmail({
            body: { email: identifier.value, password: values.password, rememberMe: true },
            headers: requestHeaders,
          })
        : await auth.api.signInPhoneNumber({
            body: { phoneNumber: identifier.value, password: values.password, rememberMe: true },
            headers: requestHeaders,
          });
    return { ok: true, user: toAccountUser(result.user as BetterAuthUser) };
  } catch (error) {
    if (error instanceof APIError) {
      if (error.status === "TOO_MANY_REQUESTS") {
        return {
          ok: false,
          code: "rate_limited",
          message: "Terlalu banyak percobaan masuk. Tunggu sebentar lalu coba lagi.",
        };
      }
      return { ok: false, code: "unauthorized", message: "Email/nomor HP atau password salah. Coba lagi." };
    }
    console.error(error);
    return { ok: false, code: "server_error", message: "Belum bisa masuk. Coba lagi sebentar lagi." };
  }
}

/** Sesi masuk saat ini (pengguna + kapan kedaluwarsa), atau null. */
export async function getAccountSession(requestHeaders: Headers) {
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) return null;
  return {
    user: toAccountUser(session.user as BetterAuthUser),
    expiresAt: new Date(session.session.expiresAt).toISOString(),
  };
}

/**
 * Keluar: cabut sesi di server dan hapus cookie-nya. Dengan `allDevices`, semua sesi lain milik
 * pengguna (perangkat lain) ikut dicabut.
 */
export async function signOutAccount(requestHeaders: Headers, options: { allDevices?: boolean } = {}) {
  try {
    if (options.allDevices) await auth.api.revokeOtherSessions({ headers: requestHeaders });
    await auth.api.signOut({ headers: requestHeaders });
  } catch (error) {
    // Sesi sudah tidak ada/kedaluwarsa: anggap sudah keluar.
    if (!(error instanceof APIError)) throw error;
  }
}

export type AccountSessionInfo = {
  id: string;
  /** Peramban/perangkat dari user agent saat masuk. */
  userAgent: string | null;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  /** True untuk sesi perangkat yang sedang dipakai. */
  current: boolean;
};

/** Sesi masuk aktif milik pengguna (terbaru dipakai dulu). Token sesi tidak pernah dikirim. */
export async function listAccountSessions(requestHeaders: Headers): Promise<AccountSessionInfo[] | null> {
  const current = await auth.api.getSession({ headers: requestHeaders });
  if (!current) return null;
  const rows = await db
    .select({
      id: authSessions.id,
      userAgent: authSessions.userAgent,
      createdAt: authSessions.createdAt,
      updatedAt: authSessions.updatedAt,
      expiresAt: authSessions.expiresAt,
    })
    .from(authSessions)
    .where(and(eq(authSessions.userId, current.user.id), gt(authSessions.expiresAt, new Date())))
    .orderBy(desc(authSessions.updatedAt));
  return rows.map((row) => ({
    id: row.id,
    userAgent: row.userAgent,
    createdAt: row.createdAt.toISOString(),
    lastActiveAt: row.updatedAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    current: row.id === current.session.id,
  }));
}

/**
 * Hapus satu sesi masuk milik pengguna (mis. perangkat yang hilang). Menghapus sesi perangkat
 * ini sama dengan keluar.
 */
export async function revokeAccountSession(
  requestHeaders: Headers,
  sessionId: string,
): Promise<"revoked" | "signed_out" | "not_found" | "unauthorized"> {
  const current = await auth.api.getSession({ headers: requestHeaders });
  if (!current) return "unauthorized";
  if (sessionId === current.session.id) {
    await signOutAccount(requestHeaders);
    return "signed_out";
  }
  const deleted = await db
    .delete(authSessions)
    .where(and(eq(authSessions.id, sessionId), eq(authSessions.userId, current.user.id)))
    .returning({ id: authSessions.id });
  return deleted.length > 0 ? "revoked" : "not_found";
}

/** Bersihkan sesi masuk & kode verifikasi yang sudah kedaluwarsa (dipanggil cron). */
export async function purgeExpiredAuthRecords() {
  const now = new Date();
  const [sessions, verifications] = await Promise.all([
    db.delete(authSessions).where(lt(authSessions.expiresAt, now)).returning({ id: authSessions.id }),
    db
      .delete(authVerifications)
      .where(lt(authVerifications.expiresAt, now))
      .returning({ id: authVerifications.id }),
  ]);
  return { sessions: sessions.length, verifications: verifications.length };
}

/** Email akun untuk identitas yang diketik (akun nomor HP memakai email internalnya). */
async function resolveAccountEmail(identifier: { kind: "email" | "phone"; value: string }) {
  if (identifier.kind === "email") return identifier.value;
  const [row] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.phoneNumber, identifier.value))
    .limit(1);
  return row?.email ?? null;
}

const INVALID_IDENTIFIER = {
  ok: false as const,
  code: "invalid" as const,
  field: "identifier" as const,
  message: "Gunakan email (nama@contoh.id) atau nomor HP (08xxxxxxxxxx).",
};
const INVALID_CODE = {
  ok: false as const,
  code: "invalid" as const,
  message: "Kode salah atau sudah kedaluwarsa.",
};

function resetError(error: unknown): AccountResult {
  if (error instanceof APIError) {
    if (error.status === "TOO_MANY_REQUESTS" || error.body?.code === "TOO_MANY_ATTEMPTS") {
      return {
        ok: false,
        code: "rate_limited",
        message: "Terlalu banyak percobaan. Minta kode baru lalu coba lagi.",
      };
    }
    return INVALID_CODE;
  }
  console.error(error);
  return { ok: false, code: "server_error", message: "Belum bisa diproses. Coba lagi sebentar lagi." };
}

/**
 * Langkah 1 lupa password: kirim kode 6 digit (berlaku 10 menit) ke email atau nomor HP akun.
 * Selalu "berhasil" untuk identitas yang valid supaya tidak membocorkan akun mana yang terdaftar.
 */
export async function requestPasswordReset(rawIdentifier: string): Promise<AccountResult> {
  const identifier = parseIdentifier(rawIdentifier);
  if (!identifier) return INVALID_IDENTIFIER;
  const email = await resolveAccountEmail(identifier);
  if (!email) return { ok: true };
  try {
    await auth.api.requestPasswordResetEmailOTP({ body: { email } });
    return { ok: true };
  } catch (error) {
    return resetError(error);
  }
}

/** Langkah 2: periksa kode tanpa memakainya (kode tetap dipakai di langkah 3). */
export async function verifyPasswordResetCode(rawIdentifier: string, code: string): Promise<AccountResult> {
  const identifier = parseIdentifier(rawIdentifier);
  if (!identifier) return INVALID_IDENTIFIER;
  if (!/^\d{6}$/.test(code)) return { ...INVALID_CODE, message: "Masukkan 6 digit kode." };
  const email = await resolveAccountEmail(identifier);
  if (!email) return INVALID_CODE;
  try {
    await auth.api.checkVerificationOTP({ body: { email, otp: code, type: "forget-password" } });
    return { ok: true };
  } catch (error) {
    return resetError(error);
  }
}

/**
 * Langkah 3: atur password baru dengan kode yang valid. Semua sesi masuk lama dicabut,
 * jadi pengguna masuk lagi dengan password baru.
 */
export async function resetPasswordWithCode(
  rawIdentifier: string,
  code: string,
  password: string,
): Promise<AccountResult> {
  const identifier = parseIdentifier(rawIdentifier);
  if (!identifier) return INVALID_IDENTIFIER;
  const problem = validatePassword(password);
  if (problem) return { ok: false, code: "invalid", field: "password", message: problem };
  const email = await resolveAccountEmail(identifier);
  if (!email) return INVALID_CODE;
  try {
    await auth.api.resetPasswordEmailOTP({ body: { email, otp: code, password } });
    return { ok: true };
  } catch (error) {
    return resetError(error);
  }
}
