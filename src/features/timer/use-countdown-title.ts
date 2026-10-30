"use client";

import { useEffect } from "react";
import { getTimerLevel } from "./timer-level";
import { formatClock } from "@/lib/format";

/**
 * Saat waktu hampir habis, tampilkan sisa waktu di judul tab
 * supaya tetap terlihat walau pengguna sedang membuka tab lain.
 */
export function useCountdownTitle(remaining: number | null) {
  const level = getTimerLevel(remaining);
  const label = level === "normal" || remaining === null ? null : `⏰ ${formatClock(remaining)}`;

  useEffect(() => {
    if (!label) return;
    const original = document.title;
    document.title = `${label} · ${original.replace(/^⏰ \d+:\d{2} · /, "")}`;
    return () => {
      document.title = original;
    };
  }, [label]);
}
