"use client";

import Link from "next/link";
import { Play, Timer, Trash2 } from "lucide-react";
import { SubjectIcon } from "@/components/subject-icon";
import { PlayButton } from "@/components/ui/play-button";
import { useAllSavedProgress, type SavedProgress } from "@/features/tryout/progress-store";
import { formatClock, formatDateTime, formatRelative } from "@/lib/format";
import { DIFFICULTY_LABEL, type PracticeHistoryItem } from "@/lib/tryout/types";
import { HistoryStatusBadge } from "./history-status-badge";

type OngoingItem = PracticeHistoryItem & { paused: boolean; savedAt: string | null };

function countAnswered(progress: SavedProgress) {
  return Object.values(progress.answers).filter((answer) => answer.selectedOptionId).length;
}

/** Gabungkan data server dengan progres tersimpan di perangkat ini (lebih baru). */
function mergeWithLocal(
  items: PracticeHistoryItem[],
  local: SavedProgress[],
  finishedIds: string[],
): OngoingItem[] {
  const merged: OngoingItem[] = items.map((item) => {
    const progress = local.find((entry) => entry.sessionId === item.sessionId);
    if (!progress) return { ...item, paused: item.paused ?? false, savedAt: null };
    return {
      ...item,
      answeredCount: countAnswered(progress),
      remainingSeconds: progress.pausedRemaining ?? item.remainingSeconds,
      paused: progress.pausedRemaining !== null,
      savedAt: progress.savedAt,
    };
  });

  for (const progress of local) {
    if (merged.some((item) => item.sessionId === progress.sessionId)) continue;
    if (finishedIds.includes(progress.sessionId)) continue;
    merged.push({
      sessionId: progress.sessionId,
      title: progress.title,
      subject: { id: progress.subjectId, name: progress.subjectName, description: "" },
      difficulty: progress.difficulty,
      status: "berjalan",
      totalQuestions: progress.totalQuestions,
      answeredCount: countAnswered(progress),
      startedAt: progress.savedAt,
      finishedAt: null,
      score: null,
      correctCount: null,
      usedSeconds: null,
      remainingSeconds: progress.pausedRemaining,
      paused: progress.pausedRemaining !== null,
      savedAt: progress.savedAt,
    });
  }

  // Yang terakhir disentuh di atas.
  return merged.sort(
    (a, b) => new Date(b.savedAt ?? b.startedAt).getTime() - new Date(a.savedAt ?? a.startedAt).getTime(),
  );
}

function OngoingCard({
  item,
  now,
  onDelete,
}: {
  item: OngoingItem;
  now: number;
  onDelete: (item: PracticeHistoryItem) => void;
}) {
  const percent = Math.round((item.answeredCount / item.totalQuestions) * 100);
  return (
    <li className="relative flex flex-col gap-4 rounded-2xl border-2 border-b-4 border-play-line bg-white p-4 sm:flex-row sm:items-center sm:pr-14">
      <DeleteButton label={`Hapus riwayat ${item.title}`} onClick={() => onDelete(item)} />
      <div className="flex min-w-0 flex-1 items-start gap-4 pr-10 sm:pr-0">
        <SubjectIcon subjectId={item.subject.id} tile />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div>
            <p className="flex flex-wrap items-center gap-2 text-lg font-black">
              <span className="truncate">{item.title}</span>
              <HistoryStatusBadge status={item.paused ? "dijeda" : "berjalan"} />
            </p>
            <p className="text-sm font-bold text-play-ink-muted">
              {DIFFICULTY_LABEL[item.difficulty]} · {item.savedAt ? "Disimpan" : "Dimulai"}{" "}
              <time dateTime={item.savedAt ?? item.startedAt}>
                {formatDateTime(item.savedAt ?? item.startedAt)}
              </time>{" "}
              ({formatRelative(item.savedAt ?? item.startedAt, now)})
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div
              role="progressbar"
              aria-label="Soal terjawab"
              aria-valuemin={0}
              aria-valuemax={item.totalQuestions}
              aria-valuenow={item.answeredCount}
              aria-valuetext={`${item.answeredCount} dari ${item.totalQuestions} soal terjawab`}
              className="h-3 flex-1 overflow-hidden rounded-full bg-play-line"
            >
              <div className="h-full rounded-full bg-play-green" style={{ width: `${percent}%` }} />
            </div>
            <span className="text-sm font-black text-play-ink-muted tabular-nums">
              {item.answeredCount}/{item.totalQuestions}
            </span>
          </div>
          {item.remainingSeconds !== null ? (
            <p className="inline-flex items-center gap-1.5 text-sm font-bold text-play-ink-muted">
              <Timer aria-hidden="true" className="size-4" />
              Sisa waktu {formatClock(item.remainingSeconds)}
            </p>
          ) : null}
        </div>
      </div>
      <PlayButton tone="green" asChild className="sm:min-w-40">
        <Link href={`/tryout/${item.sessionId}`} aria-label={`Lanjutkan ${item.title}`}>
          <Play aria-hidden="true" className="fill-current" />
          Lanjutkan
        </Link>
      </PlayButton>
    </li>
  );
}

/** Tombol hapus ikon di pojok kartu riwayat. */
export function DeleteButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-haspopup="dialog"
      className="absolute top-3 right-3 inline-flex size-10 items-center justify-center rounded-lg text-play-ink-muted transition-colors hover:bg-play-red-soft hover:text-play-red-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-play-ink"
    >
      <Trash2 aria-hidden="true" className="size-5" />
    </button>
  );
}

type OngoingSectionProps = {
  items: PracticeHistoryItem[];
  finishedIds: string[];
  hidden: Set<string>;
  /** Waktu acuan dari server untuk teks "x jam yang lalu". */
  now: number;
  onDelete: (item: PracticeHistoryItem) => void;
};

/** Tryout yang belum selesai, bisa dilanjutkan dari soal terakhir. */
export function OngoingSection({ items, finishedIds, hidden, now, onDelete }: OngoingSectionProps) {
  const { items: local } = useAllSavedProgress();
  const ongoing = mergeWithLocal(items, local, finishedIds).filter((item) => !hidden.has(item.sessionId));
  if (ongoing.length === 0) return null;

  return (
    <section aria-labelledby="ongoing-title" className="flex flex-col gap-3">
      <h2 id="ongoing-title" className="text-xl font-black">
        Belum selesai <span className="text-play-ink-muted">({ongoing.length})</span>
      </h2>
      <ul className="flex flex-col gap-3">
        {ongoing.map((item) => (
          <OngoingCard key={item.sessionId} item={item} now={now} onDelete={onDelete} />
        ))}
      </ul>
    </section>
  );
}
