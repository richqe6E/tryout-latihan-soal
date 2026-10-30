"use server";

import { z } from "zod";
import { getCurrentDbUser } from "@/server/current-user";
import { revalidatePath } from "next/cache";
import {
  saveAnswer,
  saveLastQuestion,
  setFlag,
  getSessionTime,
  pauseSession,
  resumeSession,
  startSession,
  submitSession,
  TryoutServiceError,
  type PauseResult,
  type ResumeResult,
  type SessionTime,
  type StartedSession,
  type SubmitResult,
} from "@/server/tryout-service";

export type ActionResult<T = undefined> =
  | ({ ok: true } & ([T] extends [undefined] ? object : { data: T }))
  | { ok: false; code: string; message: string; fields?: Record<string, string> };

const saveAnswerSchema = z.object({
  sessionId: z.uuid(),
  questionId: z.uuid(),
  selectedOptionId: z.uuid().nullable(),
  isFlagged: z.boolean(),
  lastOrderNumber: z.number().int().min(1).max(500).optional(),
});

function failure(error: unknown): {
  ok: false;
  code: string;
  message: string;
  fields?: Record<string, string>;
} {
  if (error instanceof TryoutServiceError) {
    return { ok: false, code: error.code, message: error.message, fields: error.fields };
  }
  console.error(error);
  return { ok: false, code: "server_error", message: "Terjadi kesalahan di server. Coba lagi." };
}

/** Simpan jawaban satu soal (dipanggil otomatis setiap jawaban/ragu-ragu berubah). */
export async function saveAnswerAction(
  input: z.input<typeof saveAnswerSchema>,
): Promise<ActionResult<{ savedAt: string }>> {
  const parsed = saveAnswerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid", message: "Data jawaban tidak valid." };
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, code: "unauthorized", message: "Sesi masuk berakhir. Silakan masuk lagi." };
  try {
    const data = await saveAnswer(user.id, parsed.data);
    return { ok: true, data };
  } catch (error) {
    return failure(error);
  }
}

const lastQuestionSchema = z.object({
  sessionId: z.uuid(),
  lastOrderNumber: z.number().int().min(1).max(500),
});

/** Catat posisi soal terakhir (untuk "lanjutkan dari soal terakhir"). */
export async function saveLastQuestionAction(
  input: z.input<typeof lastQuestionSchema>,
): Promise<ActionResult> {
  const parsed = lastQuestionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid", message: "Data tidak valid." };
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, code: "unauthorized", message: "Sesi masuk berakhir. Silakan masuk lagi." };
  try {
    await saveLastQuestion(user.id, parsed.data.sessionId, parsed.data.lastOrderNumber);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

const flagSchema = z.object({ sessionId: z.uuid(), questionId: z.uuid(), isFlagged: z.boolean() });

/** Tandai / hapus tanda ragu-ragu satu soal. */
export async function setFlagAction(
  input: z.input<typeof flagSchema>,
): Promise<ActionResult<{ savedAt: string; isFlagged: boolean }>> {
  const parsed = flagSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid", message: "Data tidak valid." };
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, code: "unauthorized", message: "Sesi masuk berakhir. Silakan masuk lagi." };
  try {
    return { ok: true, data: await setFlag(user.id, parsed.data) };
  } catch (error) {
    return failure(error);
  }
}

const answerStateSchema = z.object({ selectedOptionId: z.uuid().nullable(), isFlagged: z.boolean() });
const submitSchema = z.object({
  sessionId: z.uuid(),
  reason: z.enum(["manual", "timeout"]),
  answers: z.record(z.uuid(), answerStateSchema).optional(),
});

/** Kumpulkan jawaban dan hitung nilai di server. */
export async function submitTryoutAction(
  input: z.input<typeof submitSchema>,
): Promise<ActionResult<SubmitResult>> {
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid", message: "Data pengumpulan tidak valid." };
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, code: "unauthorized", message: "Sesi masuk berakhir. Silakan masuk lagi." };
  try {
    const data = await submitSession(user.id, parsed.data);
    revalidatePath("/riwayat");
    revalidatePath("/nilai");
    return { ok: true, data };
  } catch (error) {
    return failure(error);
  }
}

const startSchema = z.object({
  subjectSlug: z.string().regex(/^[a-z0-9-]{1,60}$/),
  difficulty: z.enum(["mudah", "sedang", "sulit"]),
  // Opsional (bawaan 10 soal / 30 menit). Batas & waktu minimal per soal diperiksa di layanan
  // (validateSessionSize) supaya pesannya spesifik.
  questionCount: z.number().int().optional(),
  durationSeconds: z.number().int().optional(),
});

/** Mulai sesi tryout baru dengan soal acak dan batas waktu. */
export async function startTryoutAction(
  input: z.input<typeof startSchema>,
): Promise<ActionResult<StartedSession>> {
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid", message: "Pilihan tryout tidak valid." };
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, code: "unauthorized", message: "Silakan masuk dulu untuk memulai tryout." };
  try {
    const data = await startSession(user.id, parsed.data);
    revalidatePath("/riwayat");
    return { ok: true, data };
  } catch (error) {
    return failure(error);
  }
}

/** Sisa waktu otoritatif dari server (untuk sinkronisasi timer). */
export async function getSessionTimeAction(sessionId: string): Promise<ActionResult<SessionTime>> {
  if (!z.uuid().safeParse(sessionId).success)
    return { ok: false, code: "invalid", message: "Sesi tidak valid." };
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, code: "unauthorized", message: "Sesi masuk berakhir. Silakan masuk lagi." };
  try {
    return { ok: true, data: await getSessionTime(user.id, sessionId) };
  } catch (error) {
    return failure(error);
  }
}

const pauseSchema = z.object({
  sessionId: z.uuid(),
  lastOrderNumber: z.number().int().min(1).max(500).optional(),
  answers: z.record(z.uuid(), answerStateSchema).optional(),
});

/** "Simpan & keluar": simpan jawaban & posisi, lalu hentikan timer sesi. */
export async function pauseTryoutAction(
  input: z.input<typeof pauseSchema>,
): Promise<ActionResult<PauseResult>> {
  const parsed = pauseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid", message: "Data sesi tidak valid." };
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, code: "unauthorized", message: "Sesi masuk berakhir. Silakan masuk lagi." };
  try {
    const data = await pauseSession(user.id, parsed.data);
    revalidatePath("/riwayat");
    return { ok: true, data };
  } catch (error) {
    return failure(error);
  }
}

/** Lanjutkan sesi yang dijeda: timer berjalan lagi dari sisa waktunya. */
export async function resumeTryoutAction(sessionId: string): Promise<ActionResult<ResumeResult>> {
  if (!z.uuid().safeParse(sessionId).success)
    return { ok: false, code: "invalid", message: "Sesi tidak valid." };
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, code: "unauthorized", message: "Sesi masuk berakhir. Silakan masuk lagi." };
  try {
    return { ok: true, data: await resumeSession(user.id, sessionId) };
  } catch (error) {
    return failure(error);
  }
}
