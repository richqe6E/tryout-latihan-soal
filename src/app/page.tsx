import Link from "next/link";
import { Suspense } from "react";
import { Mascot } from "@/components/mascot";
import { PlayButton } from "@/components/ui/play-button";
import { getCurrentUser } from "@/lib/user/data";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      <Mascot mood="proud" className="size-32" />
      <Suspense fallback={<HomeSkeleton />}>
        <HomeContent />
      </Suspense>
    </main>
  );
}

async function HomeContent() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-black tracking-tight text-play-ink">Tryout Yuk</h1>
          <p className="text-lg font-bold text-play-ink-muted">
            Latihan soal pilihan ganda dengan timer, langsung lihat nilai dan pembahasannya.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3">
          <PlayButton tone="green" block asChild>
            <Link href="/daftar">Daftar gratis</Link>
          </PlayButton>
          <PlayButton block asChild>
            <Link href="/masuk">Saya sudah punya akun</Link>
          </PlayButton>
        </div>
      </>
    );
  }

  const firstName = user.name.split(/\s+/)[0];
  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black tracking-tight text-play-ink">Hai, {firstName}!</h1>
        <p className="text-lg font-bold text-play-ink-muted">Siap latihan hari ini? Satu tryout dulu, yuk.</p>
      </div>
      <nav aria-label="Menu utama" className="flex w-full flex-col gap-3">
        <PlayButton tone="green" block asChild>
          <Link href="/mulai">Mulai tryout</Link>
        </PlayButton>
        <PlayButton block asChild>
          <Link href="/riwayat">Riwayat latihan</Link>
        </PlayButton>
        <PlayButton block asChild>
          <Link href="/nilai">Riwayat nilai</Link>
        </PlayButton>
        <PlayButton block asChild>
          <Link href="/akun">Akun saya</Link>
        </PlayButton>
      </nav>
    </>
  );
}

function HomeSkeleton() {
  return (
    <div aria-busy="true" aria-label="Memuat" className="flex w-full flex-col items-center gap-3">
      <div className="h-9 w-48 animate-pulse rounded-xl bg-play-polar" />
      <div className="h-6 w-64 animate-pulse rounded-xl bg-play-polar" />
      <div className="mt-3 h-[52px] w-full animate-pulse rounded-xl bg-play-polar" />
      <div className="h-[52px] w-full animate-pulse rounded-xl bg-play-polar" />
    </div>
  );
}
