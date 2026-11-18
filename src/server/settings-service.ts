import "server-only";

import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, hasDatabase } from "@/db";
import { userSettings } from "@/db/schema";
import type { UserSettings } from "@/lib/tryout/types";
import { SESSION_LIMITS, validateSessionSize } from "@/lib/tryout/limits";
import { getLocalSettings, saveLocalSettings } from "@/server/local-store";

export const DEFAULT_SETTINGS: UserSettings = {
  defaultQuestionCount: 35,
  defaultDurationSeconds: 60 * 60,
  reminderEnabled: true,
  reminderTime: "19:00",
};

export const settingsInputSchema = z
  .object({
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

export async function getSettingsForUser(userId: string): Promise<UserSettings> {
  if (!hasDatabase()) return getLocalSettings(userId);
  const [row] = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  return row ? toSettings(row) : DEFAULT_SETTINGS;
}

export type SaveSettingsResult =
  | { ok: true; settings: UserSettings }
  | { ok: false; message: string; fields: Partial<Record<keyof UserSettings, string>> };

export async function saveSettingsForUser(userId: string, input: SettingsInput): Promise<SaveSettingsResult> {
  if (!hasDatabase()) return saveLocalSettings(userId, input);
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
      set: Object.keys(input).length > 0 ? input : { updatedAt: sql`now()` },
    })
    .returning();
  return { ok: true, settings: toSettings(row) };
}

export { SESSION_LIMITS };
