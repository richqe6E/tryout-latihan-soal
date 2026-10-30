"use client";

import { Switch as SwitchPrimitive } from "radix-ui";
import { cn } from "cn";

const QUICK_TIMES = ["06:00", "12:00", "19:00", "21:00"];

type ReminderControlProps = {
  enabled: boolean;
  time: string;
  onEnabledChange: (enabled: boolean) => void;
  onTimeChange: (time: string) => void;
};

/** Saklar pengingat harian + pilihan jam (WIB). */
export function ReminderControl({ enabled, time, onEnabledChange, onTimeChange }: ReminderControlProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 rounded-xl bg-play-polar px-4 py-3">
        <label htmlFor="reminder-switch" className="text-lg font-black">
          Ingatkan aku setiap hari
        </label>
        <SwitchPrimitive.Root
          id="reminder-switch"
          checked={enabled}
          onCheckedChange={onEnabledChange}
          aria-describedby="reminder-desc"
          className="relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border-2 border-play-line bg-play-line transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-play-ink data-[state=checked]:border-play-green-strong data-[state=checked]:bg-play-green-strong"
        >
          <SwitchPrimitive.Thumb className="block size-6 translate-x-0.5 rounded-full bg-white shadow-[0_2px_0_rgb(0_0_0/0.15)] transition-transform data-[state=checked]:translate-x-[26px]" />
        </SwitchPrimitive.Root>
      </div>

      <fieldset disabled={!enabled} className="flex flex-col gap-3 disabled:opacity-50">
        <legend className="mb-2 text-base font-black">Jam pengingat (WIB)</legend>
        <div className="flex flex-wrap items-center gap-2">
          {QUICK_TIMES.map((quick) => (
            <button
              key={quick}
              type="button"
              onClick={() => onTimeChange(quick)}
              aria-pressed={time === quick}
              className={cn(
                "press-3d rounded-xl border-solid px-3 py-2 text-base font-black tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-play-ink disabled:cursor-not-allowed",
                time === quick
                  ? "border-play-blue border-b-play-blue-strong bg-play-blue-soft text-play-blue-ink"
                  : "border-play-line bg-white text-play-ink hover:bg-play-polar",
              )}
            >
              {quick.replace(":", ".")}
            </button>
          ))}
          <label htmlFor="reminder-time" className="sr-only">
            Jam lainnya
          </label>
          <input
            id="reminder-time"
            type="time"
            value={time}
            onChange={(event) => event.target.value && onTimeChange(event.target.value)}
            className="h-11 rounded-xl border-2 border-b-4 border-play-line bg-play-polar px-3 text-base font-black text-play-ink tabular-nums outline-none focus-visible:border-play-blue focus-visible:bg-white disabled:cursor-not-allowed"
          />
        </div>
        <p className="text-sm font-bold text-play-ink-muted">
          {enabled
            ? `Kami akan mengingatkanmu setiap hari pukul ${time.replace(":", ".")} WIB.`
            : "Pengingat sedang mati."}
        </p>
      </fieldset>
    </div>
  );
}
