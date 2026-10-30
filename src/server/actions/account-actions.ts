"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { LoginValues, RegisterValues } from "@/lib/auth/validation";
import {
  registerAccount,
  requestPasswordReset,
  resetPasswordWithCode,
  signInAccount,
  signOutAccount,
  type AccountResult,
  type AccountUser,
  verifyPasswordResetCode,
} from "@/server/account-service";

/** Daftar akun baru lalu langsung masuk. */
export async function registerAction(
  values: RegisterValues,
): Promise<AccountResult<{ user: { id: string; name: string } }>> {
  return registerAccount(
    {
      name: String(values?.name ?? ""),
      identifier: String(values?.identifier ?? ""),
      password: String(values?.password ?? ""),
    },
    await headers(),
  );
}

/** Masuk dengan email atau nomor HP + password. */
export async function loginAction(values: LoginValues): Promise<AccountResult<{ user: AccountUser }>> {
  return signInAccount(
    { identifier: String(values?.identifier ?? ""), password: String(values?.password ?? "") },
    await headers(),
  );
}

/** Keluar dari akun di perangkat ini (atau dari semua perangkat). */
export async function logoutAction(options?: { allDevices?: boolean }): Promise<{ ok: true }> {
  await signOutAccount(await headers(), { allDevices: Boolean(options?.allDevices) });
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Lupa password, langkah 1: kirim kode ke email/nomor HP. */
export async function requestPasswordResetAction(identifier: string): Promise<AccountResult> {
  return requestPasswordReset(String(identifier ?? ""));
}

/** Lupa password, langkah 2: periksa kode. */
export async function verifyResetCodeAction(identifier: string, code: string): Promise<AccountResult> {
  return verifyPasswordResetCode(String(identifier ?? ""), String(code ?? ""));
}

/** Lupa password, langkah 3: simpan password baru. */
export async function resetPasswordAction(
  identifier: string,
  code: string,
  password: string,
): Promise<AccountResult> {
  return resetPasswordWithCode(String(identifier ?? ""), String(code ?? ""), String(password ?? ""));
}
