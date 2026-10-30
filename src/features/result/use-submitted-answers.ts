"use client";

import { useMemo, useSyncExternalStore } from "react";
import { parseSubmission, readSubmissionRaw, type TryoutSubmission } from "@/features/tryout/mock-api";

const SERVER = "__server__";
const noopSubscribe = () => () => {};

/**
 * Jawaban yang baru dikumpulkan di perangkat ini (API tiruan).
 * `ready` false selama render server/hidrasi supaya angka tidak berkedip.
 */
export function useSubmittedAnswers(sessionId: string): {
  ready: boolean;
  submission: TryoutSubmission | null;
} {
  const raw = useSyncExternalStore(
    noopSubscribe,
    () => readSubmissionRaw(sessionId),
    () => SERVER,
  );
  return useMemo(
    () =>
      raw === SERVER ? { ready: false, submission: null } : { ready: true, submission: parseSubmission(raw) },
    [raw],
  );
}
