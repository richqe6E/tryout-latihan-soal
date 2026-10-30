import { NextResponse } from "next/server";
import { resetPasswordWithCode } from "@/server/account-service";
import { ACCOUNT_STATUS } from "../status";

/**
 * POST /api/account/password/reset — simpan password baru dengan kode yang valid.
 * Body: { identifier, code, password } (min. 8 karakter, huruf + angka).
 * Balasan 200: { ok: true } — semua sesi masuk lama dicabut; masuk lagi dengan password baru.
 * 400 password lemah / kode salah · 429 terlalu banyak percobaan.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const result = await resetPasswordWithCode(
    String(body?.identifier ?? ""),
    String(body?.code ?? ""),
    String(body?.password ?? ""),
  );
  if (result.ok) return NextResponse.json({ ok: true });
  return NextResponse.json(
    { error: result.message, code: result.code, field: result.field },
    { status: ACCOUNT_STATUS[result.code] },
  );
}
