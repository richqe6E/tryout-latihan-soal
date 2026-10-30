import { NextResponse } from "next/server";
import { requestPasswordReset } from "@/server/account-service";
import { ACCOUNT_STATUS } from "../status";

/**
 * POST /api/account/password/forgot — kirim kode 6 digit (berlaku 10 menit) untuk atur ulang password.
 * Body: { identifier: "nama@contoh.id" | "0812…" }. Kode dikirim lewat email atau SMS.
 * Balasan 200: { ok: true } — juga bila akun tidak terdaftar (tidak membocorkan akun). 400 bila identitas tidak valid.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const result = await requestPasswordReset(String(body?.identifier ?? ""));
  if (result.ok) return NextResponse.json({ ok: true });
  return NextResponse.json(
    { error: result.message, code: result.code, field: result.field },
    { status: ACCOUNT_STATUS[result.code] },
  );
}
