"use client";

import type { TryoutSession } from "@/lib/tryout/types";
import { useSavedProgress } from "./progress-store";
import { TryoutScreen } from "./tryout-screen";
import { TryoutSkeleton } from "./tryout-skeleton";

/** Baca progres tersimpan di perangkat dulu, lalu buka tryout dari posisi terakhir. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function TryoutResume({ session }: { session: TryoutSession }) {
  const { ready, progress } = useSavedProgress(session.id);
  // Sesi database: server sudah menyimpan jawaban & posisi terakhir.
  if (UUID_PATTERN.test(session.id)) return <TryoutScreen session={session} saved={null} />;
  if (!ready) return <TryoutSkeleton />;
  return <TryoutScreen session={session} saved={progress} />;
}
