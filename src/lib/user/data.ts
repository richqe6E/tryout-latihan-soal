import "server-only";

import { connection } from "next/server";
import { isInternalEmail } from "@/lib/auth/internal-email";
import type { UserProfile, UserSettings } from "@/lib/tryout/types";
import { getCurrentDbUser } from "@/server/current-user";
import { getSettingsForUser } from "@/server/settings-service";

/** Profil pengguna yang sedang masuk (dari tabel `users`), atau null bila belum masuk. */
export async function getCurrentUser(): Promise<UserProfile | null> {
  await connection();
  const user = await getCurrentDbUser();
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    // Email internal pengguna nomor HP tidak ditampilkan.
    email: isInternalEmail(user.email) ? "" : user.email,
    phone: user.phone,
    createdAt: user.createdAt.toISOString(),
  };
}

/** Pengaturan pengguna yang sedang masuk (bawaan bila belum pernah disimpan), atau null bila belum masuk. */
export async function getUserSettings(): Promise<UserSettings | null> {
  const user = await getCurrentDbUser();
  if (!user) return null;
  return getSettingsForUser(user.id);
}
