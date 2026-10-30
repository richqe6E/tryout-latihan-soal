"use client";

import { useSyncExternalStore } from "react";

function subscribe(onTick: () => void) {
  const id = window.setInterval(onTick, 250);
  return () => window.clearInterval(id);
}

const getNowSeconds = () => Math.floor(Date.now() / 1000);
const getServerNow = () => null;

/**
 * Sisa detik menuju `deadline`. Bernilai `null` saat render di server
 * (waktu klien belum diketahui) supaya tidak terjadi hydration mismatch.
 * Dihitung dari jam perangkat setiap tick, jadi tetap akurat walau tab sempat tidur.
 */
export function useCountdown(deadline: string | Date, paused = false, offsetMs = 0): number | null {
  const nowSeconds = useSyncExternalStore(paused ? noopSubscribe : subscribe, getNowSeconds, getServerNow);
  if (nowSeconds === null) return null;
  // offsetMs: selisih jam server terhadap jam perangkat (dari useServerClock).
  const nowMs = nowSeconds * 1000 + offsetMs;
  return Math.max(0, Math.floor((new Date(deadline).getTime() - nowMs) / 1000));
}

function noopSubscribe() {
  return () => {};
}
