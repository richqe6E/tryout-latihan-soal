import "server-only";

import { asc, eq, inArray, sql } from "drizzle-orm";
import { gradeAnswers } from "@/lib/tryout/grading";
import type { AnswerState, TryoutScore } from "@/lib/tryout/types";
import { db } from "@/db";
import { answers, options, sessionQuestions } from "@/db/schema";

type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Kunci jawaban satu soal dalam sesi: hanya id, tanpa teks soal/pembahasan. */
export type AnswerKeyEntry = { id: string; correctOptionId: string; optionIds: string[] };

/** Kunci jawaban sesi, urut sesuai nomor soal. Selalu dibaca dari database, tak pernah dari klien. */
export async function getAnswerKey(sessionId: string, executor: Executor = db): Promise<AnswerKeyEntry[]> {
  const rows = await executor
    .select({ questionId: sessionQuestions.questionId })
    .from(sessionQuestions)
    .where(eq(sessionQuestions.sessionId, sessionId))
    .orderBy(asc(sessionQuestions.orderNumber));
  const questionIds = rows.map((row) => row.questionId);
  const optionRows = questionIds.length
    ? await executor
        .select({ id: options.id, questionId: options.questionId, isCorrect: options.isCorrect })
        .from(options)
        .where(inArray(options.questionId, questionIds))
        .orderBy(asc(options.position))
    : [];

  return questionIds.map((id) => {
    const own = optionRows.filter((option) => option.questionId === id);
    return {
      id,
      correctOptionId: own.find((option) => option.isCorrect)?.id ?? "",
      optionIds: own.map((option) => option.id),
    };
  });
}

/** Jawaban yang tersimpan untuk sesi, dikunci per id soal. */
export async function getSavedAnswers(
  sessionId: string,
  executor: Executor = db,
): Promise<Record<string, AnswerState>> {
  const rows = await executor
    .select({
      questionId: answers.questionId,
      selectedOptionId: answers.selectedOptionId,
      isFlagged: answers.isFlagged,
    })
    .from(answers)
    .where(eq(answers.sessionId, sessionId));
  return Object.fromEntries(
    rows.map((row) => [row.questionId, { selectedOptionId: row.selectedOptionId, isFlagged: row.isFlagged }]),
  );
}

/**
 * Nilai jawaban terhadap kunci. Pilihan yang bukan milik soalnya dianggap kosong,
 * sama dengan cara `markAnswerCorrectness` menandai `is_correct`.
 */
export function scoreAgainstKey(key: AnswerKeyEntry[], saved: Record<string, AnswerState>): TryoutScore {
  const sanitized: Record<string, AnswerState> = {};
  for (const entry of key) {
    const answer = saved[entry.id];
    if (!answer) continue;
    const valid = answer.selectedOptionId !== null && entry.optionIds.includes(answer.selectedOptionId);
    sanitized[entry.id] = { ...answer, selectedOptionId: valid ? answer.selectedOptionId : null };
  }
  return gradeAnswers(key, sanitized);
}

/** Hitung nilai sesi dari jawaban yang tersimpan di database. */
export async function calculateSessionScore(
  sessionId: string,
  executor: Executor = db,
): Promise<TryoutScore> {
  const [key, saved] = await Promise.all([
    getAnswerKey(sessionId, executor),
    getSavedAnswers(sessionId, executor),
  ]);
  return scoreAgainstKey(key, saved);
}

/**
 * Tandai benar/salah tiap jawaban dalam satu query: benar/salah mengikuti pilihan yang
 * dipilih, kosong (atau pilihan bukan milik soalnya) menjadi null.
 */
export async function markAnswerCorrectness(sessionId: string, executor: Executor = db) {
  await executor
    .update(answers)
    .set({
      isCorrect: sql`(SELECT ${options.isCorrect} FROM ${options} WHERE ${options.id} = ${answers.selectedOptionId} AND ${options.questionId} = ${answers.questionId})`,
    })
    .where(eq(answers.sessionId, sessionId));
}
