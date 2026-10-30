import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins/email-otp";
import { phoneNumber } from "better-auth/plugins/phone-number";
import { db } from "@/db";
import { authAccounts, authSessions, authVerifications, userSettings, users } from "@/db/schema";
import { AUTH_COOKIE_PREFIX } from "@/lib/auth/session";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/validation";
import { deliverOtp, otpTargetForEmail } from "@/server/otp-delivery";

const DAY_SECONDS = 60 * 60 * 24;

/**
 * Better Auth: daftar, masuk, keluar, dan lupa password (email atau nomor HP).
 * Tabel memakai skema Drizzle kita (users + auth_sessions/auth_accounts/auth_verifications);
 * id berupa uuid dari PostgreSQL. Hash password (scrypt) disimpan di `auth_accounts.password`.
 */
export const auth = betterAuth({
  appName: "Tryout Yuk",
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      session: authSessions,
      account: authAccounts,
      verification: authVerifications,
    },
  }),
  advanced: {
    database: { generateId: "uuid" },
    // Nama cookie khas aplikasi ini (cookie localhost dipakai bersama oleh semua port/aplikasi).
    cookiePrefix: AUTH_COOKIE_PREFIX,
  },
  databaseHooks: {
    user: {
      create: {
        // Setiap akun baru langsung punya pengaturan bawaan (termasuk pengingat belajar 19:00 WIB).
        after: async (user) => {
          await db.insert(userSettings).values({ userId: user.id }).onConflictDoNothing();
        },
      },
    },
  },
  session: {
    expiresIn: 30 * DAY_SECONDS,
    // Perpanjang otomatis bila dipakai lagi setelah sehari.
    updateAge: DAY_SECONDS,
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: PASSWORD_MIN_LENGTH,
    autoSignIn: true,
    // Setelah password diatur ulang, semua perangkat yang masih masuk dikeluarkan.
    revokeSessionsOnPasswordReset: true,
  },
  plugins: [
    phoneNumber({
      sendOTP: ({ phoneNumber: target, code }) => {
        void deliverOtp({ channel: "sms", target, otp: code, purpose: "phone-verification" });
      },
    }),
    // Lupa password dengan kode 6 digit. Semua akun punya email (akun nomor HP memakai email
    // internal), jadi satu alur dipakai untuk email maupun nomor HP; pengiriman memilih SMS/email.
    emailOTP({
      otpLength: 6,
      expiresIn: 10 * 60,
      allowedAttempts: 5,
      disableSignUp: true,
      sendVerificationOTP: async ({ email, otp, type }) => {
        void deliverOtp({ ...otpTargetForEmail(email), otp, purpose: type });
      },
    }),
    // Harus paling akhir: menulis cookie sesi dari Server Action / Route Handler.
    nextCookies(),
  ],
});

export type AuthSession = typeof auth.$Infer.Session;
