import Link from "next/link";
import { Suspense } from "react";
import { BookOpenCheck, ChartLine, FileDown, History, Rocket, User } from "lucide-react";
import { Mascot } from "@/components/mascot";
import { PlayButton } from "@/components/ui/play-button";
import { StudentLoginForm } from "@/features/auth/student-login-form";
import { getCurrentUser } from "@/lib/user/data";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      <Mascot mood="proud" className="size-28" />
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
          <p className="mx-auto rounded-full bg-play-blue-soft px-3 py-1 text-xs font-black tracking-wide text-play-blue-ink uppercase">
            Kelas IV SD · Semester Ganjil 2026/2027
          </p>
          <h1 className="text-3xl font-black tracking-tight text-play-ink">
            Latihan Soal Kisi-Kisi
          </h1>
          <p className="text-base font-bold text-play-ink-muted">
            Belajar indikator kisi-kisi, kerjakan tryout (PG, Isian &amp; Uraian), serta unduh PDF Soal dan Kunci Jawaban terpisah.
          </p>
        </div>

        <section className="w-full rounded-2xl border-2 border-play-line bg-white p-5 shadow-xs">
          <StudentLoginForm compact />
        </section>

        <div className="flex w-full flex-col gap-3">
          <PlayButton tone="blue" block asChild>
            <Link href="/kisi-kisi">
              <FileDown aria-hidden="true" />
              Belajar Kisi-Kisi &amp; Unduh PDF
            </Link>
          </PlayButton>
        </div>
      </>
    );
  }

  const firstName = user.name.split(/\s+/)[0];
  return (
    <>
      <div className="flex flex-col gap-2">
        <p className="mx-auto rounded-full bg-play-green-soft px-3 py-1 text-xs font-black tracking-wide text-play-green-ink uppercase">
          Siswa Kelas IV SD · 5 Mata Pelajaran
        </p>
        <h1 className="text-3xl font-black tracking-tight text-play-ink">Hai, {firstName}!</h1>
        <p className="text-base font-bold text-play-ink-muted">
          Siap latihan kisi-kisi ulangan hari ini? Pilih menu di bawah ini.
        </p>
      </div>
      <nav aria-label="Menu utama" className="flex w-full flex-col gap-3">
        <PlayButton tone="green" block asChild>
          <Link href="/kisi-kisi">
            <BookOpenCheck aria-hidden="true" />
            Belajar Kisi-Kisi &amp; Unduh PDF
          </Link>
        </PlayButton>
        <PlayButton tone="blue" block asChild>
          <Link href="/mulai">
            <Rocket aria-hidden="true" />
            Mulai Tryout Online
          </Link>
        </PlayButton>
        <div className="grid grid-cols-2 gap-3">
          <PlayButton block asChild>
            <Link href="/riwayat">
              <History aria-hidden="true" />
              Riwayat Latihan
            </Link>
          </PlayButton>
          <PlayButton block asChild>
            <Link href="/nilai">
              <ChartLine aria-hidden="true" />
              Riwayat Nilai
            </Link>
          </PlayButton>
        </div>
        <PlayButton block asChild>
          <Link href="/akun">
            <User aria-hidden="true" />
            Profil ({firstName})
          </Link>
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
      <div className="mt-3 h-28 w-full animate-pulse rounded-2xl bg-play-polar" />
      <div className="h-[52px] w-full animate-pulse rounded-xl bg-play-polar" />
    </div>
  );
}
