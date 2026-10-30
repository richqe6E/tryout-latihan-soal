"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentDbUser } from "@/server/current-user";
import {
  HISTORY_BATCH_LIMIT,
  deleteAllFinishedHistory,
  deleteHistory,
  restoreHistory,
} from "@/server/history-service";
import type { ActionResult } from "./tryout-actions";

const idsSchema = z.array(z.uuid()).min(1).max(HISTORY_BATCH_LIMIT);

function revalidateHistoryPages() {
  revalidatePath("/riwayat");
  revalidatePath("/nilai");
  revalidatePath("/akun");
}

/** Hapus riwayat tertentu (bisa diurungkan). */
export async function deleteHistoryAction(
  sessionIds: string[],
): Promise<ActionResult<{ deleted: string[] }>> {
  const parsed = idsSchema.safeParse(sessionIds);
  if (!parsed.success) return { ok: false, code: "invalid", message: "Pilihan riwayat tidak valid." };
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, code: "unauthorized", message: "Sesi masuk berakhir. Silakan masuk lagi." };
  const deleted = await deleteHistory(user.id, parsed.data);
  revalidateHistoryPages();
  return { ok: true, data: { deleted } };
}

/** Hapus semua riwayat yang sudah selesai (bisa diurungkan). */
export async function deleteAllFinishedHistoryAction(): Promise<ActionResult<{ deleted: string[] }>> {
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, code: "unauthorized", message: "Sesi masuk berakhir. Silakan masuk lagi." };
  const deleted = await deleteAllFinishedHistory(user.id);
  revalidateHistoryPages();
  return { ok: true, data: { deleted } };
}

/** Urungkan hapus riwayat. */
export async function restoreHistoryAction(
  sessionIds: string[],
): Promise<ActionResult<{ restored: string[] }>> {
  const parsed = idsSchema.safeParse(sessionIds);
  if (!parsed.success) return { ok: false, code: "invalid", message: "Pilihan riwayat tidak valid." };
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, code: "unauthorized", message: "Sesi masuk berakhir. Silakan masuk lagi." };
  const restored = await restoreHistory(user.id, parsed.data);
  revalidateHistoryPages();
  return { ok: true, data: { restored } };
}
