import "server-only";

import { and, eq, inArray, isNotNull, isNull, lt } from "drizzle-orm";
import { db } from "@/db";
import { tryoutSessions } from "@/db/schema";

/** Berapa lama riwayat yang dihapus masih bisa diurungkan sebelum dibersihkan permanen. */
export const DELETED_RETENTION_DAYS = 30;
/** Batas sesi per permintaan hapus/pulihkan. */
export const HISTORY_BATCH_LIMIT = 200;

/**
 * Hapus riwayat (soft delete): sesi milik pengguna disembunyikan dari riwayat latihan, riwayat
 * nilai, hasil, dan pembahasan. Sesi berjalan yang dihapus tidak bisa dilanjutkan lagi.
 * Id yang bukan milik pengguna / sudah dihapus diabaikan. Mengembalikan id yang benar-benar dihapus.
 */
export async function deleteHistory(userId: string, sessionIds: string[]): Promise<string[]> {
  if (sessionIds.length === 0) return [];
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

/** Hapus semua riwayat SELESAI milik pengguna ("Hapus semua"). */
export async function deleteAllFinishedHistory(userId: string): Promise<string[]> {
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

/** Urungkan hapus: tampilkan lagi sesi yang dihapus (selama belum dibersihkan permanen). */
export async function restoreHistory(userId: string, sessionIds: string[]): Promise<string[]> {
  if (sessionIds.length === 0) return [];
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

/**
 * Bersihkan permanen sesi yang dihapus lebih dari masa simpan (jawaban & daftar soalnya ikut
 * terhapus lewat ON DELETE CASCADE). Dipanggil cron.
 */
export async function purgeDeletedHistory(retentionDays = DELETED_RETENTION_DAYS): Promise<number> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const rows = await db
    .delete(tryoutSessions)
    .where(and(isNotNull(tryoutSessions.deletedAt), lt(tryoutSessions.deletedAt, cutoff)))
    .returning({ id: tryoutSessions.id });
  return rows.length;
}
