/**
 * Batas ukuran sesi tryout — satu sumber untuk form (klien), server action/API, dan CHECK database.
 * Fungsi murni, aman dipakai di klien maupun server.
 */
export const SESSION_LIMITS = {
  minQuestions: 1,
  maxQuestions: 50,
  minDurationSeconds: 60,
  maxDurationSeconds: 3 * 60 * 60,
  /** Waktu minimal per soal supaya tryout masih masuk akal dikerjakan. */
  minSecondsPerQuestion: 30,
  /** Bawaan bila pengguna belum mengatur (pengaturan awal). */
  defaultQuestions: 10,
  defaultDurationSeconds: 30 * 60,
} as const;

export type SessionSize = { questionCount: number; durationSeconds: number };
export type SessionSizeErrors = Partial<Record<keyof SessionSize, string>>;

function minutesLabel(seconds: number) {
  const minutes = seconds / 60;
  return Number.isInteger(minutes) ? `${minutes} menit` : `${minutes.toFixed(1).replace(".", ",")} menit`;
}

/** Periksa jumlah soal & durasi: batas masing-masing, lalu waktu minimal per soal. */
export function validateSessionSize({ questionCount, durationSeconds }: SessionSize): SessionSizeErrors {
  const errors: SessionSizeErrors = {};
  const { minQuestions, maxQuestions, minDurationSeconds, maxDurationSeconds, minSecondsPerQuestion } =
    SESSION_LIMITS;

  if (!Number.isInteger(questionCount) || questionCount < minQuestions || questionCount > maxQuestions) {
    errors.questionCount = `Jumlah soal harus ${minQuestions}–${maxQuestions}.`;
  }
  if (
    !Number.isInteger(durationSeconds) ||
    durationSeconds < minDurationSeconds ||
    durationSeconds > maxDurationSeconds
  ) {
    errors.durationSeconds = `Durasi harus ${minutesLabel(minDurationSeconds)} sampai ${maxDurationSeconds / 3600} jam.`;
  }
  if (!errors.questionCount && !errors.durationSeconds) {
    const needed = questionCount * minSecondsPerQuestion;
    if (durationSeconds < needed) {
      errors.durationSeconds = `Durasi terlalu singkat untuk ${questionCount} soal; minimal ${minutesLabel(
        Math.ceil(needed / 60) * 60,
      )}.`;
    }
  }
  return errors;
}
