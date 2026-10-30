"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { getSessionTimeAction } from "@/server/actions/tryout-actions";

const RESYNC_MS = 60_000;

/**
 * Sinkronkan timer dengan jam server. Mengembalikan deadline dari server, selisih jam
 * perangkat terhadap server (ms, diukur di titik tengah round-trip), dan `finished` bila
 * server sudah menutup sesi (waktu habis saat perangkat tidur, atau dikumpulkan di tab lain).
 */
export function useServerClock(sessionId: string, enabled: boolean, initialDeadline: string) {
  const [state, setState] = useState({
    deadline: initialDeadline,
    offsetMs: 0,
    synced: false,
    finished: false,
  });

  const sync = useEffectEvent(async () => {
    const sentAt = Date.now();
    const result = await getSessionTimeAction(sessionId);
    const receivedAt = Date.now();
    if (!result.ok) return;
    // Sesi dijeda: deadline di server belum digeser; biarkan alur resume yang menetapkannya.
    if (result.data.paused) return;
    const midpoint = sentAt + (receivedAt - sentAt) / 2;
    setState({
      deadline: result.data.deadline,
      offsetMs: new Date(result.data.serverNow).getTime() - midpoint,
      synced: true,
      finished: result.data.status === "selesai",
    });
  });

  /** Terapkan waktu server dari respons lain (mis. resume) yang diukur dengan `sentAt`/`receivedAt`. */
  const apply = (time: { deadline: string; serverNow: string }, sentAt: number, receivedAt: number) => {
    const midpoint = sentAt + (receivedAt - sentAt) / 2;
    setState({
      deadline: time.deadline,
      offsetMs: new Date(time.serverNow).getTime() - midpoint,
      synced: true,
      finished: false,
    });
  };

  useEffect(() => {
    if (!enabled) return;
    const first = window.setTimeout(() => void sync(), 0);
    const interval = window.setInterval(() => void sync(), RESYNC_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void sync();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, sessionId]);

  return { ...state, apply };
}
