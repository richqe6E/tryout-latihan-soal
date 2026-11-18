"use client";

import Link from "next/link";
import { useEffect } from "react";
import { PlayButton } from "@/components/ui/play-button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-5 px-6 py-10 text-center">
      <h1 className="text-2xl font-black text-play-ink">Ups, halaman mengalami gangguan</h1>
      <p className="text-sm font-bold text-play-ink-muted">
        Coba muat ulang halaman atau buka langsung daftar Kisi-Kisi &amp; Unduh PDF.
      </p>
      <div className="flex w-full flex-col gap-3">
        <PlayButton tone="green" block onClick={() => reset()}>
          Coba muat ulang
        </PlayButton>
        <PlayButton tone="blue" block asChild>
          <Link href="/kisi-kisi">Buka Kisi-Kisi &amp; PDF</Link>
        </PlayButton>
      </div>
    </main>
  );
}
