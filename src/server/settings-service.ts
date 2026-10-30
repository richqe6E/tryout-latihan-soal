import "server-only";

import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import type { UserSettings } from "@/lib/tryout/types";
import { SESSION_LIMITS, validateSessionSize } from "@/lib/tryout/limits";

/** Pengaturan bawaan untuk akun yang belum pernah menyimpan pengaturan. */
export const DEFAULT_SETTINGS: UserSettings = {
  defaultQuestionCount: SESSION_LIMITS.defaultQuestions,
  defaultDurationSeconds: SESSION_LIMITS.defaultDurationSeconds,
  reminderEnabled: true,
  reminderTime: "19:00",
};

/** Isian pengaturan yang boleh diubah; semua opsional (yang tidak dikirim tetap seperti semula). */
export const settingsInputSchema = z
  .object({
    // Batas & waktu minimal per soal diperiksa validateSessionSize (pesan per isian).
    defaultQuestionCount: z.number().int(),
    defaultDurationSeconds: z.number().int(),
    reminderEnabled: z.boolean(),
    reminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format jam HH:MM"),
  })
  .partial()
  .strict();

export type SettingsInput = z.infer<typeof settingsInputSchema>;

function toSettings(row: typeof userSettings.$inferSelect): UserSettings {
  return {
    defaultQuestionCount: row.defaultQuestionCount,
    defaultDurationSeconds: row.defaultDurationSeconds,
    reminderEnabled: row.reminderEnabled,
    reminderTime: row.reminderTime,
  };
}

/** Pengaturan pengguna; bawaan bila belum pernah disimpan. */
export async function getSettingsForUser(userId: string): Promise<UserSettings> {
  const [row] = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  return row ? toSettings(row) : DEFAULT_SETTINGS;
}

export type SaveSettingsResult =
  | { ok: true; settings: UserSettings }
  | { ok: false; message: string; fields: Partial<Record<keyof UserSettings, string>> };

/**
 * Simpan (sebagian) pengaturan; baris dibuat otomatis saat pertama kali disimpan. Gabungan nilai
 * baru + lama diperiksa dulu: batas jumlah soal & durasi serta waktu minimal per soal.
 */
export async function saveSettingsForUser(userId: string, input: SettingsInput): Promise<SaveSettingsResult> {
  const current = await getSettingsForUser(userId);
  const merged = { ...current, ...input };
  const sizeErrors = validateSessionSize({
    questionCount: merged.defaultQuestionCount,
    durationSeconds: merged.defaultDurationSeconds,
  });
  const fields: Partial<Record<keyof UserSettings, string>> = {
    ...(sizeErrors.questionCount ? { defaultQuestionCount: sizeErrors.questionCount } : {}),
    ...(sizeErrors.durationSeconds ? { defaultDurationSeconds: sizeErrors.durationSeconds } : {}),
  };
  const firstError = fields.defaultQuestionCount ?? fields.defaultDurationSeconds;
  if (firstError) return { ok: false, message: firstError, fields };

  const [row] = await db
    .insert(userSettings)
    .values({ userId, ...merged })
    .onConflictDoUpdate({
      target: userSettings.userId,
      // Hanya kolom yang dikirim yang diubah.
      set: Object.keys(input).length > 0 ? input : { updatedAt: sql`now()` },
    })
    .returning();
  return { ok: true, settings: toSettings(row) };
}
