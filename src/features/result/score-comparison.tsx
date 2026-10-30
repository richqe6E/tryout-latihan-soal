import Link from "next/link";
import { ChevronRight, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "cn";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatShortDate } from "@/lib/format";
import type { ScoreHistoryEntry } from "@/lib/tryout/types";

const MAX_COLUMNS = 5;

type ScoreComparisonProps = {
  score: number;
  /** Riwayat sebelumnya, terbaru dulu. */
  history: ScoreHistoryEntry[];
  title: string;
};

type Column = { key: string; label: string; detail: string; score: number; current: boolean };

/** Selisih nilai dengan tryout sebelumnya + kolom mini riwayat (sesi ini ditonjolkan). */
export function ScoreComparison({ score, history, title }: ScoreComparisonProps) {
  const previous = history[0];

  if (!previous) {
    return (
      <section className="w-full rounded-2xl border-2 border-play-line bg-white p-5 text-left">
        <h2 className="text-xl font-black text-play-ink">Dibanding tryout sebelumnya</h2>
        <p className="mt-1 font-bold text-play-ink-muted">
          Ini tryout pertamamu! Nilai ini jadi patokan untuk tryout berikutnya.
        </p>
      </section>
    );
  }

  const delta = score - previous.score;
  const trend = delta > 0 ? "naik" : delta < 0 ? "turun" : "tetap";
  const TrendIcon = trend === "naik" ? TrendingUp : trend === "turun" ? TrendingDown : Minus;

  const columns: Column[] = [
    ...history
      .slice(0, MAX_COLUMNS - 1)
      .reverse()
      .map((entry) => ({
        key: entry.sessionId,
        label: formatShortDate(entry.finishedAt),
        detail: `${entry.title} · ${formatShortDate(entry.finishedAt)}`,
        score: entry.score,
        current: false,
      })),
    { key: "sekarang", label: "Ini", detail: `${title} · sesi ini`, score, current: true },
  ];

  return (
    <section
      aria-labelledby="comparison-title"
      className="flex w-full flex-col gap-4 rounded-2xl border-2 border-play-line bg-white p-5 text-left"
    >
      <h2 id="comparison-title" className="text-xl font-black text-play-ink">
        Dibanding tryout sebelumnya
      </h2>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p
            className={cn(
              "flex items-center gap-2 text-3xl font-black",
              trend === "naik" && "text-play-green-ink",
              trend === "turun" && "text-play-red-ink",
              trend === "tetap" && "text-play-ink-muted",
            )}
          >
            <TrendIcon aria-hidden="true" className="size-7" strokeWidth={3} />
            {trend === "tetap" ? "Sama" : `${delta > 0 ? "+" : "−"}${Math.abs(delta)} poin`}
          </p>
          <p className="font-bold text-play-ink-muted">
            {trend === "naik" ? "Naik" : trend === "turun" ? "Turun" : "Tetap"} dari {previous.score} pada{" "}
            {formatShortDate(previous.finishedAt)}
          </p>
        </div>

        <figure className="flex flex-col gap-1">
          <div aria-hidden="true" className="flex h-28 items-end gap-3 border-b border-play-line px-1">
            {columns.map((column) => (
              <Tooltip key={column.key}>
                <TooltipTrigger asChild>
                  <div className="flex h-full w-9 flex-col items-center justify-end gap-1">
                    <span
                      className={cn(
                        "text-xs font-black",
                        column.current ? "text-play-ink" : "text-play-ink-muted",
                      )}
                    >
                      {column.score}
                    </span>
                    <span
                      className={cn(
                        "w-6 rounded-t-[4px]",
                        column.current ? "bg-play-blue-strong" : "bg-play-ink-faint",
                      )}
                      style={{ height: `${Math.max(column.score, 2) * 0.8}%` }}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="font-bold">
                  {column.detail} · nilai {column.score}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
          <div aria-hidden="true" className="flex gap-3 px-1">
            {columns.map((column) => (
              <span
                key={column.key}
                className={cn(
                  "w-9 text-center text-[11px] font-bold",
                  column.current ? "text-play-ink" : "text-play-ink-muted",
                )}
              >
                {column.label}
              </span>
            ))}
          </div>
          <figcaption className="sr-only">
            Riwayat nilai:{" "}
            {columns
              .map((column) => `${column.current ? "sesi ini" : column.label} ${column.score}`)
              .join(", ")}
          </figcaption>
        </figure>
      </div>

      <Link
        href="/nilai"
        className="inline-flex items-center gap-1 self-start rounded-md font-black text-play-blue-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-play-ink"
      >
        Lihat semua riwayat nilai
        <ChevronRight aria-hidden="true" className="size-4" />
      </Link>
    </section>
  );
}
