import "server-only";

import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "@/server/auth";

export type CurrentUser = { id: string; name: string; email: string; phone: string | null; createdAt: Date };

/**
 * Pengguna yang sedang masuk (baris tabel `users`), dari sesi Better Auth.
 * Di-cache per permintaan supaya beberapa komponen/aksi tidak memvalidasi sesi berulang kali.
 */
export const getCurrentDbUser = cache(async (): Promise<CurrentUser | null> => {
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
  return null;
});
