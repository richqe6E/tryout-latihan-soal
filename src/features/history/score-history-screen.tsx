"use client";

import Link from "next/link";
import { ArrowLeft, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "cn";
import { Mascot } from "@/components/mascot";
import { PlayButton } from "@/components/ui/play-button";
import { getScoreBand } from "@/features/result/score-band";
import { formatLongDate, formatShortDate } from "@/lib/format";
import { DIFFICULTY_LABEL, type ScoreHistoryEntry } from "@/lib/tryout/types";
import { useHiddenSessions } from "@/features/practice/history-store";
import { ScoreTrendChart } from "./score-trend-chart";

function Delta({ value }: { value: number | null }) {
  if (value === null) return <span className="text-sm font-bold text-play-ink-muted">Pertama</span>;
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-sm font-black",
        value > 0 && "text-play-green-ink",
        value < 0 && "text-play-red-ink",
        value === 0 && "text-play-ink-muted",
      )}
    >
      <Icon aria-hidden="true" className="size-4" strokeWidth={3} />
      {value === 0 ? "Sama" : `${value > 0 ? "+" : "−"}${Math.abs(value)}`}
    </span>
  );
}

function StatTile({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border-2 border-play-line bg-white p-4">
      <p className="text-sm font-bold text-play-ink-muted">{label}</p>
      <p className="text-3xl leading-none font-black text-play-ink">{value}</p>
      {children}
    </div>
  );
}

/** Riwayat nilai: ringkasan, tren, dan daftar semua tryout yang selesai. */
export function ScoreHistoryScreen({ history: allHistory }: { history: ScoreHistoryEntry[] }) {
  // Riwayat yang dihapus pengguna tidak ikut dihitung. Urutan: terbaru dulu.
  const { hidden } = useHiddenSessions();
  const history = allHistory.filter((entry) => !hidden.has(entry.sessionId));
  const latest = history[0];
  const average = history.length
    ? Math.round(history.reduce((sum, entry) => sum + entry.score, 0) / history.length)
    : 0;
  const best = history.reduce((max, entry) => Math.max(max, entry.score), 0);
  const chronological = [...history].reverse();

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
        <h1 className="text-2xl font-black tracking-tight md:text-3xl">Riwayat nilai</h1>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pt-4 pb-12 md:px-8">
        {history.length === 0 ? (
          <section className="flex flex-col items-center gap-4 py-16 text-center">
            <Mascot mood="happy" className="size-28" />
            <h2 className="text-2xl font-black">Belum ada nilai</h2>
            <p className="text-lg font-bold text-play-ink-muted">
              Selesaikan satu tryout dan nilaimu akan muncul di sini.
            </p>
            <PlayButton tone="green" asChild>
              <Link href="/tryout/demo">Mulai tryout</Link>
            </PlayButton>
          </section>
        ) : (
          <>
            <section aria-label="Ringkasan nilai" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatTile label="Nilai terakhir" value={String(latest.score)}>
                <Delta value={history[1] ? latest.score - history[1].score : null} />
              </StatTile>
              <StatTile label="Rata-rata" value={String(average)}>
                <span className="text-sm font-bold text-play-ink-muted">dari {history.length} tryout</span>
              </StatTile>
              <StatTile label="Tertinggi" value={String(best)}>
                <span className="text-sm font-bold text-play-ink-muted">{getScoreBand(best).label}</span>
              </StatTile>
            </section>

            <section
              aria-labelledby="trend-title"
              className="flex flex-col gap-3 rounded-2xl border-2 border-play-line bg-white p-5"
            >
              <h2 id="trend-title" className="text-xl font-black">
                Tren nilai
              </h2>
              <ScoreTrendChart
                points={chronological.map((entry) => ({
                  key: entry.sessionId,
                  label: formatShortDate(entry.finishedAt),
                  detail: entry.title,
                  score: entry.score,
                }))}
              />
            </section>

            <section aria-labelledby="list-title" className="flex flex-col gap-3">
              <h2 id="list-title" className="text-xl font-black">
                Semua tryout
              </h2>
              <ol className="flex flex-col gap-3">
                {history.map((entry, index) => {
                  const previous = history[index + 1];
                  const band = getScoreBand(entry.score);
                  return (
                    <li
                      key={entry.sessionId}
                      className="flex items-center gap-4 rounded-2xl border-2 border-b-4 border-play-line bg-white p-4"
                    >
                      <span
                        className={cn(
                          "flex size-14 shrink-0 items-center justify-center rounded-xl text-xl font-black",
                          band.chip,
                        )}
                      >
                        {entry.score}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <p className="truncate text-lg font-black">{entry.title}</p>
                        <p className="text-sm font-bold text-play-ink-muted">
                          {formatLongDate(entry.finishedAt)} · {DIFFICULTY_LABEL[entry.difficulty]} ·{" "}
                          {entry.correct}/{entry.total} benar
                        </p>
                      </div>
                      <Delta value={previous ? entry.score - previous.score : null} />
                    </li>
                  );
                })}
              </ol>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
