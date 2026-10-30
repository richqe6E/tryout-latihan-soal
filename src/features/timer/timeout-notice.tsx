"use client";

import { useMemo, useSyncExternalStore } from "react";
import { AlarmClock } from "lucide-react";
import { parseSubmission, readSubmissionRaw } from "@/features/tryout/mock-api";
import { formatClockTime } from "@/lib/format";

const noopSubscribe = () => () => {};

/** Pemberitahuan di halaman hasil bahwa jawaban terkumpul otomatis karena waktu habis. */
type TimeoutNoticeProps = {
  sessionId: string;
  /** Data dari server (sesi database); dipakai bila tidak ada data pengumpulan di perangkat. */
  fallback?: { submittedAt: string; answered: number; total: number };
};

export function TimeoutNotice({ sessionId, fallback }: TimeoutNoticeProps) {
  const raw = useSyncExternalStore(
    noopSubscribe,
    () => readSubmissionRaw(sessionId),
    () => null,
  );
  const submission = useMemo(() => parseSubmission(raw), [raw]);

  const answered = submission
    ? Object.values(submission.answers).filter((answer) => answer.selectedOptionId).length
    : (fallback?.answered ?? null);
  const total = submission?.totalQuestions ?? fallback?.total ?? null;
  const submittedAtIso = submission?.submittedAt ?? fallback?.submittedAt ?? null;
  const submittedAt = submittedAtIso ? formatClockTime(submittedAtIso) : null;

  return (
    <div
      role="status"
      className="flex w-full animate-drop gap-3 rounded-2xl border-2 border-play-red bg-play-red-soft p-4 text-left text-play-red-ink"
    >
      <AlarmClock aria-hidden="true" className="mt-0.5 size-6 shrink-0" />
      <div className="flex flex-col gap-1">
        <p className="text-lg font-black">Waktu habis</p>
        <p className="leading-snug font-bold">
          Jawabanmu dikumpulkan otomatis{submittedAt ? ` pukul ${submittedAt}` : ""}.{" "}
          {answered !== null && total !== null ? `${answered} dari ${total} soal sempat terjawab; ` : ""}
          soal yang kosong tidak mendapat nilai.
        </p>
      </div>
    </div>
  );
}
