"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Deadline sesi disimpan di perangkat supaya timer tidak ter-reset saat halaman
 * di-refresh atau ditutup sebentar. Aturannya: deadline hanya boleh lebih awal,
 * tidak pernah mundur (refresh tidak menambah waktu).
 *
 * Backend nanti menjadi sumber kebenaran (started_at + duration_seconds);
 * penyimpanan lokal ini tetap berguna sebagai cadangan saat offline.
 */

const CHANGE_EVENT = "tryout-deadline-change";

function deadlineKey(sessionId: string) {
  return `tryout:${sessionId}:deadline`;
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function readStored(sessionId: string): string | null {
  try {
    return window.localStorage.getItem(deadlineKey(sessionId));
  } catch {
    return null;
  }
}

function earliest(a: string, b: string) {
  return new Date(a).getTime() <= new Date(b).getTime() ? a : b;
}

function resolveDeadline(stored: string | null, serverDeadline: string, startedAt: string) {
  // Deadline yang lebih tua dari waktu mulai sesi berasal dari percobaan lama → abaikan.
  const isValid = stored !== null && new Date(stored).getTime() > new Date(startedAt).getTime();
  return isValid ? earliest(stored, serverDeadline) : serverDeadline;
}

export function usePersistentDeadline(sessionId: string, serverDeadline: string, startedAt: string): string {
  const stored = useSyncExternalStore(
    subscribe,
    () => readStored(sessionId),
    () => null,
  );

  useEffect(() => {
    // Baca langsung dari storage: nilai render saat hidrasi masih null.
    const current = readStored(sessionId);
    const next = resolveDeadline(current, serverDeadline, startedAt);
    if (current === next) return;
    try {
      window.localStorage.setItem(deadlineKey(sessionId), next);
      window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch {
      // Penyimpanan penuh/diblokir: timer tetap jalan dari deadline server.
    }
  }, [sessionId, serverDeadline, startedAt]);

  return resolveDeadline(stored, serverDeadline, startedAt);
}

/**
 * Lanjutkan sesi yang dijeda: deadline baru = sekarang + sisa waktu saat dijeda
 * (tidak melewati deadline server).
 */
export function resumePersistentDeadline(
  sessionId: string,
  remainingSeconds: number,
  serverDeadline: string,
) {
  const next = earliest(new Date(Date.now() + remainingSeconds * 1000).toISOString(), serverDeadline);
  try {
    window.localStorage.setItem(deadlineKey(sessionId), next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // abaikan
  }
}

/** Hapus deadline tersimpan, mis. setelah jawaban dikumpulkan. */
export function clearPersistentDeadline(sessionId: string) {
  try {
    window.localStorage.removeItem(deadlineKey(sessionId));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // abaikan
  }
}
