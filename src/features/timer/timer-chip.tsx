import { AlarmClock } from "lucide-react";
import { cn } from "cn";
import { getTimerLevel } from "./timer-level";
import { formatClock, formatSpokenDuration } from "@/lib/format";

type TimerChipProps = {
  /** Sisa detik; `null` saat belum diketahui (render server). */
  remaining: number | null;
  className?: string;
};

const LEVEL_TONE = {
  normal: "border-play-line bg-white text-play-ink",
  // `key` berganti saat level naik → animasi goyang diputar sekali.
  warning: "animate-nudge border-play-red bg-play-red-soft text-play-red-ink",
  critical: "animate-nudge border-play-red bg-play-red-soft text-play-red-ink [&_svg]:animate-pulse",
} as const;

/** Tampilan sisa waktu format menit:detik; berubah merah saat waktu hampir habis. */
export function TimerChip({ remaining, className }: TimerChipProps) {
  const level = getTimerLevel(remaining);

  return (
    <p
      key={level}
      role="timer"
      data-level={level}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-2 text-lg leading-none font-black tabular-nums transition-colors sm:gap-2 sm:text-xl",
        LEVEL_TONE[level],
        className,
      )}
    >
      <AlarmClock
        aria-hidden="true"
        className={cn("size-5 sm:size-6", level === "normal" ? "text-play-red" : "text-current")}
      />
      <span aria-hidden="true">{remaining === null ? "--:--" : formatClock(remaining)}</span>
      <span className="sr-only">
        {remaining === null ? "Menghitung sisa waktu" : `Sisa waktu ${formatSpokenDuration(remaining)}`}
      </span>
    </p>
  );
}
