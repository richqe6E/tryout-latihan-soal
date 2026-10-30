"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { AnswerState, Difficulty } from "@/lib/tryout/types";

/**
 * Progres tryout yang tersimpan di perangkat (mock "sesi tersimpan").
 * Backend nanti menyimpan hal yang sama di tabel `answers` & `tryout_sessions`.
 */
export type SavedProgress = {
  sessionId: string;
  title: string;
  subjectId: string;
  subjectName: string;
  difficulty: Difficulty;
  totalQuestions: number;
  answers: Record<string, AnswerState>;
  /** Indeks soal terakhir yang dibuka. */
  lastIndex: number;
  /** Sisa waktu (detik) saat tryout dijeda; null jika sedang berjalan. */
  pausedRemaining: number | null;
  /** ISO timestamp terakhir disimpan. */
  savedAt: string;
};

const PREFIX = "tryout:";
const SUFFIX = ":progress";
const CHANGE_EVENT = "tryout-progress-change";
const SERVER = "__server__";

function progressKey(sessionId: string) {
  return `${PREFIX}${sessionId}${SUFFIX}`;
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function parse(raw: string | null): SavedProgress | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SavedProgress;
  } catch {
    return null;
  }
}

function safeGet(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Baca progres langsung (di luar render, mis. di dalam efek). */
export function readProgress(sessionId: string): SavedProgress | null {
  return parse(safeGet(progressKey(sessionId)));
}

export function writeProgress(progress: SavedProgress) {
  try {
    window.localStorage.setItem(progressKey(progress.sessionId), JSON.stringify(progress));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // Penyimpanan penuh/diblokir: tryout tetap jalan, hanya tidak bisa dilanjutkan.
  }
}

export function clearProgress(sessionId: string) {
  try {
    window.localStorage.removeItem(progressKey(sessionId));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // abaikan
  }
}

/** Progres satu sesi. `ready` false selama render server/hidrasi. */
export function useSavedProgress(sessionId: string) {
  const raw = useSyncExternalStore(
    subscribe,
    () => safeGet(progressKey(sessionId)),
    () => SERVER,
  );
  return useMemo(
    () => (raw === SERVER ? { ready: false, progress: null } : { ready: true, progress: parse(raw) }),
    [raw],
  );
}

function readAllRaw() {
  try {
    const entries: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(PREFIX) && key.endsWith(SUFFIX))
        entries.push(window.localStorage.getItem(key) ?? "");
    }
    // String gabungan sebagai snapshot yang stabil untuk useSyncExternalStore.
    return JSON.stringify(entries.sort());
  } catch {
    return "[]";
  }
}

/** Semua progres tersimpan di perangkat ini (untuk halaman Riwayat). */
export function useAllSavedProgress() {
  const raw = useSyncExternalStore(subscribe, readAllRaw, () => SERVER);
  return useMemo(() => {
    if (raw === SERVER) return { ready: false, items: [] as SavedProgress[] };
    const items = (JSON.parse(raw) as string[])
      .map(parse)
      .filter((item): item is SavedProgress => item !== null);
    return { ready: true, items };
  }, [raw]);
}
