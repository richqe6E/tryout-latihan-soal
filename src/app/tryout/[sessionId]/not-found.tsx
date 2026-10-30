import Link from "next/link";
import { Mascot } from "@/components/mascot";
import { PlayButton } from "@/components/ui/play-button";

export default function TryoutNotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
      <Mascot mood="worried" className="size-28" />
      <h1 className="text-2xl font-black text-play-ink">Tryout tidak ditemukan</h1>
      <p className="text-lg font-bold text-play-ink-muted">
        Sesi ini mungkin sudah dihapus atau tautannya salah.
      </p>
      <PlayButton tone="green" asChild>
        <Link href="/">Kembali ke beranda</Link>
      </PlayButton>
    </main>
  );
}
