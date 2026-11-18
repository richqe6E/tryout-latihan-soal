"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, hasDatabase } from "@/db";
import { userSettings, users } from "@/db/schema";
import {
  clearStudentCookie,
  deterministicStudentUuid,
  studentInternalEmail,
  writeStudentCookie,
} from "@/lib/auth/student-cookie";

const studentNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama siswa minimal 2 huruf.")
    .max(60, "Nama siswa maksimal 60 huruf."),
});

export type StudentLoginResult =
  | { ok: true; user: { id: string; name: string } }
  | { ok: false; message: string };

/**
 * Masuk cukup dengan mengisi nama siswa saja (tanpa password/email).
 * Bila DATABASE_URL aktif, data siswa disimpan ke tabel `users` & `user_settings`.
 */
export async function studentLoginAction(input: { name: string }): Promise<StudentLoginResult> {
  const parsed = studentNameSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Nama siswa tidak valid." };
  }

  const cleanName = parsed.data.name.replace(/\s+/g, " ").trim();
  const email = studentInternalEmail(cleanName);

  if (hasDatabase()) {
    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    let userId: string;
    let createdAt: string;

    if (existing) {
      userId = existing.id;
      createdAt = existing.createdAt.toISOString();
      if (existing.name !== cleanName) {
        await db.update(users).set({ name: cleanName }).where(eq(users.id, existing.id));
      }
    } else {
      const [created] = await db
        .insert(users)
        .values({
          name: cleanName,
          email,
          emailVerified: true,
        })
        .returning({ id: users.id, createdAt: users.createdAt });
      userId = created.id;
      createdAt = created.createdAt.toISOString();
      await db.insert(userSettings).values({ userId }).onConflictDoNothing();
    }

    await writeStudentCookie({ id: userId, name: cleanName, email, createdAt });
    revalidatePath("/");
    return { ok: true, user: { id: userId, name: cleanName } };
  }

  const userId = deterministicStudentUuid(cleanName);
  await writeStudentCookie({
    id: userId,
    name: cleanName,
    email,
    createdAt: new Date().toISOString(),
  });
  revalidatePath("/");
  return { ok: true, user: { id: userId, name: cleanName } };
}

export async function studentLogoutAction() {
  await clearStudentCookie();
  revalidatePath("/");
  return { ok: true as const };
}
