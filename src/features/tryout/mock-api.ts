"use client";

import type { AnswerState } from "@/lib/tryout/types";

/**
 * API tiruan di sisi browser (frontend-first).
 * Kontraknya sama dengan yang nanti disediakan backend; isinya cukup
 * menyimpan ke sessionStorage dan meniru jeda jaringan.
 */

export type SubmitReason = "manual" | "timeout";

export type TryoutSubmission = {
  sessionId: string;
  totalQuestions: number;
  answers: Record<string, AnswerState>;
  reason: SubmitReason;
  submittedAt: string;
  /** Lama pengerjaan (detik). */
  usedSeconds: number;
};

const NETWORK_DELAY_MS = 600;

function submissionKey(sessionId: string) {
  return `tryout:${sessionId}:submission`;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function submitTryout(
  sessionId: string,
  totalQuestions: number,
  answers: Record<string, AnswerState>,
  reason: SubmitReason,
  usedSeconds: number,
): Promise<TryoutSubmission> {
  await wait(NETWORK_DELAY_MS);
  const submission: TryoutSubmission = {
    sessionId,
    totalQuestions,
    answers,
    reason,
    usedSeconds,
    submittedAt: new Date().toISOString(),
  };
  window.sessionStorage.setItem(submissionKey(sessionId), JSON.stringify(submission));
  return submission;
}

/** Data mentah (string) agar aman dipakai sebagai snapshot useSyncExternalStore. */
export function readSubmissionRaw(sessionId: string): string | null {
  try {
    return window.sessionStorage.getItem(submissionKey(sessionId));
  } catch {
    return null;
  }
}

export function parseSubmission(raw: string | null): TryoutSubmission | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TryoutSubmission;
  } catch {
    return null;
  }
}
