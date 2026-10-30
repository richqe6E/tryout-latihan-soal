import { NextResponse } from "next/server";
import { signInAccount } from "@/server/account-service";

const STATUS = {
  invalid: 400,
  unauthorized: 401,
  conflict: 409,
  rate_limited: 429,
  server_error: 500,
} as const;

/**
 * POST /api/account/login — masuk dengan email atau nomor HP.
 * Body: { identifier: "nama@contoh.id" | "0812…", password }
 * Balasan 200: { user: { id, name, email, phone, createdAt } } + cookie sesi (berlaku 30 hari).
 * 400 isian tidak valid · 401 email/nomor HP atau password salah · 429 terlalu banyak percobaan.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body harus JSON.", code: "invalid" }, { status: 400 });
  }
  const result = await signInAccount(
    { identifier: String(body.identifier ?? ""), password: String(body.password ?? "") },
    request.headers,
  );
  if (result.ok) return NextResponse.json({ user: result.user });
  return NextResponse.json(
    { error: result.message, code: result.code, field: result.field },
    { status: STATUS[result.code] },
  );
}
