"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { hasDatabase } from "@/db";
import { clearStudentCookie } from "@/lib/auth/student-cookie";
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

export async function registerAction(
  values: RegisterValues,
): Promise<AccountResult<{ user: { id: string; name: string } }>> {
  if (!hasDatabase()) {
    return { ok: false, code: "server_error", message: "Silakan masuk cukup dengan mengisi nama siswa." };
  }
  return registerAccount(
    {
      name: String(values?.name ?? ""),
      identifier: String(values?.identifier ?? ""),
      password: String(values?.password ?? ""),
    },
    await headers(),
  );
}

export async function loginAction(values: LoginValues): Promise<AccountResult<{ user: AccountUser }>> {
  if (!hasDatabase()) {
    return { ok: false, code: "server_error", message: "Silakan masuk cukup dengan mengisi nama siswa." };
  }
  return signInAccount(
    { identifier: String(values?.identifier ?? ""), password: String(values?.password ?? "") },
    await headers(),
  );
}

/** Keluar dari sesi siswa maupun Better Auth (jika aktif). */
export async function logoutAction(options?: { allDevices?: boolean }): Promise<{ ok: true }> {
  await clearStudentCookie();
  if (hasDatabase()) {
    await signOutAccount(await headers(), { allDevices: Boolean(options?.allDevices) }).catch(() => null);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function requestPasswordResetAction(identifier: string): Promise<AccountResult> {
  if (!hasDatabase()) {
    return { ok: false, code: "server_error", message: "Tidak tersedia di mode lokal." };
  }
  return requestPasswordReset(String(identifier ?? ""));
}

export async function verifyResetCodeAction(identifier: string, code: string): Promise<AccountResult> {
  if (!hasDatabase()) {
    return { ok: false, code: "server_error", message: "Tidak tersedia di mode lokal." };
  }
  return verifyPasswordResetCode(String(identifier ?? ""), String(code ?? ""));
}

export async function resetPasswordAction(
  identifier: string,
  code: string,
  password: string,
): Promise<AccountResult> {
  if (!hasDatabase()) {
    return { ok: false, code: "server_error", message: "Tidak tersedia di mode lokal." };
  }
  return resetPasswordWithCode(String(identifier ?? ""), String(code ?? ""), String(password ?? ""));
}
