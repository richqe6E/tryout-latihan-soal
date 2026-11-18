import "server-only";

import { and, asc, desc, eq, inArray, isNull, lt, ne, sql } from "drizzle-orm";
import { db, hasDatabase } from "@/db";
import type { CognitiveLevel, VisualAssetId } from "@/lib/kisi-kisi/types";
import type { ReviewFilter } from "@/lib/tryout/review-filter";
import { answers, options, questions, sessionQuestions, subjects, tryoutSessions } from "@/db/schema";
import {
  getLocalPracticeHistory,
  getLocalResultLookupForUser,
  getLocalReviewDetailForUser,
  getLocalReviewForUser,
  getLocalScoreHistory,
  getLocalSessionForUser,
} from "@/server/local-store";
import { expireIfNeeded, expireOverdueForUser } from "@/server/tryout-service";
import type {
  AnswerState,
  Difficulty,
  PracticeHistoryItem,
  QuestionOutcome,
  ResultItem,
  ReviewItem,
  ReviewQuestion,
  ScoreHistoryEntry,
  TryoutResultDetail,
  TryoutReview,
  TryoutReviewDetail,
  TryoutSession,
} from "@/lib/tryout/types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const notDeleted = isNull(tryoutSessions.deletedAt);

export function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

function parseAccepted(raw: string | null | undefined): string[] | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : undefined;
  } catch {
    return undefined;
  }
}

export async function getSessionForUser(sessionId: string, userId: string): Promise<TryoutSession | null> {
  if (!isUuid(sessionId)) return null;
  if (!hasDatabase()) return getLocalSessionForUser(sessionId, userId);

  const [session] = await db
    .select({ session: tryoutSessions, subject: subjects })
    .from(tryoutSessions)
    .innerJoin(subjects, eq(subjects.id, tryoutSessions.subjectId))
    .where(and(eq(tryoutSessions.id, sessionId), eq(tryoutSessions.userId, userId), notDeleted))
    .limit(1);
  if (!session) return null;

  if (await expireIfNeeded(session.session)) {
    return getSessionForUser(sessionId, userId);
  }

  const questionRows = await db
    .select({
      id: questions.id,
      orderNumber: sessionQuestions.orderNumber,
      text: questions.questionText,
      questionType: questions.questionType,
      typeLabel: questions.typeLabel,
      topic: questions.topic,
      indicator: questions.indicator,
      cognitiveLevel: questions.cognitiveLevel,
      stimulusTitle: questions.stimulusTitle,
      stimulusText: questions.stimulusText,
      visualAsset: questions.visualAsset,
      visualCaption: questions.visualCaption,
    })
    .from(sessionQuestions)
    .innerJoin(questions, eq(questions.id, sessionQuestions.questionId))
    .where(eq(sessionQuestions.sessionId, sessionId))
    .orderBy(asc(sessionQuestions.orderNumber));

  const questionIds = questionRows.map((row) => row.id);
  const optionRows = questionIds.length
    ? await db
        .select({ id: options.id, questionId: options.questionId, text: options.optionText })
        .from(options)
        .where(inArray(options.questionId, questionIds))
        .orderBy(asc(options.questionId), asc(options.position))
    : [];

  const answerRows = await db
    .select({
      questionId: answers.questionId,
      selectedOptionId: answers.selectedOptionId,
      answerText: answers.answerText,
      isFlagged: answers.isFlagged,
    })
    .from(answers)
    .where(eq(answers.sessionId, sessionId));

  const optionsByQuestion = new Map<string, { id: string; text: string }[]>();
  for (const option of optionRows) {
    const list = optionsByQuestion.get(option.questionId) ?? [];
    list.push({ id: option.id, text: option.text });
    optionsByQuestion.set(option.questionId, list);
  }

  const answerMap: Record<string, AnswerState> = {};
  for (const answer of answerRows) {
    answerMap[answer.questionId] = {
      selectedOptionId: answer.selectedOptionId,
      answerText: answer.answerText,
      isFlagged: answer.isFlagged,
    };
  }

  const { session: row, subject } = session;
  return {
    id: row.id,
    title: row.mode === "kisi-kisi" ? `Latihan Kisi-Kisi ${subject.name}` : `Tryout ${subject.name}`,
    subject: { id: subject.slug, name: subject.name, description: subject.description },
    difficulty: row.difficulty,
    mode: row.mode === "latihan" ? "latihan" : "kisi-kisi",
    totalQuestions: row.totalQuestions,
    durationSeconds: row.durationSeconds,
    startedAt: row.startedAt.toISOString(),
    deadline:
      row.pausedRemainingSeconds === null
        ? row.deadlineAt.toISOString()
        : new Date(Date.now() + row.pausedRemainingSeconds * 1000).toISOString(),
    status: row.status,
    questions: questionRows.map((question) => ({
      id: question.id,
      orderNumber: question.orderNumber,
      questionType: question.questionType,
      typeLabel: question.typeLabel ?? undefined,
      topic: question.topic ?? undefined,
      indicator: question.indicator ?? undefined,
      cognitiveLevel: (question.cognitiveLevel as CognitiveLevel | null) ?? undefined,
      stimulusTitle: question.stimulusTitle ?? undefined,
      stimulusText: question.stimulusText ?? undefined,
      visualAsset: (question.visualAsset as VisualAssetId | null) ?? undefined,
      visualCaption: question.visualCaption ?? undefined,
      text: question.text,
      options: optionsByQuestion.get(question.id) ?? [],
    })),
    answers: answerMap,
    lastOrderNumber: row.lastOrderNumber,
    pausedRemainingSeconds: row.pausedRemainingSeconds,
  };
}

async function getReviewQuestions(sessionId: string): Promise<ReviewQuestion[]> {
  const questionRows = await db
    .select({
      id: questions.id,
      orderNumber: sessionQuestions.orderNumber,
      text: questions.questionText,
      questionType: questions.questionType,
      typeLabel: questions.typeLabel,
      topic: questions.topic,
      indicator: questions.indicator,
      cognitiveLevel: questions.cognitiveLevel,
      stimulusTitle: questions.stimulusTitle,
      stimulusText: questions.stimulusText,
      visualAsset: questions.visualAsset,
      visualCaption: questions.visualCaption,
      expectedAnswer: questions.expectedAnswer,
      acceptedAnswers: questions.acceptedAnswers,
      rubricNotes: questions.rubricNotes,
      explanation: questions.explanation,
    })
    .from(sessionQuestions)
    .innerJoin(questions, eq(questions.id, sessionQuestions.questionId))
    .where(eq(sessionQuestions.sessionId, sessionId))
    .orderBy(asc(sessionQuestions.orderNumber));

  const questionIds = questionRows.map((row) => row.id);
  const optionRows = questionIds.length
    ? await db
        .select({
          id: options.id,
          questionId: options.questionId,
          text: options.optionText,
          isCorrect: options.isCorrect,
          explanation: options.explanation,
        })
        .from(options)
        .where(inArray(options.questionId, questionIds))
        .orderBy(asc(options.questionId), asc(options.position))
    : [];

  return questionRows.map((question) => {
    const own = optionRows.filter((option) => option.questionId === question.id);
    return {
      id: question.id,
      orderNumber: question.orderNumber,
      questionType: question.questionType,
      typeLabel: question.typeLabel ?? undefined,
      topic: question.topic ?? undefined,
      indicator: question.indicator ?? undefined,
      cognitiveLevel: (question.cognitiveLevel as CognitiveLevel | null) ?? undefined,
      stimulusTitle: question.stimulusTitle ?? undefined,
      stimulusText: question.stimulusText ?? undefined,
      visualAsset: (question.visualAsset as VisualAssetId | null) ?? undefined,
      visualCaption: question.visualCaption ?? undefined,
      text: question.text,
      options: own.map(({ id, text, explanation }) =>
        explanation ? { id, text, explanation } : { id, text },
      ),
      correctOptionId: own.find((option) => option.isCorrect)?.id ?? "",
      expectedAnswer: question.expectedAnswer ?? undefined,
      acceptedAnswers: parseAccepted(question.acceptedAnswers),
      rubricNotes: question.rubricNotes ?? undefined,
      explanation: question.explanation,
    };
  });
}

async function getSubjectHistory(
  userId: string,
  subject: { id: string; slug: string; name: string },
  excludeSessionId: string,
  before: Date,
): Promise<ScoreHistoryEntry[]> {
  const rows = await db
    .select({
      sessionId: tryoutSessions.id,
      mode: tryoutSessions.mode,
      score: tryoutSessions.score,
      correctCount: tryoutSessions.correctCount,
      totalQuestions: tryoutSessions.totalQuestions,
      requestedQuestions: tryoutSessions.requestedQuestions,
      durationSeconds: tryoutSessions.durationSeconds,
      difficulty: tryoutSessions.difficulty,
      finishedAt: tryoutSessions.finishedAt,
    })
    .from(tryoutSessions)
    .where(
      and(
        eq(tryoutSessions.userId, userId),
        notDeleted,
        eq(tryoutSessions.subjectId, subject.id),
        eq(tryoutSessions.status, "selesai"),
        ne(tryoutSessions.id, excludeSessionId),
        lt(tryoutSessions.finishedAt, before),
      ),
    )
    .orderBy(desc(tryoutSessions.finishedAt))
    .limit(10);
  return rows.map((row) => ({
    sessionId: row.sessionId,
    title: row.mode === "kisi-kisi" ? `Latihan Kisi-Kisi ${subject.name}` : `Tryout ${subject.name}`,
    subjectId: subject.slug,
    subjectName: subject.name,
    difficulty: row.difficulty,
    score: row.score ?? 0,
    correct: row.correctCount ?? Math.round(((row.score ?? 0) / 100) * row.totalQuestions),
    total: row.totalQuestions,
    requestedQuestions: row.requestedQuestions,
    durationSeconds: row.durationSeconds,
    finishedAt: (row.finishedAt ?? before).toISOString(),
  }));
}

export async function getReviewForUser(sessionId: string, userId: string): Promise<TryoutReview | null> {
  if (!isUuid(sessionId)) return null;
  if (!hasDatabase()) return getLocalReviewForUser(sessionId, userId);

  const [found] = await db
    .select({ session: tryoutSessions, subject: subjects })
    .from(tryoutSessions)
    .innerJoin(subjects, eq(subjects.id, tryoutSessions.subjectId))
    .where(and(eq(tryoutSessions.id, sessionId), eq(tryoutSessions.userId, userId), notDeleted))
    .limit(1);
  if (!found || found.session.status !== "selesai" || !found.session.finishedAt) return null;
  const { session, subject } = found;
  const finishedAt = found.session.finishedAt;

  const [reviewQuestions, answerRows, history] = await Promise.all([
    getReviewQuestions(sessionId),
    db
      .select({
        questionId: answers.questionId,
        selectedOptionId: answers.selectedOptionId,
        answerText: answers.answerText,
        isFlagged: answers.isFlagged,
      })
      .from(answers)
      .where(eq(answers.sessionId, sessionId)),
    getSubjectHistory(userId, subject, sessionId, finishedAt),
  ]);

  const answerMap: Record<string, AnswerState> = {};
  for (const answer of answerRows) {
    answerMap[answer.questionId] = {
      selectedOptionId: answer.selectedOptionId,
      answerText: answer.answerText,
      isFlagged: answer.isFlagged,
    };
  }

  return {
    sessionId: session.id,
    title: session.mode === "kisi-kisi" ? `Latihan Kisi-Kisi ${subject.name}` : `Tryout ${subject.name}`,
    subject: { id: subject.slug, name: subject.name, description: subject.description },
    difficulty: session.difficulty,
    mode: session.mode === "latihan" ? "latihan" : "kisi-kisi",
    durationSeconds: session.durationSeconds,
    startedAt: session.startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    questions: reviewQuestions,
    answers: answerMap,
    history,
    submitReason: session.submitReason ?? "manual",
    deadline: session.deadlineAt.toISOString(),
    usedSeconds: session.usedSeconds ?? undefined,
  };
}

export async function getResultDetailForUser(
  sessionId: string,
  userId: string,
): Promise<TryoutResultDetail | null> {
  const lookup = await getResultLookupForUser(sessionId, userId);
  return lookup.status === "ok" ? lookup.result : null;
}

export type ResultLookup =
  | { status: "ok"; result: TryoutResultDetail }
  | { status: "not_found" }
  | { status: "not_finished"; lastOrderNumber: number; remainingSeconds: number; paused: boolean };

export async function getResultLookupForUser(sessionId: string, userId: string): Promise<ResultLookup> {
  if (!isUuid(sessionId)) return { status: "not_found" };
  if (!hasDatabase()) return getLocalResultLookupForUser(sessionId, userId);

  const [found] = await db
    .select({ session: tryoutSessions, subject: subjects })
    .from(tryoutSessions)
    .innerJoin(subjects, eq(subjects.id, tryoutSessions.subjectId))
    .where(and(eq(tryoutSessions.id, sessionId), eq(tryoutSessions.userId, userId), notDeleted))
    .limit(1);
  if (!found) return { status: "not_found" };
  if (await expireIfNeeded(found.session)) return getResultLookupForUser(sessionId, userId);
  if (found.session.status !== "selesai" || !found.session.finishedAt) {
    const { session: running } = found;
    return {
      status: "not_finished",
      lastOrderNumber: running.lastOrderNumber,
      paused: running.pausedRemainingSeconds !== null,
      remainingSeconds:
        running.pausedRemainingSeconds ??
        Math.max(0, Math.round((running.deadlineAt.getTime() - Date.now()) / 1000)),
    };
  }
  const { session, subject } = found;
  const finishedAt = found.session.finishedAt;

  const [itemRows, history] = await Promise.all([
    db
      .select({
        number: sessionQuestions.orderNumber,
        questionId: sessionQuestions.questionId,
        isCorrect: answers.isCorrect,
        isFlagged: answers.isFlagged,
      })
      .from(sessionQuestions)
      .leftJoin(
        answers,
        and(
          eq(answers.sessionId, sessionQuestions.sessionId),
          eq(answers.questionId, sessionQuestions.questionId),
        ),
      )
      .where(eq(sessionQuestions.sessionId, sessionId))
      .orderBy(asc(sessionQuestions.orderNumber)),
    getSubjectHistory(userId, subject, sessionId, finishedAt),
  ]);

  const items: ResultItem[] = itemRows.map((row) => ({
    number: row.number,
    questionId: row.questionId,
    outcome: row.isCorrect === null ? "kosong" : row.isCorrect ? "benar" : "salah",
    flagged: row.isFlagged ?? false,
  }));
  const countOf = (outcome: QuestionOutcome) => items.filter((item) => item.outcome === outcome).length;
  const correct = session.correctCount ?? countOf("benar");
  const wrong = session.wrongCount ?? countOf("salah");
  const score = session.score ?? 0;

  const result: TryoutResultDetail = {
    sessionId: session.id,
    title: session.mode === "kisi-kisi" ? `Latihan Kisi-Kisi ${subject.name}` : `Tryout ${subject.name}`,
    subject: { id: subject.slug, name: subject.name, description: subject.description },
    difficulty: session.difficulty,
    score,
    correct,
    wrong,
    empty: session.unansweredCount ?? countOf("kosong"),
    total: session.totalQuestions,
    requestedQuestions: session.requestedQuestions,
    submitReason: session.submitReason ?? "manual",
    autoSubmitted: session.submitReason === "timeout",
    durationSeconds: session.durationSeconds,
    startedAt: session.startedAt.toISOString(),
    deadline: session.deadlineAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    usedSeconds: session.usedSeconds ?? session.durationSeconds,
    outcomes: Object.fromEntries(items.map((item) => [item.questionId, item.outcome])),
    accuracy: correct + wrong > 0 ? Math.round((correct / (correct + wrong)) * 100) : 0,
    items,
    history,
    scoreChange: history[0] ? score - history[0].score : null,
  };
  return { status: "ok", result };
}

export type ScoreHistoryQuery = {
  subject?: string;
  difficulty?: Difficulty;
  limit?: number;
  before?: Date;
};

export type ScoreHistoryPage = {
  items: ScoreHistoryEntry[];
  nextCursor: string | null;
  summary: { count: number; average: number; best: number };
};

export async function getScoreHistoryForUser(
  userId: string,
  query: ScoreHistoryQuery = {},
): Promise<ScoreHistoryPage> {
  if (!hasDatabase()) return getLocalScoreHistory(userId, query);
  const limit = Math.min(Math.max(query.limit ?? 50, 1), 100);
  const scope = and(
    eq(tryoutSessions.userId, userId),
    notDeleted,
    eq(tryoutSessions.status, "selesai"),
    query.subject ? eq(subjects.slug, query.subject) : undefined,
    query.difficulty ? eq(tryoutSessions.difficulty, query.difficulty) : undefined,
  );

  const [rows, [summary]] = await Promise.all([
    db
      .select({
        sessionId: tryoutSessions.id,
        mode: tryoutSessions.mode,
        subjectSlug: subjects.slug,
        subjectName: subjects.name,
        difficulty: tryoutSessions.difficulty,
        score: tryoutSessions.score,
        correctCount: tryoutSessions.correctCount,
        totalQuestions: tryoutSessions.totalQuestions,
        requestedQuestions: tryoutSessions.requestedQuestions,
        durationSeconds: tryoutSessions.durationSeconds,
        finishedAt: tryoutSessions.finishedAt,
      })
      .from(tryoutSessions)
      .innerJoin(subjects, eq(subjects.id, tryoutSessions.subjectId))
      .where(and(scope, query.before ? lt(tryoutSessions.finishedAt, query.before) : undefined))
      .orderBy(desc(tryoutSessions.finishedAt), desc(tryoutSessions.id))
      .limit(limit + 1),
    db
      .select({
        count: sql<number>`count(*)::int`,
        average: sql<number>`coalesce(round(avg(${tryoutSessions.score})), 0)::int`,
        best: sql<number>`coalesce(max(${tryoutSessions.score}), 0)::int`,
      })
      .from(tryoutSessions)
      .innerJoin(subjects, eq(subjects.id, tryoutSessions.subjectId))
      .where(scope),
  ]);

  const page = rows.slice(0, limit);
  const items: ScoreHistoryEntry[] = page.map((row) => ({
    sessionId: row.sessionId,
    title: row.mode === "kisi-kisi" ? `Latihan Kisi-Kisi ${row.subjectName}` : `Tryout ${row.subjectName}`,
    subjectId: row.subjectSlug,
    subjectName: row.subjectName,
    difficulty: row.difficulty,
    score: row.score ?? 0,
    correct: row.correctCount ?? Math.round(((row.score ?? 0) / 100) * row.totalQuestions),
    total: row.totalQuestions,
    requestedQuestions: row.requestedQuestions,
    durationSeconds: row.durationSeconds,
    finishedAt: (row.finishedAt ?? new Date(0)).toISOString(),
  }));
  return {
    items,
    nextCursor: rows.length > limit ? (items.at(-1)?.finishedAt ?? null) : null,
    summary: summary ?? { count: 0, average: 0, best: 0 },
  };
}

export type ReviewLookup =
  { status: "ok"; review: TryoutReviewDetail } | { status: "not_found" } | { status: "not_finished" };

export async function getReviewDetailForUser(
  sessionId: string,
  userId: string,
  filter: ReviewFilter = "semua",
): Promise<ReviewLookup> {
  if (!isUuid(sessionId)) return { status: "not_found" };
  if (!hasDatabase()) return getLocalReviewDetailForUser(sessionId, userId, filter);

  const [found] = await db
    .select({ session: tryoutSessions, subject: subjects })
    .from(tryoutSessions)
    .innerJoin(subjects, eq(subjects.id, tryoutSessions.subjectId))
    .where(and(eq(tryoutSessions.id, sessionId), eq(tryoutSessions.userId, userId), notDeleted))
    .limit(1);
  if (!found) return { status: "not_found" };
  if (found.session.status !== "selesai" || !found.session.finishedAt) return { status: "not_finished" };
  const { session, subject } = found;
  const finishedAt = found.session.finishedAt;

  const [reviewQuestions, answerRows] = await Promise.all([
    getReviewQuestions(sessionId),
    db
      .select({
        questionId: answers.questionId,
        selectedOptionId: answers.selectedOptionId,
        answerText: answers.answerText,
        isFlagged: answers.isFlagged,
        isCorrect: answers.isCorrect,
      })
      .from(answers)
      .where(eq(answers.sessionId, sessionId)),
  ]);
  const answerById = new Map(answerRows.map((row) => [row.questionId, row]));

  const items: ReviewItem[] = reviewQuestions.map((question) => {
    const answer = answerById.get(question.id);
    const outcome: QuestionOutcome =
      answer?.isCorrect === true ? "benar" : answer?.isCorrect === false ? "salah" : "kosong";
    return {
      number: question.orderNumber,
      questionId: question.id,
      questionType: question.questionType,
      typeLabel: question.typeLabel,
      topic: question.topic,
      indicator: question.indicator,
      cognitiveLevel: question.cognitiveLevel,
      stimulusTitle: question.stimulusTitle,
      stimulusText: question.stimulusText,
      visualAsset: question.visualAsset,
      visualCaption: question.visualCaption,
      text: question.text,
      options: question.options.map((option) => ({
        ...option,
        isCorrect: option.id === question.correctOptionId,
      })),
      correctOptionId: question.correctOptionId,
      selectedOptionId: outcome === "kosong" ? null : (answer?.selectedOptionId ?? null),
      answerText: answer?.answerText ?? null,
      expectedAnswer: question.expectedAnswer,
      rubricNotes: question.rubricNotes,
      outcome,
      flagged: answer?.isFlagged ?? false,
      explanation: question.explanation,
    };
  });
  const countOf = (outcome: QuestionOutcome) => items.filter((item) => item.outcome === outcome).length;

  return {
    status: "ok",
    review: {
      sessionId: session.id,
      title: session.mode === "kisi-kisi" ? `Latihan Kisi-Kisi ${subject.name}` : `Tryout ${subject.name}`,
      subject: { id: subject.slug, name: subject.name, description: subject.description },
      difficulty: session.difficulty,
      score: session.score ?? 0,
      finishedAt: finishedAt.toISOString(),
      counts: {
        semua: items.length,
        benar: countOf("benar"),
        salah: countOf("salah"),
        kosong: countOf("kosong"),
      },
      filter,
      items: filter === "semua" ? items : items.filter((item) => item.outcome === filter),
    },
  };
}

export type PracticeHistoryQuery = {
  status?: "berjalan" | "selesai";
  limit?: number;
  before?: Date;
};

export type PracticeHistoryPage = {
  items: PracticeHistoryItem[];
  nextCursor: string | null;
  now: number;
};

export async function getPracticeHistoryForUser(
  userId: string,
  query: PracticeHistoryQuery = {},
): Promise<PracticeHistoryPage> {
  if (!hasDatabase()) return getLocalPracticeHistory(userId, query);
  await expireOverdueForUser(userId);
  const limit = Math.min(Math.max(query.limit ?? 50, 1), 100);

  const answered = db
    .select({
      sessionId: answers.sessionId,
      count: sql<number>`count(*) filter (where ${answers.selectedOptionId} is not null or length(btrim(coalesce(${answers.answerText}, ''))) > 0)::int`.as("answered"),
    })
    .from(answers)
    .groupBy(answers.sessionId)
    .as("answered");

  const base = () =>
    db
      .select({ session: tryoutSessions, subject: subjects, answered: answered.count })
      .from(tryoutSessions)
      .innerJoin(subjects, eq(subjects.id, tryoutSessions.subjectId))
      .leftJoin(answered, eq(answered.sessionId, tryoutSessions.id));

  const [ongoingRows, finishedRows] = await Promise.all([
    query.status === "selesai"
      ? Promise.resolve([])
      : base()
          .where(and(eq(tryoutSessions.userId, userId), notDeleted, eq(tryoutSessions.status, "berjalan")))
          .orderBy(desc(tryoutSessions.startedAt)),
    query.status === "berjalan"
      ? Promise.resolve([])
      : base()
          .where(
            and(
              eq(tryoutSessions.userId, userId),
              notDeleted,
              eq(tryoutSessions.status, "selesai"),
              query.before ? lt(tryoutSessions.finishedAt, query.before) : undefined,
            ),
          )
          .orderBy(desc(tryoutSessions.finishedAt), desc(tryoutSessions.id))
          .limit(limit + 1),
  ]);

  const now = Date.now();
  const toItem = ({
    session,
    subject,
    answered: answeredCount,
  }: (typeof ongoingRows)[number]): PracticeHistoryItem => ({
    sessionId: session.id,
    title: session.mode === "kisi-kisi" ? `Latihan Kisi-Kisi ${subject.name}` : `Tryout ${subject.name}`,
    subject: { id: subject.slug, name: subject.name, description: subject.description },
    difficulty: session.difficulty,
    status: session.status,
    totalQuestions: session.totalQuestions,
    answeredCount: answeredCount ?? 0,
    startedAt: session.startedAt.toISOString(),
    finishedAt: session.finishedAt?.toISOString() ?? null,
    score: session.status === "selesai" ? (session.score ?? 0) : null,
    correctCount: session.status === "selesai" ? (session.correctCount ?? 0) : null,
    usedSeconds: session.status === "selesai" ? (session.usedSeconds ?? session.durationSeconds) : null,
    remainingSeconds:
      session.status === "selesai"
        ? null
        : (session.pausedRemainingSeconds ??
          Math.max(0, Math.round((session.deadlineAt.getTime() - now) / 1000))),
    paused: session.status === "berjalan" && session.pausedRemainingSeconds !== null,
    lastOrderNumber: session.lastOrderNumber,
  });

  const finishedPage = finishedRows.slice(0, limit);
  const items = [...ongoingRows.map(toItem), ...finishedPage.map(toItem)];
  return {
    items,
    nextCursor:
      finishedRows.length > limit ? (finishedPage.at(-1)?.session.finishedAt?.toISOString() ?? null) : null,
    now,
  };
}

export type ResumeInfo = {
  orderNumber: number;
  answeredCount: number;
  flaggedCount: number;
  remainingSeconds: number;
  paused: boolean;
  serverNow: string;
};

export function getResumeInfo(session: TryoutSession): ResumeInfo {
  const now = Date.now();
  const answerList = Object.values(session.answers);
  const paused = session.pausedRemainingSeconds != null;
  return {
    orderNumber: Math.min(Math.max(session.lastOrderNumber ?? 1, 1), session.totalQuestions),
    answeredCount: answerList.filter(
      (answer) => Boolean(answer.selectedOptionId) || Boolean(answer.answerText?.trim()),
    ).length,
    flaggedCount: answerList.filter((answer) => answer.isFlagged).length,
    remainingSeconds: paused
      ? (session.pausedRemainingSeconds ?? 0)
      : Math.max(0, Math.round((new Date(session.deadline).getTime() - now) / 1000)),
    paused,
    serverNow: new Date(now).toISOString(),
  };
}
