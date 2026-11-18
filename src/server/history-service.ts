import "server-only";

import { and, eq, inArray, isNotNull, isNull, lt } from "drizzle-orm";
import { db, hasDatabase } from "@/db";
import { tryoutSessions } from "@/db/schema";
import {
  deleteAllFinishedLocalHistory,
  deleteLocalHistory,
  restoreLocalHistory,
} from "@/server/local-store";

export const DELETED_RETENTION_DAYS = 30;
export const HISTORY_BATCH_LIMIT = 200;

export async function deleteHistory(userId: string, sessionIds: string[]): Promise<string[]> {
  if (sessionIds.length === 0) return [];
  if (!hasDatabase()) return deleteLocalHistory(userId, sessionIds);
  const rows = await db
    .update(tryoutSessions)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(tryoutSessions.userId, userId),
        inArray(tryoutSessions.id, sessionIds),
        isNull(tryoutSessions.deletedAt),
      ),
    )
    .returning({ id: tryoutSessions.id });
  return rows.map((row) => row.id);
}

export async function deleteAllFinishedHistory(userId: string): Promise<string[]> {
  if (!hasDatabase()) return deleteAllFinishedLocalHistory(userId);
  const rows = await db
    .update(tryoutSessions)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(tryoutSessions.userId, userId),
        eq(tryoutSessions.status, "selesai"),
        isNull(tryoutSessions.deletedAt),
      ),
    )
    .returning({ id: tryoutSessions.id });
  return rows.map((row) => row.id);
}

export async function restoreHistory(userId: string, sessionIds: string[]): Promise<string[]> {
  if (sessionIds.length === 0) return [];
  if (!hasDatabase()) return restoreLocalHistory(userId, sessionIds);
  const rows = await db
    .update(tryoutSessions)
    .set({ deletedAt: null })
    .where(
      and(
        eq(tryoutSessions.userId, userId),
        inArray(tryoutSessions.id, sessionIds),
        isNotNull(tryoutSessions.deletedAt),
      ),
    )
    .returning({ id: tryoutSessions.id });
  return rows.map((row) => row.id);
}

export async function purgeDeletedHistory(retentionDays = DELETED_RETENTION_DAYS): Promise<number> {
  if (!hasDatabase()) return 0;
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const rows = await db
    .delete(tryoutSessions)
    .where(and(isNotNull(tryoutSessions.deletedAt), lt(tryoutSessions.deletedAt, cutoff)))
    .returning({ id: tryoutSessions.id });
  return rows.length;
}
