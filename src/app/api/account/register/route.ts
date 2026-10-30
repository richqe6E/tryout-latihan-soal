import { NextResponse } from "next/server";
import { registerAccount } from "@/server/account-service";

const STATUS = {
  invalid: 400,
  unauthorized: 401,
  conflict: 409,
  rate_limited: 429,
  server_error: 500,
} as const;

/**
 * POST /api/account/register — daftar akun baru dengan email atau nomor HP.
 * Body: { name, identifier: "nama@contoh.id" | "0812…", password } (min. 8 karakter, huruf + angka).
 * Balasan 201: { user: { id, name } } + cookie sesi (langsung masuk).
 * 400 data tidak valid (`field` menunjuk isian yang salah) · 409 email/nomor HP sudah terdaftar.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body harus JSON.", code: "invalid" }, { status: 400 });
  }
  const result = await registerAccount(
    {
      name: String(body.name ?? ""),
      identifier: String(body.identifier ?? ""),
      password: String(body.password ?? ""),
    },
    request.headers,
  );
  if (result.ok) return NextResponse.json({ user: result.user }, { status: 201 });
  return NextResponse.json(
    { error: result.message, code: result.code, field: result.field },
    { status: STATUS[result.code] },
  );
}
