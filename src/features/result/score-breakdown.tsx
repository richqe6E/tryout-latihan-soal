import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "cn";
import { OUTCOME_STYLE } from "@/features/review/outcome-style";
import type { ReviewQuestion, TryoutScore } from "@/lib/tryout/types";

type ScoreBreakdownProps = {
  sessionId: string;
  questions: ReviewQuestion[];
  result: TryoutScore;
};

/** Proporsi benar/salah/kosong dan status tiap nomor soal. */
export function ScoreBreakdown({ sessionId, questions, result }: ScoreBreakdownProps) {
  const segments = [
    { key: "benar", count: result.correct, className: "bg-play-green" },
    { key: "salah", count: result.wrong, className: "bg-play-red" },
    { key: "kosong", count: result.empty, className: "bg-play-line" },
  ] as const;

  return (
    <section
      aria-labelledby="breakdown-title"
      className="flex w-full flex-col gap-4 rounded-2xl border-2 border-play-line bg-white p-5 text-left"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="breakdown-title" className="text-xl font-black text-play-ink">
          Rincian jawaban
        </h2>
        <p className="text-sm font-bold text-play-ink-muted">{result.total} soal</p>
      </div>

      <div aria-hidden="true" className="flex h-4 w-full overflow-hidden rounded-full bg-play-line">
        {segments.map((segment) =>
          segment.count > 0 ? (
            <span
              key={segment.key}
              className={cn("h-full first:rounded-l-full last:rounded-r-full", segment.className)}
              style={{ width: `${(segment.count / result.total) * 100}%` }}
            />
          ) : null,
        )}
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-play-green-soft px-2 py-2 text-play-green-ink">
          <dt className="text-xs font-black tracking-[0.06em] uppercase">Benar</dt>
          <dd className="text-2xl font-black tabular-nums">{result.correct}</dd>
        </div>
        <div className="rounded-xl bg-play-red-soft px-2 py-2 text-play-red-ink">
          <dt className="text-xs font-black tracking-[0.06em] uppercase">Salah</dt>
          <dd className="text-2xl font-black tabular-nums">{result.wrong}</dd>
        </div>
        <div className="rounded-xl bg-play-polar px-2 py-2 text-play-ink-muted">
          <dt className="text-xs font-black tracking-[0.06em] uppercase">Belum dijawab</dt>
          <dd className="text-2xl font-black tabular-nums">{result.empty}</dd>
        </div>
      </dl>

      <ol aria-label="Status tiap soal" className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {questions.map((question) => {
          const outcome = result.outcomes[question.id] ?? "kosong";
          const style = OUTCOME_STYLE[outcome];
          const Icon = style.icon;
          return (
            <li
              key={question.id}
              aria-label={`Soal ${question.orderNumber}: ${style.label.toLowerCase()}`}
              className={cn(
                "flex h-12 flex-col items-center justify-center rounded-[10px] border-2 border-b-4 leading-none font-black",
                style.tile,
              )}
            >
              <span aria-hidden="true" className="text-sm">
                {question.orderNumber}
              </span>
              <Icon aria-hidden="true" className="size-3.5" strokeWidth={3} />
            </li>
          );
        })}
      </ol>

      {result.wrong > 0 ? (
        <Link
          href={`/tryout/${sessionId}/pembahasan?filter=salah`}
          className="inline-flex items-center gap-1 self-start rounded-md font-black text-play-blue-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-play-ink"
        >
          Pelajari {result.wrong} soal yang salah
          <ChevronRight aria-hidden="true" className="size-4" />
        </Link>
      ) : null}
    </section>
  );
}
