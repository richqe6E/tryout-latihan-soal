"use client";

import { useMemo, useSyncExternalStore } from "react";

/**
 * Lapisan optimistis hapus riwayat: ID sesi langsung disembunyikan di perangkat selagi server
 * menandai sesi terhapus (soft delete, bisa diurungkan). Data dari server sudah tidak memuat
 * sesi terhapus; daftar ini hanya menutup jeda sampai halaman dimuat ulang.
 */

const KEY = "tryout:hidden-history";
const CHANGE_EVENT = "tryout-hidden-history-change";
const SERVER = "__server__";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function readRaw() {
  try {
    return window.localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function readIds(): string[] {
  try {
    const parsed = JSON.parse(readRaw());
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeIds(ids: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify([...new Set(ids)]));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // abaikan
  }
}

export function hideSessions(ids: string[]) {
  writeIds([...readIds(), ...ids]);
}

export function unhideSessions(ids: string[]) {
  writeIds(readIds().filter((id) => !ids.includes(id)));
}

/** ID sesi yang sudah dihapus pengguna. `ready` false selama render server/hidrasi. */
export function useHiddenSessions() {
  const raw = useSyncExternalStore(subscribe, readRaw, () => SERVER);
  return useMemo(() => {
    if (raw === SERVER) return { ready: false, hidden: new Set<string>() };
    try {
      return { ready: true, hidden: new Set<string>(JSON.parse(raw) as string[]) };
    } catch {
      return { ready: true, hidden: new Set<string>() };
    }
  }, [raw]);
}
