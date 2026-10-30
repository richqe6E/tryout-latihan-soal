"use client";

import { useEffect, useState } from "react";
import { cn } from "cn";
import { getScoreBand } from "./score-band";

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const COUNT_UP_MS = 900;

/** Angka naik perlahan dari 0 ke nilai akhir (dilewati jika pengguna memilih reduced motion). */
function useCountUp(target: number, enabled: boolean) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = reduceMotion ? 1 : Math.min(1, (now - start) / COUNT_UP_MS);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, enabled]);

  return value;
}

type ScoreHeroProps = {
  score: number;
  /** false selama hidrasi; tampilkan kerangka dulu. */
  ready: boolean;
};

/** Nilai total 0–100 dalam cincin progres besar beserta predikatnya. */
export function ScoreHero({ score, ready }: ScoreHeroProps) {
  const shown = useCountUp(score, ready);
  const band = getScoreBand(score);
  const offset = CIRCUMFERENCE * (1 - shown / 100);

  return (
    <section aria-labelledby="score-title" className="flex flex-col items-center gap-3">
      <h2 id="score-title" className="sr-only">
        Nilai total
      </h2>
      <div className="relative size-48 md:size-56">
        <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
          <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="var(--color-play-line)" strokeWidth="12" />
          {ready ? (
            <circle
              cx="60"
              cy="60"
              r={RADIUS}
              fill="none"
              stroke={band.ring}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
            />
          ) : null}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {ready ? (
            <>
              <p className="text-6xl leading-none font-black text-play-ink md:text-7xl">
                <span className="sr-only">Nilai {score} dari 100. </span>
                <span aria-hidden="true">{shown}</span>
              </p>
              <p
                aria-hidden="true"
                className="mt-1 text-sm font-black tracking-[0.06em] text-play-ink-muted uppercase"
              >
                dari 100
              </p>
            </>
          ) : (
            <span className="h-14 w-20 animate-pulse rounded-xl bg-play-polar" />
          )}
        </div>
      </div>
      {ready ? (
        <p className={cn("animate-drop rounded-full px-4 py-1.5 text-lg font-black", band.chip)}>
          {band.label}
        </p>
      ) : (
        <span className="h-9 w-32 animate-pulse rounded-full bg-play-polar" />
      )}
    </section>
  );
}
