import type { CognitiveLevel, QuestionType, VisualAssetId } from "@/lib/kisi-kisi/types";

/**
 * Tipe domain tryout. Mengikuti skema database + ekstensi kisi-kisi multi-bentuk soal.
 */

export type Difficulty = "mudah" | "sedang" | "sulit";

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  mudah: "Mudah",
  sedang: "Sedang",
  sulit: "Sulit",
};

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  pg: "Pilihan Ganda",
  isian: "Isian Singkat",
  uraian: "Uraian",
};

export type Subject = {
  id: string;
  name: string;
  description: string;
};

export type QuestionOption = {
  id: string;
  text: string;
};

export type SubjectCatalogItem = Subject & {
  counts: Record<Difficulty, number>;
  total: number;
};

export type TryoutQuestion = {
  id: string;
  orderNumber: number;
  questionType?: QuestionType;
  typeLabel?: string;
  topic?: string;
  indicator?: string;
  cognitiveLevel?: CognitiveLevel;
  stimulusTitle?: string;
  stimulusText?: string;
  visualAsset?: VisualAssetId;
  visualCaption?: string;
  text: string;
  options: QuestionOption[];
};

export type AnswerState = {
  selectedOptionId: string | null;
  answerText?: string | null;
  isFlagged: boolean;
};

export type SessionStatus = "berjalan" | "selesai";

export type TryoutSession = {
  id: string;
  title: string;
  subject: Subject;
  difficulty: Difficulty;
  mode?: "kisi-kisi" | "latihan";
  totalQuestions: number;
  durationSeconds: number;
  startedAt: string;
  deadline: string;
  status: SessionStatus;
  questions: TryoutQuestion[];
  answers: Record<string, AnswerState>;
  lastOrderNumber?: number;
  pausedRemainingSeconds?: number | null;
};

export type ReviewOption = QuestionOption & {
  explanation?: string;
};

export type ReviewQuestion = Omit<TryoutQuestion, "options"> & {
  options: ReviewOption[];
  correctOptionId: string;
  expectedAnswer?: string;
  acceptedAnswers?: string[];
  rubricNotes?: string;
  explanation: string;
};

export type ScoreHistoryEntry = {
  sessionId: string;
  title: string;
  subjectId?: string;
  subjectName: string;
  difficulty: Difficulty;
  score: number;
  correct: number;
  total: number;
  requestedQuestions?: number;
  durationSeconds?: number;
  finishedAt: string;
};

export type TryoutReview = {
  sessionId: string;
  title: string;
  subject: Subject;
  difficulty: Difficulty;
  mode?: "kisi-kisi" | "latihan";
  durationSeconds: number;
  startedAt: string;
  finishedAt: string;
  questions: ReviewQuestion[];
  answers: Record<string, AnswerState>;
  history: ScoreHistoryEntry[];
  submitReason?: "manual" | "timeout";
  deadline?: string;
  usedSeconds?: number;
};

export type QuestionOutcome = "benar" | "salah" | "kosong";

export type TryoutResultSummary = {
  sessionId: string;
  title: string;
  subject: Subject;
  difficulty: Difficulty;
  score: number;
  correct: number;
  wrong: number;
  empty: number;
  total: number;
  requestedQuestions: number;
  submitReason: "manual" | "timeout";
  autoSubmitted: boolean;
  durationSeconds: number;
  startedAt: string;
  deadline: string;
  finishedAt: string;
  usedSeconds: number;
  outcomes: Record<string, QuestionOutcome>;
};

export type ResultItem = {
  number: number;
  questionId: string;
  outcome: QuestionOutcome;
  flagged: boolean;
};

export type ReviewItem = {
  number: number;
  questionId: string;
  questionType?: QuestionType;
  typeLabel?: string;
  topic?: string;
  indicator?: string;
  cognitiveLevel?: CognitiveLevel;
  stimulusTitle?: string;
  stimulusText?: string;
  visualAsset?: VisualAssetId;
  visualCaption?: string;
  text: string;
  options: (ReviewOption & { isCorrect: boolean })[];
  correctOptionId: string;
  selectedOptionId: string | null;
  answerText?: string | null;
  expectedAnswer?: string;
  rubricNotes?: string;
  outcome: QuestionOutcome;
  flagged: boolean;
  explanation: string;
};

export type TryoutReviewDetail = {
  sessionId: string;
  title: string;
  subject: Subject;
  difficulty: Difficulty;
  score: number;
  finishedAt: string;
  counts: Record<QuestionOutcome, number> & { semua: number };
  filter: "semua" | QuestionOutcome;
  items: ReviewItem[];
};

export type TryoutResultDetail = TryoutResultSummary & {
  accuracy: number;
  items: ResultItem[];
  history: ScoreHistoryEntry[];
  scoreChange: number | null;
};

export type TryoutScore = {
  score: number;
  correct: number;
  wrong: number;
  empty: number;
  total: number;
  /** Jumlah soal uraian yang sudah diisi (dicocokkan mandiri di Pembahasan). */
  essayAnswered?: number;
  essayTotal?: number;
  outcomes: Record<string, QuestionOutcome>;
};

export type PracticeHistoryItem = {
  sessionId: string;
  title: string;
  subject: Subject;
  difficulty: Difficulty;
  status: SessionStatus;
  totalQuestions: number;
  answeredCount: number;
  startedAt: string;
  finishedAt: string | null;
  score: number | null;
  correctCount: number | null;
  usedSeconds: number | null;
  remainingSeconds: number | null;
  paused?: boolean;
  lastOrderNumber?: number;
};

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
};

export type UserSettings = {
  defaultQuestionCount: number;
  defaultDurationSeconds: number;
  reminderEnabled: boolean;
  reminderTime: string;
};
