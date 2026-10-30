import { NextResponse } from "next/server";
import { verifyPasswordResetCode } from "@/server/account-service";
import { ACCOUNT_STATUS } from "../status";

/**
 * POST /api/account/password/verify — periksa kode atur ulang tanpa memakainya.
 * Body: { identifier, code: "123456" }. Balasan 200: { ok: true }.
 * 400 kode salah/kedaluwarsa · 429 terlalu banyak percobaan (minta kode baru).
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const result = await verifyPasswordResetCode(String(body?.identifier ?? ""), String(body?.code ?? ""));
  if (result.ok) return NextResponse.json({ ok: true });
  return NextResponse.json(
    { error: result.message, code: result.code, field: result.field },
    { status: ACCOUNT_STATUS[result.code] },
  );
}
