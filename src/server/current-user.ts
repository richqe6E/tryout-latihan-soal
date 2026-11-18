import "server-only";

import { cookies, headers } from "next/headers";
import { cache } from "react";
import { hasDatabase } from "@/db";
import { AUTH_COOKIE_PREFIX } from "@/lib/auth/session";
import { readStudentCookie } from "@/lib/auth/student-cookie";
import { getAuth } from "@/server/auth";

export type CurrentUser = { id: string; name: string; email: string; phone: string | null; createdAt: Date };

/**
 * Pengguna yang sedang masuk:
 * 1. Memeriksa cookie siswa (`tryoutyuk_student` — login cukup dengan nama siswa).
 * 2. Fallback ke sesi Better Auth hanya jika cookie Better Auth memang ada & DATABASE_URL aktif.
 */
export const getCurrentDbUser = cache(async (): Promise<CurrentUser | null> => {
  const student = await readStudentCookie();
  if (student) {
    return {
      id: student.id,
      name: student.name,
      email: student.email,
      phone: null,
      createdAt: new Date(student.createdAt),
    };
  }

  if (!hasDatabase()) return null;

  const cookieStore = await cookies();
  const hasBetterAuthCookie = cookieStore
    .getAll()
    .some((cookie) => cookie.name.includes(`${AUTH_COOKIE_PREFIX}.session_token`));
  if (!hasBetterAuthCookie) return null;

  const auth = getAuth();
  if (!auth) return null;

  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (session) {
      const { user } = session;
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phoneNumber ?? null,
        createdAt: new Date(user.createdAt),
      };
    }
  } catch (error) {
    console.error("Gagal membaca sesi Better Auth:", error);
  }
  return null;
});
