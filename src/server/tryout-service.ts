import "server-only";

import { TransactionRollbackError, and, asc, eq, isNotNull, isNull, lt } from "drizzle-orm";
import { db, hasDatabase } from "@/db";
import { answers, options, questions, sessionQuestions, subjects, tryoutSessions } from "@/db/schema";
import { getKisiKisiPackage } from "@/lib/kisi-kisi";
import { SESSION_LIMITS, validateSessionSize } from "@/lib/tryout/limits";
import type { AnswerState, Difficulty, TryoutScore } from "@/lib/tryout/types";
import {
  getLocalSessionTime,
  pauseLocalSession,
  resumeLocalSession,
  saveLocalAnswer,
  saveLocalLastQuestion,
  setLocalFlag,
  startLocalSession,
  submitLocalSession,
} from "@/server/local-store";
import { pickQuestions } from "@/server/question-picker";
import {
  getAnswerKey,
  getSavedAnswers,
  markAnswerCorrectness,
  scoreAgainstKey,
  type AnswerKeyEntry,
} from "@/server/scoring-service";

const DEADLINE_GRACE_SECONDS = 5;

export type ServiceErrorCode =
  | "unauthorized"
  | "not_found"
  | "finished"
  | "expired"
  | "invalid"
  | "unavailable";

export class TryoutServiceError extends Error {
  constructor(
    public readonly code: ServiceErrorCode,
    message: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export async function requireOwnedSession(sessionId: string, userId: string) {
  const [session] = await db
    .select()
    .from(tryoutSessions)
    .where(
      and(
        eq(tryoutSessions.id, sessionId),
        eq(tryoutSessions.userId, userId),
        isNull(tryoutSessions.deletedAt),
      ),
    )
    .limit(1);
  if (!session) throw new TryoutServiceError("not_found", "Sesi tryout tidak ditemukan.");
  return session;
}

export function isPastDeadline(session: { deadlineAt: Date; pausedRemainingSeconds: number | null }) {
  if (session.pausedRemainingSeconds !== null) return false;
  return Date.now() - session.deadlineAt.getTime() > DEADLINE_GRACE_SECONDS * 1000;
}

export function assertWritable(session: {
  status: string;
  deadlineAt: Date;
  pausedRemainingSeconds: number | null;
}) {
  if (session.status === "selesai") {
    throw new TryoutServiceError("finished", "Tryout ini sudah dikumpulkan.");
  }
  if (isPastDeadline(session)) {
    throw new TryoutServiceError("expired", "Waktu tryout sudah habis.");
  }
}

export type SaveAnswerInput = {
  sessionId: string;
  questionId: string;
  selectedOptionId: string | null;
  answerText?: string | null;
  isFlagged: boolean;
  lastOrderNumber?: number;
};

export async function saveAnswer(userId: string, input: SaveAnswerInput) {
  if (!hasDatabase()) return saveLocalAnswer(userId, input);
  const session = await requireOwnedSession(input.sessionId, userId);
  assertWritable(session);

  const membership = await requireSessionQuestion(session.id, input.questionId);

  if (input.selectedOptionId) {
    const [option] = await db
      .select({ id: options.id })
      .from(options)
      .where(and(eq(options.id, input.selectedOptionId), eq(options.questionId, input.questionId)))
      .limit(1);
    if (!option) throw new TryoutServiceError("invalid", "Pilihan jawaban tidak valid untuk soal ini.");
  }

  const savedAt = new Date();
  const answerText = input.answerText ?? null;
  await db.transaction(async (tx) => {
    await tx
      .insert(answers)
      .values({
        sessionId: session.id,
        questionId: input.questionId,
        selectedOptionId: input.selectedOptionId,
        answerText,
        isFlagged: input.isFlagged,
        answeredAt: savedAt,
      })
      .onConflictDoUpdate({
        target: [answers.sessionId, answers.questionId],
        set: {
          selectedOptionId: input.selectedOptionId,
          answerText,
          isFlagged: input.isFlagged,
          answeredAt: savedAt,
        },
      });
    await tx
      .update(tryoutSessions)
      .set({ lastOrderNumber: input.lastOrderNumber ?? membership.orderNumber })
      .where(eq(tryoutSessions.id, session.id));
  });

  return { savedAt: savedAt.toISOString() };
}

async function requireSessionQuestion(sessionId: string, questionId: string) {
  const [membership] = await db
    .select({ orderNumber: sessionQuestions.orderNumber })
    .from(sessionQuestions)
    .where(and(eq(sessionQuestions.sessionId, sessionId), eq(sessionQuestions.questionId, questionId)))
    .limit(1);
  if (!membership) throw new TryoutServiceError("invalid", "Soal tidak termasuk dalam tryout ini.");
  return membership;
}

export async function setFlag(
  userId: string,
  input: { sessionId: string; questionId: string; isFlagged: boolean },
) {
  if (!hasDatabase()) return setLocalFlag(userId, input);
  const session = await requireOwnedSession(input.sessionId, userId);
  assertWritable(session);
  await requireSessionQuestion(session.id, input.questionId);

  const savedAt = new Date();
  await db
    .insert(answers)
    .values({
      sessionId: session.id,
      questionId: input.questionId,
      selectedOptionId: null,
      answerText: null,
      isFlagged: input.isFlagged,
      answeredAt: savedAt,
    })
    .onConflictDoUpdate({
      target: [answers.sessionId, answers.questionId],
      set: { isFlagged: input.isFlagged, answeredAt: savedAt },
    });
  return { savedAt: savedAt.toISOString(), isFlagged: input.isFlagged };
}

export async function saveLastQuestion(userId: string, sessionId: string, lastOrderNumber: number) {
  if (!hasDatabase()) return saveLocalLastQuestion(userId, sessionId, lastOrderNumber);
  const session = await requireOwnedSession(sessionId, userId);
  if (session.status === "selesai") return;
  const clamped = Math.min(Math.max(Math.trunc(lastOrderNumber), 1), session.totalQuestions);
  await db.update(tryoutSessions).set({ lastOrderNumber: clamped }).where(eq(tryoutSessions.id, session.id));
}

async function saveAnswerSnapshot(
  sessionId: string,
  keyById: Map<string, AnswerKeyEntry>,
  snapshot: Record<string, AnswerState>,
) {
  const now = new Date();
  for (const [questionId, answer] of Object.entries(snapshot)) {
    const entry = keyById.get(questionId);
    if (!entry) continue;
    const selectedOptionId =
      answer.selectedOptionId && entry.optionIds.includes(answer.selectedOptionId)
        ? answer.selectedOptionId
        : null;
    const answerText = answer.answerText ?? null;
    const isFlagged = Boolean(answer.isFlagged);
    await db
      .insert(answers)
      .values({ sessionId, questionId, selectedOptionId, answerText, isFlagged, answeredAt: now })
      .onConflictDoUpdate({
        target: [answers.sessionId, answers.questionId],
        set: { selectedOptionId, answerText, isFlagged, answeredAt: now },
      });
  }
}

export type PauseInput = {
  sessionId: string;
  lastOrderNumber?: number;
  answers?: Record<string, AnswerState>;
};

export type PauseResult =
  { status: "dijeda"; remainingSeconds: number; lastOrderNumber: number } | { status: "selesai" };

export async function pauseSession(userId: string, input: PauseInput): Promise<PauseResult> {
  if (!hasDatabase()) {
    const res = pauseLocalSession(userId, input);
    return { status: "dijeda", remainingSeconds: res.remainingSeconds, lastOrderNumber: input.lastOrderNumber ?? 1 };
  }
  const session = await requireOwnedSession(input.sessionId, userId);
  if (session.status === "selesai") throw new TryoutServiceError("finished", "Tryout ini sudah dikumpulkan.");
  if (await expireIfNeeded(session)) return { status: "selesai" };

  if (input.answers) {
    const key = await getAnswerKey(session.id);
    await saveAnswerSnapshot(session.id, new Map(key.map((entry) => [entry.id, entry])), input.answers);
  }
  const lastOrderNumber =
    input.lastOrderNumber === undefined
      ? session.lastOrderNumber
      : Math.min(Math.max(Math.trunc(input.lastOrderNumber), 1), session.totalQuestions);
  const remainingSeconds =
    session.pausedRemainingSeconds ??
    Math.min(
      session.durationSeconds,
      Math.max(0, Math.ceil((session.deadlineAt.getTime() - Date.now()) / 1000)),
    );

  await db
    .update(tryoutSessions)
    .set({ pausedRemainingSeconds: remainingSeconds, lastOrderNumber })
    .where(and(eq(tryoutSessions.id, session.id), eq(tryoutSessions.status, "berjalan")));
  return { status: "dijeda", remainingSeconds, lastOrderNumber };
}

export type ResumeResult = { deadline: string; remainingSeconds: number; serverNow: string };

export async function resumeSession(userId: string, sessionId: string): Promise<ResumeResult> {
  if (!hasDatabase()) {
    const res = resumeLocalSession(userId, sessionId);
    return { ...res, serverNow: new Date().toISOString() };
  }
  const session = await requireOwnedSession(sessionId, userId);
  if (session.status === "selesai") throw new TryoutServiceError("finished", "Tryout ini sudah dikumpulkan.");
  const now = new Date();

  if (session.pausedRemainingSeconds === null) {
    assertWritable(session);
    return {
      deadline: session.deadlineAt.toISOString(),
      remainingSeconds: Math.max(0, Math.round((session.deadlineAt.getTime() - now.getTime()) / 1000)),
      serverNow: now.toISOString(),
    };
  }

  const deadlineAt = new Date(now.getTime() + session.pausedRemainingSeconds * 1000);
  const [row] = await db
    .update(tryoutSessions)
    .set({ deadlineAt, pausedRemainingSeconds: null })
    .where(
      and(
        eq(tryoutSessions.id, session.id),
        eq(tryoutSessions.status, "berjalan"),
        isNotNull(tryoutSessions.pausedRemainingSeconds),
      ),
    )
    .returning({ deadlineAt: tryoutSessions.deadlineAt });
  const effective = row?.deadlineAt ?? (await requireOwnedSession(sessionId, userId)).deadlineAt;
  return {
    deadline: effective.toISOString(),
    remainingSeconds: Math.max(0, Math.round((effective.getTime() - now.getTime()) / 1000)),
    serverNow: now.toISOString(),
  };
}

export type SubmitInput = {
  sessionId: string;
  reason: "manual" | "timeout";
  answers?: Record<string, AnswerState>;
};

export type SubmitResult = {
  score: number;
  correct: number;
  wrong: number;
  empty: number;
  total: number;
  usedSeconds: number;
  alreadySubmitted: boolean;
};

function storedResult(session: typeof tryoutSessions.$inferSelect, fallback: TryoutScore): SubmitResult {
  return {
    score: session.score ?? fallback.score,
    correct: session.correctCount ?? fallback.correct,
    wrong: session.wrongCount ?? fallback.wrong,
    empty: session.unansweredCount ?? fallback.empty,
    total: session.totalQuestions,
    usedSeconds: session.usedSeconds ?? session.durationSeconds,
    alreadySubmitted: true,
  };
}

function timeIsUp(
  session: Pick<typeof tryoutSessions.$inferSelect, "deadlineAt" | "pausedRemainingSeconds">,
  now: Date,
) {
  if (session.pausedRemainingSeconds !== null)
    return session.pausedRemainingSeconds <= DEADLINE_GRACE_SECONDS;
  return session.deadlineAt.getTime() - now.getTime() <= DEADLINE_GRACE_SECONDS * 1000;
}

function usedSecondsAt(
  session: Pick<
    typeof tryoutSessions.$inferSelect,
    "durationSeconds" | "deadlineAt" | "pausedRemainingSeconds"
  >,
  now: Date,
  late: boolean,
) {
  const remaining = late
    ? 0
    : (session.pausedRemainingSeconds ??
      Math.max(0, Math.round((session.deadlineAt.getTime() - now.getTime()) / 1000)));
  return Math.min(session.durationSeconds, Math.max(0, session.durationSeconds - remaining));
}

export async function submitSession(userId: string, input: SubmitInput): Promise<SubmitResult> {
  if (!hasDatabase()) {
    const res = submitLocalSession(userId, input);
    return {
      score: res.score,
      correct: res.correct,
      wrong: res.wrong,
      empty: res.empty,
      total: res.total,
      usedSeconds: res.usedSeconds,
      alreadySubmitted: false,
    };
  }
  const session = await requireOwnedSession(input.sessionId, userId);
  const answerKey = await getAnswerKey(session.id);
  const keyById = new Map(answerKey.map((entry) => [entry.id, entry]));

  const late = isPastDeadline(session);

  if (session.status !== "selesai" && input.answers && !late) {
    await saveAnswerSnapshot(session.id, keyById, input.answers);
  }

  const result = scoreAgainstKey(answerKey, await getSavedAnswers(session.id));

  if (session.status === "selesai") return storedResult(session, result);

  const finishedAt = new Date();
  const usedSeconds = usedSecondsAt(session, finishedAt, late);
  const finished = await db
    .transaction(async (tx) => {
      await markAnswerCorrectness(session.id, tx, result);
      const [row] = await tx
        .update(tryoutSessions)
        .set({
          status: "selesai",
          finishedAt,
          submitReason:
            late || (input.reason === "timeout" && timeIsUp(session, finishedAt)) ? "timeout" : "manual",
          score: result.score,
          correctCount: result.correct,
          wrongCount: result.wrong,
          unansweredCount: result.empty,
          usedSeconds,
          pausedRemainingSeconds: null,
        })
        .where(and(eq(tryoutSessions.id, session.id), eq(tryoutSessions.status, "berjalan")))
        .returning({ id: tryoutSessions.id });
      if (!row) tx.rollback();
      return true;
    })
    .catch((error: unknown) => {
      if (error instanceof TransactionRollbackError) return false;
      throw error;
    });

  if (!finished) return storedResult(await requireOwnedSession(session.id, userId), result);

  return {
    score: result.score,
    correct: result.correct,
    wrong: result.wrong,
    empty: result.empty,
    total: result.total,
    usedSeconds,
    alreadySubmitted: false,
  };
}

export { SESSION_LIMITS };

export type StartSessionInput = {
  subjectSlug: string;
  difficulty: Difficulty;
  mode?: "kisi-kisi" | "latihan";
  questionCount?: number;
  durationSeconds?: number;
};

export type StartedSession = {
  sessionId: string;
  subject: { id: string; name: string };
  difficulty: Difficulty;
  requestedQuestions: number;
  totalQuestions: number;
  durationSeconds: number;
  startedAt: string;
  expiresAt: string;
};

export async function startSession(userId: string, input: StartSessionInput): Promise<StartedSession> {
  if (!hasDatabase()) return startLocalSession(userId, input);

  const [subject] = await db
    .select()
    .from(subjects)
    .where(and(eq(subjects.slug, input.subjectSlug), eq(subjects.isActive, true)))
    .limit(1);
  if (!subject) throw new TryoutServiceError("not_found", "Mata pelajaran tidak ditemukan.");

  const mode = input.mode ?? "kisi-kisi";
  const pkg = getKisiKisiPackage(subject.slug);

  let picked: string[] = [];
  if (mode === "kisi-kisi") {
    const orderedRows = await db
      .select({ id: questions.id })
      .from(questions)
      .where(and(eq(questions.subjectId, subject.id), eq(questions.isActive, true)))
      .orderBy(asc(questions.questionNumber), asc(questions.createdAt));
    picked = orderedRows.map((r) => r.id);
  } else {
    const count = input.questionCount ?? SESSION_LIMITS.defaultQuestions;
    picked = await pickQuestions({
      userId,
      subjectId: subject.id,
      difficulty: input.difficulty,
      count,
    });
  }

  if (picked.length === 0) {
    throw new TryoutServiceError(
      "unavailable",
      `Soal ${subject.name} belum tersedia di database. Pastikan SQL seed sudah dijalankan.`,
    );
  }

  const count = mode === "kisi-kisi" ? picked.length : (input.questionCount ?? picked.length);
  const durationSeconds =
    input.durationSeconds ??
    Math.max(picked.length * SESSION_LIMITS.minSecondsPerQuestion, (pkg?.meta.durationMinutes ?? 60) * 60);

  const sizeErrors = validateSessionSize({ questionCount: count, durationSeconds });
  const firstError = sizeErrors.questionCount ?? sizeErrors.durationSeconds;
  if (firstError) throw new TryoutServiceError("invalid", firstError, sizeErrors);

  const startedAt = new Date();
  const deadlineAt = new Date(startedAt.getTime() + durationSeconds * 1000);

  const sessionId = await db.transaction(async (tx) => {
    const [session] = await tx
      .insert(tryoutSessions)
      .values({
        userId,
        subjectId: subject.id,
        difficulty: input.difficulty,
        mode,
        totalQuestions: picked.length,
        requestedQuestions: count,
        durationSeconds,
        startedAt,
        deadlineAt,
      })
      .returning({ id: tryoutSessions.id });
    await tx.insert(sessionQuestions).values(
      picked.map((questionId, index) => ({
        sessionId: session.id,
        questionId,
        orderNumber: index + 1,
      })),
    );
    return session.id;
  });

  return {
    sessionId,
    subject: { id: subject.slug, name: subject.name },
    difficulty: input.difficulty,
    requestedQuestions: count,
    totalQuestions: picked.length,
    durationSeconds,
    startedAt: startedAt.toISOString(),
    expiresAt: deadlineAt.toISOString(),
  };
}

export type SessionTime = {
  status: "berjalan" | "selesai";
  serverNow: string;
  deadline: string;
  remainingSeconds: number;
  paused: boolean;
};

export async function getSessionTime(userId: string, sessionId: string): Promise<SessionTime> {
  if (!hasDatabase()) return getLocalSessionTime(userId, sessionId);
  let session = await requireOwnedSession(sessionId, userId);
  if (await expireIfNeeded(session)) session = await requireOwnedSession(sessionId, userId);
  const now = Date.now();
  const paused = session.pausedRemainingSeconds !== null;
  const remainingSeconds =
    session.status === "selesai"
      ? 0
      : paused
        ? (session.pausedRemainingSeconds ?? 0)
        : Math.max(0, Math.round((session.deadlineAt.getTime() - now) / 1000));
  return {
    status: session.status,
    serverNow: new Date(now).toISOString(),
    deadline: session.deadlineAt.toISOString(),
    remainingSeconds,
    paused,
  };
}

export async function expireIfNeeded(session: {
  id: string;
  userId: string;
  status: "berjalan" | "selesai";
  deadlineAt: Date;
  pausedRemainingSeconds: number | null;
}) {
  if (session.status !== "berjalan" || !isPastDeadline(session)) return false;
  await submitSession(session.userId, { sessionId: session.id, reason: "timeout" });
  return true;
}

export async function expireOverdueForUser(userId: string) {
  if (!hasDatabase()) return 0;
  const cutoff = new Date(Date.now() - DEADLINE_GRACE_SECONDS * 1000);
  const overdue = await db
    .select({
      id: tryoutSessions.id,
      userId: tryoutSessions.userId,
      status: tryoutSessions.status,
      deadlineAt: tryoutSessions.deadlineAt,
      pausedRemainingSeconds: tryoutSessions.pausedRemainingSeconds,
    })
    .from(tryoutSessions)
    .where(
      and(
        eq(tryoutSessions.userId, userId),
        eq(tryoutSessions.status, "berjalan"),
        isNull(tryoutSessions.pausedRemainingSeconds),
        isNull(tryoutSessions.deletedAt),
        lt(tryoutSessions.deadlineAt, cutoff),
      ),
    );
  for (const session of overdue) await expireIfNeeded(session);
  return overdue.length;
}

export async function expireOverdueSessions(limit = 200) {
  if (!hasDatabase()) return 0;
  const cutoff = new Date(Date.now() - DEADLINE_GRACE_SECONDS * 1000);
  const overdue = await db
    .select({
      id: tryoutSessions.id,
      userId: tryoutSessions.userId,
      status: tryoutSessions.status,
      deadlineAt: tryoutSessions.deadlineAt,
      pausedRemainingSeconds: tryoutSessions.pausedRemainingSeconds,
    })
    .from(tryoutSessions)
    .where(
      and(
        eq(tryoutSessions.status, "berjalan"),
        isNull(tryoutSessions.pausedRemainingSeconds),
        isNull(tryoutSessions.deletedAt),
        lt(tryoutSessions.deadlineAt, cutoff),
      ),
    )
    .limit(limit);
  let closed = 0;
  for (const session of overdue) {
    try {
      if (await expireIfNeeded(session)) closed += 1;
    } catch (error) {
      console.error(`Gagal menutup sesi ${session.id}`, error);
    }
  }
  return closed;
}
