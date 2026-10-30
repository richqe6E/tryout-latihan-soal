import { NextResponse } from "next/server";
import { signOutAccount } from "@/server/account-service";

/**
 * POST /api/account/logout — keluar: sesi dicabut di server dan cookie dihapus.
 * Body (opsional): { allDevices: true } untuk sekalian keluar dari semua perangkat lain.
 * Balasan: { ok: true } (juga bila sesi sudah tidak berlaku).
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { allDevices?: unknown } | null;
  await signOutAccount(request.headers, { allDevices: body?.allDevices === true });
  return NextResponse.json({ ok: true });
}
