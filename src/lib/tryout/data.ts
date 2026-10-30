import "server-only";

import { connection } from "next/server";
import { QUESTION_BANK, SUBJECTS, type BankQuestion } from "@/lib/mock/question-bank";
import { gradeAnswers } from "@/lib/tryout/grading";
import { seededShuffle } from "@/lib/tryout/shuffle";
import type {
  AnswerState,
  Difficulty,
  ReviewQuestion,
  ScoreHistoryEntry,
  Subject,
  TryoutReview,
  TryoutSession,
} from "@/lib/tryout/types";

/**
 * Akses data tryout di sisi server.
 * Sementara memakai data tiruan; backend nanti mengganti isi fungsi ini
 * dengan query database tanpa mengubah bentuk data yang dikembalikan.
 *
 * ID sesi tiruan menyandikan konfigurasinya: `<mapel>--<tingkat>--<seed>`,
 * mis. `ipa--mudah--k3f9`. Sesi `demo` = Matematika sedang yang sedang berjalan.
 * Beberapa ID terdaftar di registri di bawah sebagai sesi lama (selesai/belum).
 */

const DEMO_SESSION_ID = "demo";
const SECONDS_PER_QUESTION = 3 * 60;
const DEMO_ELAPSED_SECONDS = 10 * 60;
const DIFFICULTIES: Difficulty[] = ["mudah", "sedang", "sulit"];
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Jawaban tiruan supaya sesi contoh terlihat sedang berjalan. */
const DEMO_ANSWERS: TryoutSession["answers"] = {
  "mtk-001": { selectedOptionId: "mtk-001-c", isFlagged: false },
  "mtk-002": { selectedOptionId: "mtk-002-b", isFlagged: false },
  "mtk-003": { selectedOptionId: "mtk-003-b", isFlagged: true },
  "mtk-005": { selectedOptionId: "mtk-005-b", isFlagged: false },
};

/** Sesi tiruan yang sudah selesai: jumlah benar/salah menentukan nilainya. */
const MOCK_FINISHED: { id: string; daysAgo: number; correct: number; wrong: number }[] = [
  { id: "matematika--sedang--r5", daysAgo: 2, correct: 6, wrong: 3 },
  { id: "bahasa-inggris--sedang--r6", daysAgo: 3, correct: 3, wrong: 1 },
  { id: "matematika--sedang--r4", daysAgo: 5, correct: 5, wrong: 4 },
  { id: "ipa--sedang--r7", daysAgo: 7, correct: 2, wrong: 2 },
  { id: "matematika--sedang--r3", daysAgo: 9, correct: 4, wrong: 4 },
  { id: "matematika--sedang--r2", daysAgo: 14, correct: 5, wrong: 3 },
  { id: "matematika--sedang--r1", daysAgo: 20, correct: 3, wrong: 5 },
];

/** Sesi tiruan yang ditinggal di tengah jalan: bisa dilanjutkan. */
const MOCK_UNFINISHED: { id: string; hoursAgo: number; answered: number; remainingSeconds: number }[] = [
  { id: "bahasa-indonesia--sedang--u1", hoursAgo: 20, answered: 2, remainingSeconds: 7 * 60 + 30 },
];

type MockConfig = {
  subject: Subject;
  difficulty: Difficulty;
  questions: BankQuestion[];
  durationSeconds: number;
};

function isDifficulty(value: string | undefined): value is Difficulty {
  return DIFFICULTIES.includes(value as Difficulty);
}

/** Segmen opsional `n<jumlah>d<menit>` dari pengaturan pengguna, mis. `n10d30`. */
const SIZE_SEGMENT = /^n(\d{1,3})d(\d{1,3})$/;

function resolveMockConfig(sessionId: string): MockConfig | null {
  const [subjectId, difficulty, seed, size, ...rest] =
    sessionId === DEMO_SESSION_ID ? ["matematika", "sedang"] : sessionId.split("--");
  const subject = SUBJECTS.find((item) => item.id === subjectId);
  if (!subject || !isDifficulty(difficulty) || rest.length > 0) return null;
  if (seed !== undefined && !/^[a-z0-9]{1,12}$/.test(seed)) return null;
  const sizeMatch = size === undefined ? null : SIZE_SEGMENT.exec(size);
  if (size !== undefined && !sizeMatch) return null;

  const pool = QUESTION_BANK.filter(
    (item) => item.subjectId === subject.id && item.difficulty === difficulty,
  );
  if (pool.length === 0) return null;
  // Seed menentukan urutan soal: sesi yang sama selalu sama, sesi baru berbeda.
  const shuffled = seed ? seededShuffle(pool, seed) : pool;

  const count = sizeMatch ? Math.max(1, Number(sizeMatch[1])) : shuffled.length;
  const questions = shuffled.slice(0, count);
  const durationSeconds = sizeMatch
    ? Math.max(1, Number(sizeMatch[2])) * 60
    : questions.length * SECONDS_PER_QUESTION;
  return { subject, difficulty, questions, durationSeconds };
}

/** Jawaban sintetis: `correct` soal pertama benar, `wrong` berikutnya salah, sisanya kosong. */
function synthesizeAnswers(questions: BankQuestion[], correct: number, wrong: number) {
  const answers: Record<string, AnswerState> = {};
  questions.forEach((question, index) => {
    if (index < correct) {
      const key = question.options.find((option) => option.isCorrect);
      answers[question.id] = { selectedOptionId: key?.id ?? null, isFlagged: false };
    } else if (index < correct + wrong) {
      const miss = question.options.find((option) => !option.isCorrect);
      answers[question.id] = { selectedOptionId: miss?.id ?? null, isFlagged: false };
    }
  });
  return answers;
}

function toReviewQuestions(questions: BankQuestion[]): ReviewQuestion[] {
  return questions.map((item, index) => ({
    id: item.id,
    orderNumber: index + 1,
    text: item.text,
    options: item.options.map(({ id, text, explanation }) =>
      explanation ? { id, text, explanation } : { id, text },
    ),
    correctOptionId: item.options.find((option) => option.isCorrect)?.id ?? "",
    explanation: item.explanation,
  }));
}

function finishedRecord(id: string, now: number) {
  const record = MOCK_FINISHED.find((item) => item.id === id);
  const config = record ? resolveMockConfig(record.id) : null;
  if (!record || !config) return null;
  const durationSeconds = config.durationSeconds;
  const finishedAt = new Date(now - record.daysAgo * DAY_MS);
  const startedAt = new Date(finishedAt.getTime() - Math.round(durationSeconds * 0.8) * 1000);
  const answers = synthesizeAnswers(config.questions, record.correct, record.wrong);
  return { record, config, durationSeconds, startedAt, finishedAt, answers };
}

type DemoOptions = {
  /** Khusus data tiruan: paksa sisa waktu (detik) untuk mencoba timer. */
  remainingSeconds?: number;
};

export async function getTryoutSession(
  sessionId: string,
  { remainingSeconds }: DemoOptions = {},
): Promise<TryoutSession | null> {
  // Waktu mulai bergantung pada waktu request, jadi tandai sebagai data dinamis.
  await connection();

  const config = resolveMockConfig(sessionId);
  if (!config) return null;

  const now = Date.now();
  const { subject, difficulty, questions, durationSeconds } = config;
  const finished = MOCK_FINISHED.some((item) => item.id === sessionId);
  const unfinished = MOCK_UNFINISHED.find((item) => item.id === sessionId);

  // Sisa waktu: sesi yang dilanjutkan memakai sisa waktu tersimpan (timer berhenti saat ditinggal).
  const savedRemaining = unfinished
    ? unfinished.remainingSeconds
    : sessionId === DEMO_SESSION_ID
      ? durationSeconds - DEMO_ELAPSED_SECONDS
      : durationSeconds;
  const remaining =
    remainingSeconds !== undefined
      ? Math.min(Math.max(remainingSeconds, 0), durationSeconds)
      : savedRemaining;
  const startedAt = unfinished
    ? new Date(now - unfinished.hoursAgo * HOUR_MS)
    : new Date(now - (durationSeconds - remaining) * 1000);
  const deadline = new Date(now + remaining * 1000);

  const answers =
    sessionId === DEMO_SESSION_ID
      ? DEMO_ANSWERS
      : unfinished
        ? synthesizeAnswers(questions, unfinished.answered, 0)
        : {};

  return {
    id: sessionId,
    title: `Tryout ${subject.name}`,
    subject,
    difficulty,
    totalQuestions: questions.length,
    durationSeconds,
    startedAt: startedAt.toISOString(),
    deadline: deadline.toISOString(),
    status: finished ? "selesai" : "berjalan",
    questions: questions.map((item, index) => ({
      id: item.id,
      orderNumber: index + 1,
      text: item.text,
      options: item.options.map(({ id, text }) => ({ id, text })),
    })),
    answers,
  };
}

/** Semua nilai tryout tiruan yang sudah selesai, terbaru dulu (pembanding di pembahasan tiruan). */
function mockScoreHistory(now: number): ScoreHistoryEntry[] {
  return MOCK_FINISHED.flatMap((item) => {
    const entry = finishedRecord(item.id, now);
    if (!entry) return [];
    const { config, finishedAt, answers } = entry;
    const result = gradeAnswers(toReviewQuestions(config.questions), answers);
    return [
      {
        sessionId: item.id,
        title: `Tryout ${config.subject.name}`,
        subjectName: config.subject.name,
        difficulty: config.difficulty,
        score: result.score,
        correct: result.correct,
        total: result.total,
        finishedAt: finishedAt.toISOString(),
      },
    ];
  });
}

/**
 * Data hasil & pembahasan sesi yang sudah selesai (kunci jawaban ikut dikirim).
 * Sementara memakai data tiruan.
 */
export async function getTryoutReview(sessionId: string): Promise<TryoutReview | null> {
  await connection();

  const config = resolveMockConfig(sessionId);
  if (!config) return null;

  const now = Date.now();
  const { subject, difficulty, questions, durationSeconds } = config;
  const finished = finishedRecord(sessionId, now);
  const finishedAt = finished?.finishedAt ?? new Date(now - MINUTE_MS);
  const startedAt =
    finished?.startedAt ?? new Date(finishedAt.getTime() - Math.round(durationSeconds * 0.75) * 1000);
  const answers = finished?.answers ?? (sessionId === DEMO_SESSION_ID ? DEMO_ANSWERS : {});

  // Pembanding: tryout lain dengan mapel sama yang selesai lebih dulu.
  const history = mockScoreHistory(now).filter(
    (entry) =>
      entry.sessionId !== sessionId &&
      entry.subjectName === subject.name &&
      new Date(entry.finishedAt).getTime() < finishedAt.getTime(),
  );

  return {
    sessionId,
    title: `Tryout ${subject.name}`,
    subject,
    difficulty,
    durationSeconds,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    questions: toReviewQuestions(questions),
    answers,
    history,
  };
}
