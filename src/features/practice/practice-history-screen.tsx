"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, BookOpen, Trash2 } from "lucide-react";
import { cn } from "cn";
import { Mascot } from "@/components/mascot";
import { SubjectIcon } from "@/components/subject-icon";
import { PlayButton } from "@/components/ui/play-button";
import { getScoreBand } from "@/features/result/score-band";
import { formatClock, formatDateTime, formatMonthYear } from "@/lib/format";
import { DIFFICULTY_LABEL, type PracticeHistoryItem } from "@/lib/tryout/types";
import {
  deleteAllFinishedHistoryAction,
  deleteHistoryAction,
  restoreHistoryAction,
} from "@/server/actions/history-actions";
import { DeleteHistoryDialog } from "./delete-history-dialog";
import { HistoryStatusBadge } from "./history-status-badge";
import { hideSessions, unhideSessions, useHiddenSessions } from "./history-store";
import { DeleteButton, OngoingSection } from "./ongoing-section";

const LINK_CLASS =
  "inline-flex items-center gap-1 rounded-md font-black text-play-blue-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-play-ink";

function FinishedRow({
  item,
  onDelete,
}: {
  item: PracticeHistoryItem;
  onDelete: (item: PracticeHistoryItem) => void;
}) {
  const score = item.score ?? 0;
  const band = getScoreBand(score);
  const correct = item.correctCount ?? 0;
  const wrong = item.answeredCount - correct;
  const empty = item.totalQuestions - item.answeredCount;

  return (
    <li className="relative flex items-start gap-4 rounded-2xl border-2 border-play-line bg-white p-4 pr-14">
      <DeleteButton label={`Hapus riwayat ${item.title}`} onClick={() => onDelete(item)} />
      <span
        className={cn(
          "flex w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl py-2 leading-none",
          band.chip,
        )}
      >
        <span className="text-2xl font-black">{score}</span>
        <span className="text-[10px] font-black">/100</span>
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="flex items-center gap-1.5 text-lg font-black">
          <SubjectIcon subjectId={item.subject.id} className="shrink-0 text-play-ink-muted" />
          <span className="truncate">{item.title}</span>
          <HistoryStatusBadge status="selesai" />
        </p>
        <p className="text-sm font-bold text-play-ink-muted">
          {item.finishedAt ? (
            <>
              Selesai <time dateTime={item.finishedAt}>{formatDateTime(item.finishedAt)}</time> ·{" "}
            </>
          ) : null}
          {DIFFICULTY_LABEL[item.difficulty]}
          {item.usedSeconds !== null ? ` · durasi ${formatClock(item.usedSeconds)}` : ""}
        </p>
        <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm font-extrabold">
          <span className="text-play-green-ink">{correct} benar</span>
          <span className="text-play-red-ink">{wrong} salah</span>
          <span className="text-play-ink-muted">{empty} kosong</span>
          <span className={band.text}>· {band.label}</span>
        </p>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <Link href={`/tryout/${item.sessionId}/hasil`} className={LINK_CLASS}>
            Lihat hasil
          </Link>
          <Link href={`/tryout/${item.sessionId}/pembahasan`} className={LINK_CLASS}>
            <BookOpen aria-hidden="true" className="size-4" />
            Pembahasan
          </Link>
        </div>
      </div>
    </li>
  );
}

/** Kelompokkan sesi selesai per bulan (data sudah urut terbaru dulu). */
function groupByMonth(items: PracticeHistoryItem[]) {
  const groups: { month: string; items: PracticeHistoryItem[] }[] = [];
  for (const item of items) {
    const month = item.finishedAt ? formatMonthYear(item.finishedAt) : "Lainnya";
    const last = groups.at(-1);
    if (last && last.month === month) last.items.push(item);
    else groups.push({ month, items: [item] });
  }
  return groups;
}

/** Riwayat latihan: tryout yang belum selesai bisa dilanjutkan, yang selesai bisa dilihat hasilnya. */
type PendingDelete = {
  ids: string[];
  title: string;
  description: string;
  confirmLabel: string;
  /** "Hapus semua": hapus SEMUA riwayat selesai di server, termasuk yang belum dimuat. */
  allFinished?: boolean;
};

export function PracticeHistoryScreen({ items, now }: { items: PracticeHistoryItem[]; now: number }) {
  const router = useRouter();
  const { hidden } = useHiddenSessions();
  const [pending, setPending] = useState<PendingDelete | null>(null);
  // Setelah item terhapus, tombol pemicunya ikut hilang → kembalikan fokus ke judul halaman.
  const [focusHeading, setFocusHeading] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const visible = items.filter((item) => !hidden.has(item.sessionId));
  const ongoing = items.filter((item) => item.status === "berjalan");
  const finished = visible.filter((item) => item.status === "selesai");

  const askDelete = (next: PendingDelete) => {
    setFocusHeading(false);
    setPending(next);
  };

  const askDeleteOne = (item: PracticeHistoryItem) =>
    askDelete({
      ids: [item.sessionId],
      title: "Hapus riwayat ini?",
      description:
        item.status === "selesai"
          ? `${item.title} (nilai ${item.score}) beserta jawabannya akan dihapus dari riwayat dan riwayat nilai.`
          : `${item.title} yang belum selesai akan dihapus. Kamu tidak bisa melanjutkannya lagi.`,
      confirmLabel: "Hapus",
    });

  const askDeleteAllFinished = () =>
    askDelete({
      ids: finished.map((item) => item.sessionId),
      title: `Hapus ${finished.length} riwayat selesai?`,
      description: "Semua tryout yang sudah selesai beserta nilainya akan dihapus dari riwayat.",
      confirmLabel: "Hapus semua",
      allFinished: true,
    });

  const undoDelete = async (ids: string[]) => {
    const result = await restoreHistoryAction(ids);
    if (!result.ok) {
      toast.error("Riwayat belum bisa dipulihkan", { description: result.message });
      return;
    }
    unhideSessions(ids);
    router.refresh();
  };

  const confirmDelete = async () => {
    if (!pending) return;
    const { ids, allFinished } = pending;
    // Sembunyikan dulu supaya terasa instan; batalkan bila server menolak.
    hideSessions(ids);
    setFocusHeading(true);
    setPending(null);
    const result = allFinished ? await deleteAllFinishedHistoryAction() : await deleteHistoryAction(ids);
    if (!result.ok) {
      unhideSessions(ids);
      toast.error("Riwayat belum terhapus", { description: result.message });
      return;
    }
    const deleted = result.data.deleted;
    router.refresh();
    toast.success(deleted.length > 1 ? `${deleted.length} riwayat dihapus` : "Riwayat dihapus", {
      action: { label: "Urungkan", onClick: () => void undoDelete(deleted) },
    });
  };

  return (
    <div className="flex min-h-dvh flex-col bg-white text-play-ink">
      <header className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 pt-4 md:px-8 md:pt-6">
        <Link
          href="/"
          aria-label="Kembali ke beranda"
          className="inline-flex size-12 items-center justify-center rounded-lg text-play-ink-muted transition-colors hover:bg-play-polar focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-play-ink"
        >
          <ArrowLeft aria-hidden="true" className="size-6" />
        </Link>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-black tracking-tight outline-none md:text-3xl"
        >
          Riwayat latihan
        </h1>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 pt-4 pb-12 md:px-8">
        <OngoingSection
          items={ongoing}
          finishedIds={items.filter((item) => item.status === "selesai").map((item) => item.sessionId)}
          hidden={hidden}
          now={now}
          onDelete={askDeleteOne}
        />

        {finished.length > 0 ? (
          <section aria-labelledby="finished-title" className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 id="finished-title" className="text-xl font-black">
                Selesai <span className="text-play-ink-muted">({finished.length})</span>
              </h2>
              <button
                type="button"
                onClick={askDeleteAllFinished}
                aria-haspopup="dialog"
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-black text-play-red-ink transition-colors hover:bg-play-red-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-play-ink"
              >
                <Trash2 aria-hidden="true" className="size-4" />
                Hapus semua
              </button>
            </div>
            {groupByMonth(finished).map((group) => (
              <div key={group.month} className="flex flex-col gap-2">
                <h3 className="text-sm font-black tracking-[0.06em] text-play-ink-muted uppercase">
                  {group.month}
                </h3>
                <ul className="flex flex-col gap-3">
                  {group.items.map((item) => (
                    <FinishedRow key={item.sessionId} item={item} onDelete={askDeleteOne} />
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ) : null}

        {visible.length === 0 ? (
          <section className="flex flex-col items-center gap-4 py-16 text-center">
            <Mascot mood="happy" className="size-28" />
            <h2 className="text-2xl font-black">Belum ada latihan</h2>
            <p className="text-lg font-bold text-play-ink-muted">
              Tryout yang kamu kerjakan akan tercatat di sini.
            </p>
            <PlayButton tone="green" asChild>
              <Link href="/mulai">Mulai tryout</Link>
            </PlayButton>
          </section>
        ) : null}
      </main>

      <DeleteHistoryDialog
        open={pending !== null}
        onOpenChange={(open) => (open ? undefined : setPending(null))}
        title={pending?.title ?? ""}
        description={pending?.description ?? ""}
        confirmLabel={pending?.confirmLabel ?? "Hapus"}
        onConfirm={() => void confirmDelete()}
        returnFocusRef={focusHeading ? headingRef : undefined}
      />
    </div>
  );
}
