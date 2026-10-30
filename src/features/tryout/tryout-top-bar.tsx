"use client";

import type { ReactNode } from "react";
import { ChevronDown, LayoutGrid } from "lucide-react";
import { Progress as ProgressPrimitive } from "radix-ui";

type TryoutTopBarProps = {
  answered: number;
  total: number;
  /** Tombol keluar di kiri. */
  leading?: ReactNode;
  /** Slot kanan (mis. timer). */
  trailing?: ReactNode;
  /** Di layar kecil, area progress jadi tombol pembuka daftar soal. */
  onOpenPanel?: () => void;
};

function ProgressMeter({ answered, total }: { answered: number; total: number }) {
  const percent = total > 0 ? Math.round((answered / total) * 100) : 0;
  return (
    <ProgressPrimitive.Root
      value={answered}
      max={total}
      aria-label="Soal terjawab"
      getValueLabel={(value, max) => `${value} dari ${max} soal terjawab`}
      className="relative h-4 w-full overflow-hidden rounded-full bg-play-line"
    >
      <ProgressPrimitive.Indicator
        className="relative h-full rounded-full bg-play-green transition-[width] duration-300 ease-out after:absolute after:inset-x-2 after:top-1 after:h-1 after:rounded-full after:bg-white/30"
        style={{ width: `${percent}%` }}
      />
    </ProgressPrimitive.Root>
  );
}

export function TryoutTopBar({ answered, total, leading, trailing, onOpenPanel }: TryoutTopBarProps) {
  return (
    <header className="scroll-edge sticky top-0 z-20 border-b-2 border-transparent bg-white">
      <div className="mx-auto grid w-full max-w-[1080px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4 md:gap-5 md:px-8 md:pt-6 md:pb-4">
        <div className="flex items-center">{leading}</div>

        <div
          className={
            onOpenPanel ? "hidden min-w-0 flex-col gap-1.5 lg:flex" : "flex min-w-0 flex-col gap-1.5"
          }
        >
          <ProgressMeter answered={answered} total={total} />
          <p className="text-sm font-bold text-play-ink-muted">
            {answered}/{total} terjawab
          </p>
        </div>

        {onOpenPanel ? (
          <button
            type="button"
            onClick={onOpenPanel}
            aria-haspopup="dialog"
            className="-my-1 flex min-w-0 flex-col gap-1.5 rounded-xl px-2 py-1 text-left transition-colors hover:bg-play-polar focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-play-ink lg:hidden"
          >
            <ProgressMeter answered={answered} total={total} />
            <span className="flex items-center gap-1 text-sm font-bold whitespace-nowrap text-play-ink-muted">
              <LayoutGrid aria-hidden="true" className="size-4 shrink-0" />
              {answered}/{total}
              <span className="hidden min-[360px]:inline">· Daftar soal</span>
              <span className="sr-only min-[360px]:hidden">terjawab, buka daftar soal</span>
              <ChevronDown aria-hidden="true" className="size-4 shrink-0" />
            </span>
          </button>
        ) : null}

        <div className="flex items-center">{trailing}</div>
      </div>
    </header>
  );
}
