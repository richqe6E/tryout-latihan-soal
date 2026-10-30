import type { QuestionOutcome } from "./types";

/** Saringan pembahasan: semua soal, atau hanya yang salah / belum dijawab / benar. */
export type ReviewFilter = "semua" | QuestionOutcome;

export const REVIEW_FILTER_VALUES: readonly ReviewFilter[] = ["semua", "salah", "kosong", "benar"];

/** Nilai saringan dari URL; nilai tak dikenal dianggap "semua". */
export function parseReviewFilter(value: string | null | undefined): ReviewFilter {
  return REVIEW_FILTER_VALUES.find((filter) => filter === value) ?? "semua";
}

export function isReviewFilter(value: string): value is ReviewFilter {
  return REVIEW_FILTER_VALUES.some((filter) => filter === value);
}
