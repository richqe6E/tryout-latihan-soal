"use server";

import { revalidatePath } from "next/cache";
import type { UserSettings } from "@/lib/tryout/types";
import { getCurrentDbUser } from "@/server/current-user";
import { saveSettingsForUser, settingsInputSchema } from "@/server/settings-service";
import type { ActionResult } from "./tryout-actions";

/** Simpan pengaturan pengguna (jumlah soal, durasi, pengingat). */
export async function saveSettingsAction(input: Partial<UserSettings>): Promise<ActionResult<UserSettings>> {
  const parsed = settingsInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid", message: "Pengaturan tidak valid." };
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, code: "unauthorized", message: "Sesi masuk berakhir. Silakan masuk lagi." };
  const result = await saveSettingsForUser(user.id, parsed.data);
  if (!result.ok) return { ok: false, code: "invalid", message: result.message, fields: result.fields };
  revalidatePath("/pengaturan");
  revalidatePath("/mulai");
  return { ok: true, data: result.settings };
}
