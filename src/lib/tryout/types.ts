/**
 * Tipe domain tryout. Mengikuti skema database di PRD
 * (subjects, questions, options, tryout_sessions, session_questions, answers).
 * Ini juga kontrak data antara UI dan backend.
 */

export type Difficulty = "mudah" | "sedang" | "sulit";

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  mudah: "Mudah",
  sedang: "Sedang",
  sulit: "Sulit",
};

export type Subject = {
  id: string;
  name: string;
  description: string;
};

/** Pilihan jawaban yang aman dikirim ke browser selama tryout (tanpa kunci). */
export type QuestionOption = {
  id: string;
  text: string;
};

/** Mapel di halaman pilih tryout beserta jumlah soal aktif per tingkat kesulitan. */
export type SubjectCatalogItem = Subject & {
  counts: Record<Difficulty, number>;
  /** Total soal aktif di semua tingkat. */
  total: number;
};

/** Soal di dalam satu sesi, sudah urut sesuai `order_number`. */
export type TryoutQuestion = {
  id: string;
  orderNumber: number;
  text: string;
  options: QuestionOption[];
};

/** Jawaban pengguna untuk satu soal (tabel `answers`). */
export type AnswerState = {
  selectedOptionId: string | null;
  isFlagged: boolean;
};

export type SessionStatus = "berjalan" | "selesai";

/** Sesi tryout yang sedang dikerjakan, dilihat dari sisi pengguna. */
export type TryoutSession = {
  id: string;
  title: string;
  subject: Subject;
  difficulty: Difficulty;
  totalQuestions: number;
  durationSeconds: number;
  /** ISO timestamp waktu mulai. */
  startedAt: string;
  /** ISO timestamp batas akhir (startedAt + durationSeconds). */
  deadline: string;
  status: SessionStatus;
  questions: TryoutQuestion[];
  answers: Record<string, AnswerState>;
  /** Nomor soal terakhir yang dibuka (dari server), untuk melanjutkan. */
  lastOrderNumber?: number;
  /** Sisa waktu (detik) bila sesi sedang dijeda; `deadline` lalu dihitung dari sekarang. */
  pausedRemainingSeconds?: number | null;
};

/** Soal lengkap dengan kunci & pembahasan — hanya dikirim setelah tryout selesai. */
/** Pilihan jawaban di pembahasan; catatan hanya ada bila penyusun soal mengisinya. */
export type ReviewOption = QuestionOption & {
  /** Kenapa pilihan ini benar/keliru (mis. kesalahan umum yang menghasilkan pengecoh). */
  explanation?: string;
};

export type ReviewQuestion = Omit<TryoutQuestion, "options"> & {
  options: ReviewOption[];
  correctOptionId: string;
  explanation: string;
};

/** Satu baris riwayat nilai (tryout_sessions yang sudah selesai). */
export type ScoreHistoryEntry = {
  sessionId: string;
  title: string;
  /** Slug mapel (metadata pilihan saat memulai). */
  subjectId?: string;
  subjectName: string;
  difficulty: Difficulty;
  score: number;
  correct: number;
  total: number;
  /** Jumlah soal yang diminta saat memulai (≥ total bila bank soal kurang). */
  requestedQuestions?: number;
  durationSeconds?: number;
  /** ISO timestamp selesai. */
  finishedAt: string;
};

/** Data halaman hasil & pembahasan untuk satu sesi yang sudah selesai. */
export type TryoutReview = {
  sessionId: string;
  title: string;
  subject: Subject;
  difficulty: Difficulty;
  durationSeconds: number;
  startedAt: string;
  finishedAt: string;
  questions: ReviewQuestion[];
  answers: Record<string, AnswerState>;
  /** Riwayat nilai sebelumnya (tidak termasuk sesi ini), terbaru dulu. */
  history: ScoreHistoryEntry[];
  /** Alasan pengumpulan (dari server). */
  submitReason?: "manual" | "timeout";
  /** Batas waktu sesi (dari server). */
  deadline?: string;
  /** Lama pengerjaan bersih yang tersimpan di server (detik). */
  usedSeconds?: number;
};

/** Ringkasan hasil satu sesi (respons endpoint hasil). */
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
  /** Jumlah soal yang diminta saat memulai (≥ total bila bank soal kurang). */
  requestedQuestions: number;
  submitReason: "manual" | "timeout";
  /** True bila dikumpulkan otomatis karena waktu habis. */
  autoSubmitted: boolean;
  durationSeconds: number;
  startedAt: string;
  /** Batas waktu sesi (ISO). */
  deadline: string;
  finishedAt: string;
  /** Lama pengerjaan (detik), maksimal sebesar durasi. */
  usedSeconds: number;
  outcomes: Record<string, QuestionOutcome>;
};

export type QuestionOutcome = "benar" | "salah" | "kosong";

/** Status satu soal pada detail hasil (tanpa teks soal maupun kunci jawaban). */
export type ResultItem = {
  number: number;
  questionId: string;
  outcome: QuestionOutcome;
  flagged: boolean;
};

/** Satu soal di pembahasan: soal, pilihan + kunci, jawaban pengguna, dan penjelasan. */
export type ReviewItem = {
  number: number;
  questionId: string;
  text: string;
  options: (ReviewOption & { isCorrect: boolean })[];
  correctOptionId: string;
  selectedOptionId: string | null;
  outcome: QuestionOutcome;
  flagged: boolean;
  explanation: string;
};

/** Pembahasan satu sesi yang sudah selesai (respons endpoint pembahasan). */
export type TryoutReviewDetail = {
  sessionId: string;
  title: string;
  subject: Subject;
  difficulty: Difficulty;
  score: number;
  finishedAt: string;
  /** Jumlah soal per status untuk SEMUA soal sesi (tidak terpengaruh saringan). */
  counts: Record<QuestionOutcome, number> & { semua: number };
  /** Saringan yang dipakai untuk `items`. */
  filter: "semua" | QuestionOutcome;
  items: ReviewItem[];
};

/** Detail hasil satu sesi: ringkasan + status per soal + pembanding riwayat nilai. */
export type TryoutResultDetail = TryoutResultSummary & {
  /** Persentase benar dari soal yang dijawab (0–100). */
  accuracy: number;
  items: ResultItem[];
  /** Tryout mapel sama yang selesai sebelum sesi ini, terbaru dulu (maks. 10). */
  history: ScoreHistoryEntry[];
  /** Selisih nilai terhadap tryout sebelumnya; null bila ini yang pertama. */
  scoreChange: number | null;
};

export type TryoutScore = {
  score: number;
  correct: number;
  wrong: number;
  empty: number;
  total: number;
  outcomes: Record<string, QuestionOutcome>;
};

/** Satu baris di halaman Riwayat Latihan (selesai maupun belum). */
export type PracticeHistoryItem = {
  sessionId: string;
  title: string;
  subject: Subject;
  difficulty: Difficulty;
  status: SessionStatus;
  totalQuestions: number;
  answeredCount: number;
  /** ISO timestamp mulai. */
  startedAt: string;
  /** ISO timestamp selesai; null jika belum selesai. */
  finishedAt: string | null;
  /** Nilai 0–100; null jika belum selesai. */
  score: number | null;
  /** Jumlah jawaban benar (hanya untuk sesi selesai). */
  correctCount: number | null;
  /** Lama pengerjaan dalam detik (hanya untuk sesi selesai). */
  usedSeconds: number | null;
  /** Sisa waktu tersimpan (detik) untuk sesi yang belum selesai. */
  remainingSeconds: number | null;
  /** True bila sesi berjalan sedang dijeda ("Simpan & keluar"); dari server. */
  paused?: boolean;
  /** Nomor soal terakhir yang dibuka, untuk "lanjutkan dari soal terakhir". */
  lastOrderNumber?: number;
};

/** Profil pengguna (tabel `users`, tanpa password). */
export type UserProfile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  /** ISO timestamp akun dibuat. */
  createdAt: string;
};

/** Pengaturan pribadi (tabel `user_settings`). */
export type UserSettings = {
  /** Jumlah soal default per sesi. */
  defaultQuestionCount: number;
  /** Durasi default ujian (detik). */
  defaultDurationSeconds: number;
  reminderEnabled: boolean;
  /** Jam pengingat "HH:MM" (WIB). */
  reminderTime: string;
};
