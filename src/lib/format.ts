/** Zona waktu tetap supaya render server dan browser menghasilkan teks yang sama. */
const TIME_ZONE = "Asia/Jakarta";

const shortDate = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: TIME_ZONE });
const longDate = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: TIME_ZONE,
});
const clockTime = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

/** "28 Okt" */
export function formatShortDate(value: string | Date) {
  return shortDate.format(new Date(value));
}

/** "28 Oktober 2026" */
export function formatLongDate(value: string | Date) {
  return longDate.format(new Date(value));
}

const monthYear = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: TIME_ZONE });

/** "Oktober 2026" */
export function formatMonthYear(value: string | Date) {
  return monthYear.format(new Date(value));
}

const dateTime = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

/** "28 Okt, 14.05" */
export function formatDateTime(value: string | Date) {
  return dateTime.format(new Date(value));
}

/** "13.25" */
export function formatClockTime(value: string | Date) {
  return clockTime.format(new Date(value));
}

const relative = new Intl.RelativeTimeFormat("id-ID", { numeric: "auto" });

/** "20 jam yang lalu", "kemarin", "2 hari yang lalu" — relatif terhadap `now`. */
export function formatRelative(value: string | Date, now: number) {
  const diffSeconds = Math.round((new Date(value).getTime() - now) / 1000);
  const abs = Math.abs(diffSeconds);
  if (abs < 60) return relative.format(diffSeconds, "second");
  if (abs < 3600) return relative.format(Math.round(diffSeconds / 60), "minute");
  if (abs < 86400) return relative.format(Math.round(diffSeconds / 3600), "hour");
  return relative.format(Math.round(diffSeconds / 86400), "day");
}

/** Format menit:detik, mis. 05:09. Menit tidak dipecah ke jam (120 menit → 120:00). */
export function formatClock(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Kalimat untuk pembaca layar, mis. "12 menit 5 detik". */
export function formatSpokenDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds} detik`;
  return seconds === 0 ? `${minutes} menit` : `${minutes} menit ${seconds} detik`;
}
