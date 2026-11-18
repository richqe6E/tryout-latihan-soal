import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { STUDENT_COOKIE_NAME } from "./session";

export type StudentSessionPayload = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

function getSecret(): string {
  return process.env.BETTER_AUTH_SECRET?.trim() || "tryout-kisi-kisi-student-session-secret";
}

/** Menghasilkan UUID v4-format deterministik dari nama siswa untuk mode lokal. */
export function deterministicStudentUuid(name: string): string {
  const normalized = name.trim().toLowerCase().replace(/\s+/g, " ");
  const hash = createHash("sha256").update(`student:${normalized}`).digest();
  const bytes = Uint8Array.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Buffer.from(bytes).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export function studentInternalEmail(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "") || "siswa";
  const shortHash = createHash("sha256").update(name.trim().toLowerCase()).digest("hex").slice(0, 8);
  return `${slug}.${shortHash}@siswa.tryout.local`;
}

function sign(encoded: string): string {
  return createHmac("sha256", getSecret()).update(encoded).digest("base64url");
}

export function encodeStudentCookie(payload: StudentSessionPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function decodeStudentCookie(raw: string | undefined): StudentSessionPayload | null {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const encoded = raw.slice(0, dot);
  const signature = raw.slice(dot + 1);
  const expected = sign(encoded);

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as StudentSessionPayload;
    if (!parsed?.id || !parsed?.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function readStudentCookie(): Promise<StudentSessionPayload | null> {
  const store = await cookies();
  return decodeStudentCookie(store.get(STUDENT_COOKIE_NAME)?.value);
}

export async function writeStudentCookie(payload: StudentSessionPayload) {
  const store = await cookies();
  store.set(STUDENT_COOKIE_NAME, encodeStudentCookie(payload), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearStudentCookie() {
  const store = await cookies();
  store.delete(STUDENT_COOKIE_NAME);
}
