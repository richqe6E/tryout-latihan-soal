/** Batas peringatan timer (detik). */
export const WARNING_SECONDS = 5 * 60;
export const CRITICAL_SECONDS = 60;

export type TimerLevel = "normal" | "warning" | "critical";

export function getTimerLevel(remaining: number | null): TimerLevel {
  if (remaining === null) return "normal";
  if (remaining <= CRITICAL_SECONDS) return "critical";
  if (remaining <= WARNING_SECONDS) return "warning";
  return "normal";
}
