"use client";

import { useRef, useState, useSyncExternalStore, type KeyboardEvent, type PointerEvent } from "react";

export type TrendPoint = {
  key: string;
  /** Label sumbu X, mis. "28 Okt". */
  label: string;
  /** Keterangan di tooltip, mis. "Tryout Matematika". */
  detail: string;
  score: number;
};

const HEIGHT = 220;
const PAD = { top: 24, right: 24, bottom: 32, left: 36 };
const Y_TICKS = [0, 25, 50, 75, 100];

/** Lebar elemen dalam piksel; 0 sampai terukur di browser. */
function useWidth(ref: React.RefObject<HTMLDivElement | null>) {
  return useSyncExternalStore(
    (onChange) => {
      const element = ref.current;
      if (!element) return () => {};
      const observer = new ResizeObserver(onChange);
      observer.observe(element);
      return () => observer.disconnect();
    },
    () => ref.current?.clientWidth ?? 0,
    () => 0,
  );
}

/** Grafik garis nilai dari waktu ke waktu (satu seri). */
export function ScoreTrendChart({ points }: { points: TrendPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const width = useWidth(containerRef);
  const [active, setActive] = useState<number | null>(null);

  const plotWidth = Math.max(0, width - PAD.left - PAD.right);
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const step = points.length > 1 ? plotWidth / (points.length - 1) : 0;
  const x = (index: number) => PAD.left + (points.length > 1 ? index * step : plotWidth / 2);
  const y = (score: number) => PAD.top + plotHeight * (1 - score / 100);

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${x(index)},${y(point.score)}`)
    .join(" ");
  const areaPath = points.length > 1 ? `${linePath} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z` : "";

  const nearestIndex = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || points.length === 0) return null;
    const relative = clientX - rect.left - PAD.left;
    if (points.length === 1) return 0;
    return Math.min(points.length - 1, Math.max(0, Math.round(relative / step)));
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => setActive(nearestIndex(event.clientX));

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (points.length === 0) return;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const delta = event.key === "ArrowRight" ? 1 : -1;
      setActive((current) =>
        Math.min(
          points.length - 1,
          Math.max(0, (current ?? points.length - 1) + (current === null ? 0 : delta)),
        ),
      );
    } else if (event.key === "Home") {
      setActive(0);
    } else if (event.key === "End") {
      setActive(points.length - 1);
    }
  };

  const activePoint = active !== null ? points[active] : null;
  const lastIndex = points.length - 1;

  return (
    <div
      ref={containerRef}
      role="group"
      tabIndex={0}
      aria-label="Grafik tren nilai. Gunakan panah kiri dan kanan untuk melihat tiap tryout."
      onPointerMove={onPointerMove}
      onPointerLeave={() => setActive(null)}
      onFocus={() => setActive((current) => current ?? lastIndex)}
      onBlur={() => setActive(null)}
      onKeyDown={onKeyDown}
      className="relative w-full touch-pan-y rounded-xl outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-play-ink"
      style={{ height: HEIGHT }}
    >
      {width > 0 ? (
        <svg width={width} height={HEIGHT} aria-hidden="true" className="block">
          {Y_TICKS.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y(tick)}
                y2={y(tick)}
                stroke="var(--color-play-line)"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 8}
                y={y(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-play-ink-muted text-[11px] font-bold"
              >
                {tick}
              </text>
            </g>
          ))}

          {points.map((point, index) => (
            <text
              key={point.key}
              x={x(index)}
              y={HEIGHT - 10}
              textAnchor="middle"
              className={
                index === lastIndex
                  ? "fill-play-ink text-[11px] font-black"
                  : "fill-play-ink-muted text-[11px] font-bold"
              }
            >
              {point.label}
            </text>
          ))}

          {areaPath ? <path d={areaPath} fill="var(--color-play-blue-strong)" opacity={0.1} /> : null}
          <path
            d={linePath}
            fill="none"
            stroke="var(--color-play-blue-strong)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {activePoint && active !== null ? (
            <line
              x1={x(active)}
              x2={x(active)}
              y1={PAD.top}
              y2={y(0)}
              stroke="var(--color-play-ink-faint)"
              strokeWidth={1}
            />
          ) : null}

          {points.map((point, index) => (
            <circle
              key={point.key}
              cx={x(index)}
              cy={y(point.score)}
              r={index === active ? 6 : 4}
              fill="var(--color-play-blue-strong)"
              stroke="var(--color-play-snow)"
              strokeWidth={2}
            />
          ))}

          {points.length > 0 && active === null ? (
            <text
              x={x(lastIndex)}
              y={y(points[lastIndex].score) - 12}
              textAnchor="middle"
              className="fill-play-ink text-sm font-black"
            >
              {points[lastIndex].score}
            </text>
          ) : null}
        </svg>
      ) : null}

      {activePoint && active !== null ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl border-2 border-play-line bg-white px-3 py-2 text-left whitespace-nowrap"
          style={{
            left: Math.min(Math.max(x(active), 70), Math.max(70, width - 70)),
            top: y(activePoint.score) - 10,
          }}
        >
          <p className="text-xl leading-none font-black text-play-ink">{activePoint.score}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-play-ink-muted">
            <span className="h-0.5 w-3 rounded-full bg-play-blue-strong" />
            {activePoint.label} · {activePoint.detail}
          </p>
        </div>
      ) : null}

      <p aria-live="polite" className="sr-only">
        {activePoint ? `${activePoint.label}, ${activePoint.detail}, nilai ${activePoint.score}` : ""}
      </p>
    </div>
  );
}
