import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { answers, options, questions, sessionQuestions } from "@/db/schema";
import type { QuestionType } from "@/lib/kisi-kisi/types";
import { gradeAnswers } from "@/lib/tryout/grading";
import type { AnswerState, TryoutScore } from "@/lib/tryout/types";

type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type AnswerKeyEntry = {
  id: string;
  questionType: QuestionType;
  correctOptionId: string;
  optionIds: string[];
  expectedAnswer?: string;
  acceptedAnswers?: string[];
};

function parseAccepted(raw: string | null | undefined): string[] | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : undefined;
  } catch {
    return undefined;
  }
}

export async function getAnswerKey(sessionId: string, executor: Executor = db): Promise<AnswerKeyEntry[]> {
  const rows = await executor
    .select({
      questionId: sessionQuestions.questionId,
      questionType: questions.questionType,
      expectedAnswer: questions.expectedAnswer,
      acceptedAnswers: questions.acceptedAnswers,
    })
    .from(sessionQuestions)
    .innerJoin(questions, eq(questions.id, sessionQuestions.questionId))
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

  return rows.map((row) => {
    const own = optionRows.filter((option) => option.questionId === row.questionId);
    return {
      id: row.questionId,
      questionType: row.questionType,
      correctOptionId: own.find((option) => option.isCorrect)?.id ?? "",
      optionIds: own.map((option) => option.id),
      expectedAnswer: row.expectedAnswer ?? undefined,
      acceptedAnswers: parseAccepted(row.acceptedAnswers),
    };
  });
}

export async function getSavedAnswers(
  sessionId: string,
  executor: Executor = db,
): Promise<Record<string, AnswerState>> {
  const rows = await executor
    .select({
      questionId: answers.questionId,
      selectedOptionId: answers.selectedOptionId,
      answerText: answers.answerText,
      isFlagged: answers.isFlagged,
    })
    .from(answers)
    .where(eq(answers.sessionId, sessionId));
  return Object.fromEntries(
    rows.map((row) => [
      row.questionId,
      {
        selectedOptionId: row.selectedOptionId,
        answerText: row.answerText,
        isFlagged: row.isFlagged,
      },
    ]),
  );
}

export function scoreAgainstKey(key: AnswerKeyEntry[], saved: Record<string, AnswerState>): TryoutScore {
  const sanitized: Record<string, AnswerState> = {};
  for (const entry of key) {
    const answer = saved[entry.id];
    if (!answer) continue;
    const valid = answer.selectedOptionId !== null && entry.optionIds.includes(answer.selectedOptionId);
    sanitized[entry.id] = {
      ...answer,
      selectedOptionId: valid ? answer.selectedOptionId : null,
      answerText: answer.answerText ?? null,
    };
  }
  return gradeAnswers(key, sanitized);
}

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
 * Menandai `is_correct` tiap jawaban di database berdasarkan hasil penilaian lengkap
 * (mendukung PG, Isian Singkat, maupun Uraian).
 */
export async function markAnswerCorrectness(
  sessionId: string,
  executor: Executor = db,
  scoreResult?: TryoutScore,
) {
  const result = scoreResult ?? (await calculateSessionScore(sessionId, executor));
  for (const [questionId, outcome] of Object.entries(result.outcomes)) {
    const isCorrect = outcome === "kosong" ? null : outcome === "benar";
    await executor
      .update(answers)
      .set({ isCorrect })
      .where(and(eq(answers.sessionId, sessionId), eq(answers.questionId, questionId)));
  }
}
