import "server-only";

import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { KISI_KISI_PACKAGES, getKisiKisiPackage } from "@/lib/kisi-kisi";
import type { KisiKisiQuestion } from "@/lib/kisi-kisi/types";
import { gradeAnswers, isQuestionAnswered } from "@/lib/tryout/grading";
import { SESSION_LIMITS, validateSessionSize } from "@/lib/tryout/limits";
import type { ReviewFilter } from "@/lib/tryout/review-filter";
import type {
  AnswerState,
  Difficulty,
  PracticeHistoryItem,
  QuestionOutcome,
  ReviewItem,
  ReviewQuestion,
  ScoreHistoryEntry,
  SubjectCatalogItem,
  TryoutQuestion,
  TryoutResultDetail,
  TryoutReview,
  TryoutReviewDetail,
  TryoutSession,
  UserSettings,
} from "@/lib/tryout/types";

type StoredSession = {
  id: string;
  userId: string;
  subjectSlug: string;
  difficulty: Difficulty;
  mode: "kisi-kisi" | "latihan";
  questionCodes: string[];
  requestedQuestions: number;
  durationSeconds: number;
  startedAt: string;
  deadlineAt: string;
  pausedRemainingSeconds: number | null;
  lastOrderNumber: number;
  finishedAt: string | null;
  status: "berjalan" | "selesai";
  submitReason: "manual" | "timeout" | null;
  score: number | null;
  correctCount: number | null;
  wrongCount: number | null;
  unansweredCount: number | null;
  usedSeconds: number | null;
  deletedAt: string | null;
  answers: Record<string, AnswerState>;
};

type LocalStoreData = {
  settings: Record<string, UserSettings>;
  sessions: Record<string, StoredSession>;
};

const STORE_DIR = path.join(process.cwd(), ".tryout-local");
const STORE_FILE = path.join(STORE_DIR, "store.json");

const globalStore = globalThis as unknown as { __localTryoutStore?: LocalStoreData };

function readStore(): LocalStoreData {
  if (globalStore.__localTryoutStore) return globalStore.__localTryoutStore;
  try {
    if (fs.existsSync(STORE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(STORE_FILE, "utf8")) as LocalStoreData;
      globalStore.__localTryoutStore = {
        settings: parsed.settings ?? {},
        sessions: parsed.sessions ?? {},
      };
      return globalStore.__localTryoutStore;
    }
  } catch {
    // Abaikan kegagalan baca disk dan pakai memory store.
  }
  globalStore.__localTryoutStore = { settings: {}, sessions: {} };
  return globalStore.__localTryoutStore;
}

function writeStore(data: LocalStoreData) {
  globalStore.__localTryoutStore = data;
  try {
    fs.mkdirSync(STORE_DIR, { recursive: true });
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch {
    // Abaikan jika filesystem read-only (mis. serverless).
  }
}

/** Menghasilkan UUID deterministik agar kompatibel dengan validator z.uuid(). */
export function deterministicUuid(seed: string): string {
  const hash = createHash("sha256").update(seed).digest();
  const bytes = Uint8Array.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Buffer.from(bytes).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

const QUESTION_BY_UUID = new Map<string, KisiKisiQuestion>();
const UUID_BY_CODE = new Map<string, string>();
const OPTION_UUIDS_BY_CODE = new Map<string, string[]>();

for (const pkg of KISI_KISI_PACKAGES) {
  for (const q of pkg.questions) {
    const qUuid = deterministicUuid(`question:${q.code}`);
    QUESTION_BY_UUID.set(qUuid, q);
    UUID_BY_CODE.set(q.code, qUuid);
    const optIds = (q.options ?? []).map((_, idx) => deterministicUuid(`option:${q.code}:${idx}`));
    OPTION_UUIDS_BY_CODE.set(q.code, optIds);
  }
}

export function getLocalSubjectCatalog(): SubjectCatalogItem[] {
  return KISI_KISI_PACKAGES.map((pkg) => {
    const counts: Record<Difficulty, number> = { mudah: 0, sedang: 0, sulit: 0 };
    for (const q of pkg.questions) counts[q.difficulty] += 1;
    return {
      id: pkg.meta.slug,
      name: pkg.meta.name,
      description: pkg.meta.description,
      counts,
      total: pkg.questions.length,
    };
  });
}

export function getLocalSettings(userId: string): UserSettings {
  const store = readStore();
  return (
    store.settings[userId] ?? {
      defaultQuestionCount: 35,
      defaultDurationSeconds: 60 * 60,
      reminderEnabled: true,
      reminderTime: "19:00",
    }
  );
}

export function saveLocalSettings(userId: string, input: Partial<UserSettings>) {
  const store = readStore();
  const current = getLocalSettings(userId);
  const merged = { ...current, ...input };
  const sizeErrors = validateSessionSize({
    questionCount: merged.defaultQuestionCount,
    durationSeconds: merged.defaultDurationSeconds,
  });
  const fields: Partial<Record<keyof UserSettings, string>> = {
    ...(sizeErrors.questionCount ? { defaultQuestionCount: sizeErrors.questionCount } : {}),
    ...(sizeErrors.durationSeconds ? { defaultDurationSeconds: sizeErrors.durationSeconds } : {}),
  };
  const firstError = fields.defaultQuestionCount ?? fields.defaultDurationSeconds;
  if (firstError) return { ok: false as const, message: firstError, fields };
  store.settings[userId] = merged;
  writeStore(store);
  return { ok: true as const, settings: merged };
}

function toTryoutQuestion(q: KisiKisiQuestion, orderNumber: number): TryoutQuestion {
  const qId = UUID_BY_CODE.get(q.code)!;
  const optIds = OPTION_UUIDS_BY_CODE.get(q.code) ?? [];
  return {
    id: qId,
    orderNumber,
    questionType: q.type,
    typeLabel: q.typeLabel,
    topic: q.topic,
    indicator: q.indicator,
    cognitiveLevel: q.cognitiveLevel,
    stimulusTitle: q.stimulusTitle,
    stimulusText: q.stimulusText,
    visualAsset: q.visualAsset,
    visualCaption: q.visualCaption,
    text: q.text,
    options: (q.options ?? []).map((opt, idx) => ({ id: optIds[idx], text: opt.text })),
  };
}

function toReviewQuestion(q: KisiKisiQuestion, orderNumber: number): ReviewQuestion {
  const optIds = OPTION_UUIDS_BY_CODE.get(q.code) ?? [];
  const correctIdx = (q.options ?? []).findIndex((o) => o.isCorrect);
  return {
    ...toTryoutQuestion(q, orderNumber),
    options: (q.options ?? []).map((opt, idx) => ({
      id: optIds[idx],
      text: opt.text,
      ...(opt.explanation ? { explanation: opt.explanation } : {}),
    })),
    correctOptionId: correctIdx >= 0 ? optIds[correctIdx] : "",
    expectedAnswer: q.expectedAnswer,
    acceptedAnswers: q.acceptedAnswers,
    rubricNotes: q.rubricNotes,
    explanation: q.explanation,
  };
}

export function startLocalSession(
  userId: string,
  input: {
    subjectSlug: string;
    difficulty: Difficulty;
    mode?: "kisi-kisi" | "latihan";
    questionCount?: number;
    durationSeconds?: number;
  },
) {
  const pkg = getKisiKisiPackage(input.subjectSlug);
  if (!pkg) throw new Error("Mata pelajaran tidak ditemukan.");

  const mode = input.mode ?? "kisi-kisi";
  const picked =
    mode === "kisi-kisi"
      ? pkg.questions
      : pkg.questions.filter((q) => q.difficulty === input.difficulty);
  const pool = picked.length > 0 ? picked : pkg.questions;

  const requestedCount =
    mode === "kisi-kisi"
      ? pool.length
      : Math.min(input.questionCount ?? SESSION_LIMITS.defaultQuestions, pool.length);
  const selectedQuestions = pool.slice(0, requestedCount);

  const durationSeconds =
    input.durationSeconds ??
    Math.max(selectedQuestions.length * SESSION_LIMITS.minSecondsPerQuestion, pkg.meta.durationMinutes * 60);

  const startedAt = new Date();
  const deadlineAt = new Date(startedAt.getTime() + durationSeconds * 1000);
  const sessionId = randomUUID();

  const store = readStore();
  store.sessions[sessionId] = {
    id: sessionId,
    userId,
    subjectSlug: pkg.meta.slug,
    difficulty: input.difficulty,
    mode,
    questionCodes: selectedQuestions.map((q) => q.code),
    requestedQuestions: requestedCount,
    durationSeconds,
    startedAt: startedAt.toISOString(),
    deadlineAt: deadlineAt.toISOString(),
    pausedRemainingSeconds: null,
    lastOrderNumber: 1,
    finishedAt: null,
    status: "berjalan",
    submitReason: null,
    score: null,
    correctCount: null,
    wrongCount: null,
    unansweredCount: null,
    usedSeconds: null,
    deletedAt: null,
    answers: {},
  };
  writeStore(store);

  return {
    sessionId,
    subject: { id: pkg.meta.slug, name: pkg.meta.name },
    difficulty: input.difficulty,
    requestedQuestions: requestedCount,
    totalQuestions: selectedQuestions.length,
    durationSeconds,
    startedAt: startedAt.toISOString(),
    expiresAt: deadlineAt.toISOString(),
  };
}

function getOwnedLocalSession(sessionId: string, userId: string): StoredSession | null {
  const store = readStore();
  const session = store.sessions[sessionId];
  if (!session || session.userId !== userId || session.deletedAt) return null;
  return session;
}

function expireLocalIfNeeded(session: StoredSession): boolean {
  if (session.status !== "berjalan" || session.pausedRemainingSeconds !== null) return false;
  if (Date.now() - new Date(session.deadlineAt).getTime() <= 5000) return false;
  submitLocalSession(session.userId, { sessionId: session.id, reason: "timeout" });
  return true;
}

export function getLocalSessionForUser(sessionId: string, userId: string): TryoutSession | null {
  const session = getOwnedLocalSession(sessionId, userId);
  if (!session) return null;
  if (expireLocalIfNeeded(session)) return getLocalSessionForUser(sessionId, userId);
  const pkg = getKisiKisiPackage(session.subjectSlug);
  if (!pkg) return null;
  const byCode = new Map(pkg.questions.map((q) => [q.code, q]));

  return {
    id: session.id,
    title: session.mode === "kisi-kisi" ? `Latihan Kisi-Kisi ${pkg.meta.name}` : `Tryout ${pkg.meta.name}`,
    subject: { id: pkg.meta.slug, name: pkg.meta.name, description: pkg.meta.description },
    difficulty: session.difficulty,
    mode: session.mode,
    totalQuestions: session.questionCodes.length,
    durationSeconds: session.durationSeconds,
    startedAt: session.startedAt,
    deadline:
      session.pausedRemainingSeconds === null
        ? session.deadlineAt
        : new Date(Date.now() + session.pausedRemainingSeconds * 1000).toISOString(),
    status: session.status,
    questions: session.questionCodes.map((code, idx) => toTryoutQuestion(byCode.get(code)!, idx + 1)),
    answers: session.answers,
    lastOrderNumber: session.lastOrderNumber,
    pausedRemainingSeconds: session.pausedRemainingSeconds,
  };
}

export function saveLocalAnswer(
  userId: string,
  input: {
    sessionId: string;
    questionId: string;
    selectedOptionId: string | null;
    answerText?: string | null;
    isFlagged: boolean;
    lastOrderNumber?: number;
  },
) {
  const store = readStore();
  const session = getOwnedLocalSession(input.sessionId, userId);
  if (!session) throw new Error("Sesi tryout tidak ditemukan.");
  if (session.status === "selesai") throw new Error("Tryout ini sudah dikumpulkan.");
  session.answers[input.questionId] = {
    selectedOptionId: input.selectedOptionId,
    answerText: input.answerText ?? null,
    isFlagged: input.isFlagged,
  };
  if (input.lastOrderNumber) session.lastOrderNumber = input.lastOrderNumber;
  writeStore(store);
  return { savedAt: new Date().toISOString() };
}

export function setLocalFlag(userId: string, input: { sessionId: string; questionId: string; isFlagged: boolean }) {
  const store = readStore();
  const session = getOwnedLocalSession(input.sessionId, userId);
  if (!session) throw new Error("Sesi tryout tidak ditemukan.");
  const prev = session.answers[input.questionId];
  session.answers[input.questionId] = {
    selectedOptionId: prev?.selectedOptionId ?? null,
    answerText: prev?.answerText ?? null,
    isFlagged: input.isFlagged,
  };
  writeStore(store);
  return { savedAt: new Date().toISOString(), isFlagged: input.isFlagged };
}

export function saveLocalLastQuestion(userId: string, sessionId: string, lastOrderNumber: number) {
  const store = readStore();
  const session = getOwnedLocalSession(sessionId, userId);
  if (!session || session.status === "selesai") return;
  session.lastOrderNumber = Math.min(Math.max(lastOrderNumber, 1), session.questionCodes.length);
  writeStore(store);
}

export function getLocalSessionTime(userId: string, sessionId: string) {
  let session = getOwnedLocalSession(sessionId, userId);
  if (!session) throw new Error("Sesi tryout tidak ditemukan.");
  if (expireLocalIfNeeded(session)) session = getOwnedLocalSession(sessionId, userId)!;
  const now = Date.now();
  const paused = session.pausedRemainingSeconds !== null;
  const remainingSeconds =
    session.status === "selesai"
      ? 0
      : paused
        ? (session.pausedRemainingSeconds ?? 0)
        : Math.max(0, Math.round((new Date(session.deadlineAt).getTime() - now) / 1000));
  return {
    status: session.status,
    serverNow: new Date(now).toISOString(),
    deadline: session.deadlineAt,
    remainingSeconds,
    paused,
  };
}

export function pauseLocalSession(
  userId: string,
  input: { sessionId: string; lastOrderNumber?: number; answers?: Record<string, AnswerState> },
) {
  const store = readStore();
  const session = getOwnedLocalSession(input.sessionId, userId);
  if (!session) throw new Error("Sesi tryout tidak ditemukan.");
  if (session.status === "selesai") throw new Error("Tryout ini sudah dikumpulkan.");
  if (input.answers) session.answers = { ...session.answers, ...input.answers };
  if (input.lastOrderNumber) session.lastOrderNumber = input.lastOrderNumber;
  const remaining = Math.max(
    0,
    Math.min(
      session.durationSeconds,
      session.pausedRemainingSeconds ?? Math.round((new Date(session.deadlineAt).getTime() - Date.now()) / 1000),
    ),
  );
  session.pausedRemainingSeconds = remaining;
  writeStore(store);
  return { pausedAt: new Date().toISOString(), remainingSeconds: remaining };
}

export function resumeLocalSession(userId: string, sessionId: string) {
  const store = readStore();
  const session = getOwnedLocalSession(sessionId, userId);
  if (!session) throw new Error("Sesi tryout tidak ditemukan.");
  if (session.status === "selesai") throw new Error("Tryout ini sudah dikumpulkan.");
  if (session.pausedRemainingSeconds === null) {
    const remaining = Math.max(0, Math.round((new Date(session.deadlineAt).getTime() - Date.now()) / 1000));
    return { deadline: session.deadlineAt, remainingSeconds: remaining };
  }
  const newDeadline = new Date(Date.now() + session.pausedRemainingSeconds * 1000).toISOString();
  const remaining = session.pausedRemainingSeconds;
  session.deadlineAt = newDeadline;
  session.pausedRemainingSeconds = null;
  writeStore(store);
  return { deadline: newDeadline, remainingSeconds: remaining };
}

export function submitLocalSession(
  userId: string,
  input: { sessionId: string; reason: "manual" | "timeout"; answers?: Record<string, AnswerState> },
) {
  const store = readStore();
  const session = getOwnedLocalSession(input.sessionId, userId);
  if (!session) throw new Error("Sesi tryout tidak ditemukan.");
  if (session.status === "selesai" && session.finishedAt) {
    return {
      sessionId: session.id,
      status: "selesai" as const,
      submitReason: session.submitReason ?? "manual",
      score: session.score ?? 0,
      correct: session.correctCount ?? 0,
      wrong: session.wrongCount ?? 0,
      empty: session.unansweredCount ?? 0,
      total: session.questionCodes.length,
      usedSeconds: session.usedSeconds ?? session.durationSeconds,
      finishedAt: session.finishedAt,
    };
  }
  if (input.answers) session.answers = { ...session.answers, ...input.answers };
  const pkg = getKisiKisiPackage(session.subjectSlug)!;
  const byCode = new Map(pkg.questions.map((q) => [q.code, q]));
  const reviewQuestions = session.questionCodes.map((code, idx) => toReviewQuestion(byCode.get(code)!, idx + 1));
  const result = gradeAnswers(reviewQuestions, session.answers);
  const finishedAt = new Date();
  const remaining =
    session.pausedRemainingSeconds !== null
      ? session.pausedRemainingSeconds
      : Math.max(0, Math.round((new Date(session.deadlineAt).getTime() - finishedAt.getTime()) / 1000));
  const usedSeconds =
    input.reason === "timeout"
      ? session.durationSeconds
      : Math.min(session.durationSeconds, Math.max(0, session.durationSeconds - remaining));

  session.status = "selesai";
  session.finishedAt = finishedAt.toISOString();
  session.submitReason = input.reason;
  session.pausedRemainingSeconds = null;
  session.score = result.score;
  session.correctCount = result.correct;
  session.wrongCount = result.wrong;
  session.unansweredCount = result.empty;
  session.usedSeconds = usedSeconds;
  writeStore(store);

  return {
    sessionId: session.id,
    status: "selesai" as const,
    submitReason: input.reason,
    score: result.score,
    correct: result.correct,
    wrong: result.wrong,
    empty: result.empty,
    total: result.total,
    usedSeconds,
    finishedAt: session.finishedAt,
  };
}

export function getLocalReviewForUser(sessionId: string, userId: string): TryoutReview | null {
  const session = getOwnedLocalSession(sessionId, userId);
  if (!session || session.status !== "selesai" || !session.finishedAt) return null;
  const pkg = getKisiKisiPackage(session.subjectSlug);
  if (!pkg) return null;
  const byCode = new Map(pkg.questions.map((q) => [q.code, q]));
  const reviewQuestions = session.questionCodes.map((code, idx) => toReviewQuestion(byCode.get(code)!, idx + 1));
  const history = getLocalScoreHistory(userId, { subject: session.subjectSlug }).items.filter(
    (item) => item.sessionId !== session.id && item.finishedAt < session.finishedAt!,
  );

  return {
    sessionId: session.id,
    title: session.mode === "kisi-kisi" ? `Latihan Kisi-Kisi ${pkg.meta.name}` : `Tryout ${pkg.meta.name}`,
    subject: { id: pkg.meta.slug, name: pkg.meta.name, description: pkg.meta.description },
    difficulty: session.difficulty,
    mode: session.mode,
    durationSeconds: session.durationSeconds,
    startedAt: session.startedAt,
    finishedAt: session.finishedAt,
    questions: reviewQuestions,
    answers: session.answers,
    history,
    submitReason: session.submitReason ?? "manual",
    deadline: session.deadlineAt,
    usedSeconds: session.usedSeconds ?? undefined,
  };
}

export function getLocalResultLookupForUser(sessionId: string, userId: string) {
  const session = getOwnedLocalSession(sessionId, userId);
  if (!session) return { status: "not_found" as const };
  if (expireLocalIfNeeded(session)) return getLocalResultLookupForUser(sessionId, userId);
  if (session.status !== "selesai" || !session.finishedAt) {
    return {
      status: "not_finished" as const,
      lastOrderNumber: session.lastOrderNumber,
      paused: session.pausedRemainingSeconds !== null,
      remainingSeconds:
        session.pausedRemainingSeconds ??
        Math.max(0, Math.round((new Date(session.deadlineAt).getTime() - Date.now()) / 1000)),
    };
  }
  const review = getLocalReviewForUser(sessionId, userId)!;
  const graded = gradeAnswers(review.questions, review.answers);
  const accuracy =
    graded.correct + graded.wrong > 0
      ? Math.round((graded.correct / (graded.correct + graded.wrong)) * 100)
      : 0;
  const result: TryoutResultDetail = {
    sessionId: session.id,
    title: review.title,
    subject: review.subject,
    difficulty: session.difficulty,
    score: graded.score,
    correct: graded.correct,
    wrong: graded.wrong,
    empty: graded.empty,
    total: graded.total,
    requestedQuestions: session.requestedQuestions,
    submitReason: session.submitReason ?? "manual",
    autoSubmitted: session.submitReason === "timeout",
    durationSeconds: session.durationSeconds,
    startedAt: session.startedAt,
    deadline: session.deadlineAt,
    finishedAt: session.finishedAt,
    usedSeconds: session.usedSeconds ?? session.durationSeconds,
    outcomes: graded.outcomes,
    accuracy,
    items: review.questions.map((q) => ({
      number: q.orderNumber,
      questionId: q.id,
      outcome: graded.outcomes[q.id] ?? "kosong",
      flagged: review.answers[q.id]?.isFlagged ?? false,
    })),
    history: review.history,
    scoreChange: review.history[0] ? graded.score - review.history[0].score : null,
  };
  return { status: "ok" as const, result };
}

export function getLocalReviewDetailForUser(sessionId: string, userId: string, filter: ReviewFilter = "semua") {
  const session = getOwnedLocalSession(sessionId, userId);
  if (!session) return { status: "not_found" as const };
  if (session.status !== "selesai" || !session.finishedAt) return { status: "not_finished" as const };
  const review = getLocalReviewForUser(sessionId, userId)!;
  const graded = gradeAnswers(review.questions, review.answers);
  const items: ReviewItem[] = review.questions.map((q) => {
    const ans = review.answers[q.id];
    const outcome: QuestionOutcome = graded.outcomes[q.id] ?? "kosong";
    return {
      number: q.orderNumber,
      questionId: q.id,
      questionType: q.questionType,
      typeLabel: q.typeLabel,
      topic: q.topic,
      indicator: q.indicator,
      cognitiveLevel: q.cognitiveLevel,
      stimulusTitle: q.stimulusTitle,
      stimulusText: q.stimulusText,
      visualAsset: q.visualAsset,
      visualCaption: q.visualCaption,
      text: q.text,
      options: q.options.map((o) => ({ ...o, isCorrect: o.id === q.correctOptionId })),
      correctOptionId: q.correctOptionId,
      selectedOptionId: ans?.selectedOptionId ?? null,
      answerText: ans?.answerText ?? null,
      expectedAnswer: q.expectedAnswer,
      rubricNotes: q.rubricNotes,
      outcome,
      flagged: ans?.isFlagged ?? false,
      explanation: q.explanation,
    };
  });
  const detail: TryoutReviewDetail = {
    sessionId: review.sessionId,
    title: review.title,
    subject: review.subject,
    difficulty: review.difficulty,
    score: graded.score,
    finishedAt: review.finishedAt,
    counts: {
      semua: items.length,
      benar: graded.correct,
      salah: graded.wrong,
      kosong: graded.empty,
    },
    filter,
    items: filter === "semua" ? items : items.filter((item) => item.outcome === filter),
  };
  return { status: "ok" as const, review: detail };
}

export function getLocalScoreHistory(
  userId: string,
  query: { subject?: string; difficulty?: Difficulty; limit?: number } = {},
) {
  const store = readStore();
  const limit = Math.min(Math.max(query.limit ?? 50, 1), 100);
  const allFinished = Object.values(store.sessions)
    .filter(
      (s) =>
        s.userId === userId &&
        !s.deletedAt &&
        s.status === "selesai" &&
        (!query.subject || s.subjectSlug === query.subject) &&
        (!query.difficulty || s.difficulty === query.difficulty),
    )
    .sort((a, b) => (b.finishedAt ?? "").localeCompare(a.finishedAt ?? ""));

  const items: ScoreHistoryEntry[] = allFinished.slice(0, limit).map((s) => {
    const pkg = getKisiKisiPackage(s.subjectSlug);
    return {
      sessionId: s.id,
      title: s.mode === "kisi-kisi" ? `Latihan Kisi-Kisi ${pkg?.meta.name ?? s.subjectSlug}` : `Tryout ${pkg?.meta.name ?? s.subjectSlug}`,
      subjectId: s.subjectSlug,
      subjectName: pkg?.meta.name ?? s.subjectSlug,
      difficulty: s.difficulty,
      score: s.score ?? 0,
      correct: s.correctCount ?? 0,
      total: s.questionCodes.length,
      requestedQuestions: s.requestedQuestions,
      durationSeconds: s.durationSeconds,
      finishedAt: s.finishedAt!,
    };
  });

  const count = allFinished.length;
  const average = count ? Math.round(allFinished.reduce((acc, s) => acc + (s.score ?? 0), 0) / count) : 0;
  const best = allFinished.reduce((max, s) => Math.max(max, s.score ?? 0), 0);
  return { items, nextCursor: null as string | null, summary: { count, average, best } };
}

export function getLocalPracticeHistory(userId: string, query: { status?: "berjalan" | "selesai"; limit?: number } = {}) {
  const store = readStore();
  for (const s of Object.values(store.sessions)) {
    if (s.userId === userId && !s.deletedAt) expireLocalIfNeeded(s);
  }
  const now = Date.now();
  const sessions = Object.values(store.sessions).filter(
    (s) => s.userId === userId && !s.deletedAt && (!query.status || s.status === query.status),
  );
  const ongoing = sessions
    .filter((s) => s.status === "berjalan")
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const finished = sessions
    .filter((s) => s.status === "selesai")
    .sort((a, b) => (b.finishedAt ?? "").localeCompare(a.finishedAt ?? ""))
    .slice(0, query.limit ?? 50);

  const toItem = (s: StoredSession): PracticeHistoryItem => {
    const pkg = getKisiKisiPackage(s.subjectSlug);
    const answeredCount = Object.values(s.answers).filter((a) => isQuestionAnswered(a)).length;
    return {
      sessionId: s.id,
      title: s.mode === "kisi-kisi" ? `Latihan Kisi-Kisi ${pkg?.meta.name ?? s.subjectSlug}` : `Tryout ${pkg?.meta.name ?? s.subjectSlug}`,
      subject: {
        id: s.subjectSlug,
        name: pkg?.meta.name ?? s.subjectSlug,
        description: pkg?.meta.description ?? "",
      },
      difficulty: s.difficulty,
      status: s.status,
      totalQuestions: s.questionCodes.length,
      answeredCount,
      startedAt: s.startedAt,
      finishedAt: s.finishedAt,
      score: s.status === "selesai" ? (s.score ?? 0) : null,
      correctCount: s.status === "selesai" ? (s.correctCount ?? 0) : null,
      usedSeconds: s.status === "selesai" ? (s.usedSeconds ?? s.durationSeconds) : null,
      remainingSeconds:
        s.status === "selesai"
          ? null
          : (s.pausedRemainingSeconds ??
            Math.max(0, Math.round((new Date(s.deadlineAt).getTime() - now) / 1000))),
      paused: s.status === "berjalan" && s.pausedRemainingSeconds !== null,
      lastOrderNumber: s.lastOrderNumber,
    };
  };

  return {
    items: [...ongoing.map(toItem), ...finished.map(toItem)],
    nextCursor: null as string | null,
    now,
  };
}

export function deleteLocalHistory(userId: string, sessionIds: string[]) {
  const store = readStore();
  const deleted: string[] = [];
  for (const id of sessionIds) {
    const s = store.sessions[id];
    if (s && s.userId === userId && !s.deletedAt) {
      s.deletedAt = new Date().toISOString();
      deleted.push(id);
    }
  }
  writeStore(store);
  return deleted;
}

export function deleteAllFinishedLocalHistory(userId: string) {
  const store = readStore();
  const deleted: string[] = [];
  for (const s of Object.values(store.sessions)) {
    if (s.userId === userId && s.status === "selesai" && !s.deletedAt) {
      s.deletedAt = new Date().toISOString();
      deleted.push(s.id);
    }
  }
  writeStore(store);
  return deleted;
}

export function restoreLocalHistory(userId: string, sessionIds: string[]) {
  const store = readStore();
  const restored: string[] = [];
  for (const id of sessionIds) {
    const s = store.sessions[id];
    if (s && s.userId === userId && s.deletedAt) {
      s.deletedAt = null;
      restored.push(id);
    }
  }
  writeStore(store);
  return restored;
}
