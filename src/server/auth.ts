import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins/email-otp";
import { phoneNumber } from "better-auth/plugins/phone-number";
import { db, hasDatabase } from "@/db";
import { authAccounts, authSessions, authVerifications, userSettings, users } from "@/db/schema";
import { AUTH_COOKIE_PREFIX } from "@/lib/auth/session";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/validation";
import { deliverOtp, otpTargetForEmail } from "@/server/otp-delivery";

const DAY_SECONDS = 60 * 60 * 24;

function createAuth() {
  return betterAuth({
    appName: "Latihan Kisi-Kisi & Tryout",
    secret: process.env.BETTER_AUTH_SECRET || "tryout-kisi-kisi-dev-secret-min-32-chars",
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
      cookiePrefix: AUTH_COOKIE_PREFIX,
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            await db.insert(userSettings).values({ userId: user.id }).onConflictDoNothing();
          },
        },
      },
    },
    session: {
      expiresIn: 30 * DAY_SECONDS,
      updateAge: DAY_SECONDS,
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: PASSWORD_MIN_LENGTH,
      autoSignIn: true,
      revokeSessionsOnPasswordReset: true,
    },
    plugins: [
      phoneNumber({
        sendOTP: ({ phoneNumber: target, code }) => {
          void deliverOtp({ channel: "sms", target, otp: code, purpose: "phone-verification" });
        },
      }),
      emailOTP({
        otpLength: 6,
        expiresIn: 10 * 60,
        allowedAttempts: 5,
        disableSignUp: true,
        sendVerificationOTP: async ({ email, otp, type }) => {
          void deliverOtp({ ...otpTargetForEmail(email), otp, purpose: type });
        },
      }),
      nextCookies(),
    ],
  });
}

type AuthInstance = ReturnType<typeof createAuth>;
let cachedAuth: AuthInstance | null = null;

export function getAuth(): AuthInstance | null {
  if (!hasDatabase()) return null;
  if (!cachedAuth) cachedAuth = createAuth();
  return cachedAuth;
}

export const auth = new Proxy({} as AuthInstance, {
  get(_target, prop, receiver) {
    const instance = getAuth();
    if (!instance) {
      throw new Error("Better Auth hanya tersedia saat DATABASE_URL telah dikonfigurasi.");
    }
    return Reflect.get(instance, prop, receiver);
  },
});

export type AuthSession = AuthInstance["$Infer"]["Session"];
