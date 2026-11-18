"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen, FileCheck2, FileText, Printer } from "lucide-react";
import { toast } from "sonner";
import { SubjectIcon } from "@/components/subject-icon";
import { PlayButton } from "@/components/ui/play-button";
import { downloadAnswerKeyPdf, downloadQuestionsPdf } from "@/features/pdf/generate-pdf";
import { KISI_KISI_PACKAGES } from "@/lib/kisi-kisi";

export function KisiKisiCatalogScreen() {
  return (
    <div className="flex min-h-dvh flex-col bg-white text-play-ink">
      <header className="mx-auto flex w-full max-w-4xl items-center gap-3 px-4 pt-4 md:px-8 md:pt-6">
        <Link
          href="/"
          aria-label="Kembali ke beranda"
          className="inline-flex size-12 items-center justify-center rounded-lg text-play-ink-muted transition-colors hover:bg-play-polar focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-play-ink"
        >
          <ArrowLeft aria-hidden="true" className="size-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-black tracking-tight md:text-3xl">
            Belajar Kisi-Kisi &amp; Unduh PDF
          </h1>
          <p className="text-sm font-bold text-play-ink-muted">
            Kelas IV SD · Tahun Pelajaran 2026/2027 · Kecamatan Sambutan - Kota Samarinda
          </p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-4 pt-5 pb-12 md:px-8">
        <section className="rounded-2xl border-2 border-play-line bg-play-polar p-4 text-sm font-bold text-play-ink-muted">
          Pilih mata pelajaran di bawah untuk melihat pemetaan indikator soal, mempelajari soal &amp; pembahasan, mencoba tryout online, atau mengunduh <strong className="font-black text-play-ink">PDF Soal</strong> dan <strong className="font-black text-play-ink">PDF Kunci Jawaban secara terpisah</strong> siap cetak (A4 hitam-putih rapi).
        </section>

        <div className="grid gap-4">
          {KISI_KISI_PACKAGES.map((pkg) => (
            <article
              key={pkg.meta.slug}
              className="flex flex-col gap-4 rounded-2xl border-2 border-play-line bg-white p-5 transition-colors hover:border-play-blue"
            >
              <div className="flex items-start gap-4">
                <SubjectIcon subjectId={pkg.meta.slug} tile />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-black text-play-ink">{pkg.meta.name}</h2>
                    <span className="rounded-full bg-play-blue-soft px-2.5 py-0.5 text-xs font-black text-play-blue-ink">
                      {pkg.meta.totalQuestions} Soal
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm font-extrabold text-play-ink-muted">
                    {pkg.meta.compositionLabel}
                  </p>
                  <p className="mt-1 text-sm font-bold text-play-ink-muted">{pkg.meta.description}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2.5 border-t-2 border-play-polar pt-3">
                <PlayButton tone="green" asChild className="h-11 px-4 text-sm">
                  <Link href={`/kisi-kisi/${pkg.meta.slug}`}>
                    <BookOpen aria-hidden="true" className="size-4" />
                    Pelajari Kisi-Kisi &amp; Soal
                  </Link>
                </PlayButton>

                <PlayButton
                  type="button"
                  onClick={() => {
                    downloadQuestionsPdf(pkg);
                    toast.success(`PDF Soal ${pkg.meta.shortName} berhasil diunduh`);
                  }}
                  className="h-11 px-4 text-sm"
                >
                  <FileText aria-hidden="true" className="size-4" />
                  Unduh PDF Soal
                </PlayButton>

                <PlayButton
                  type="button"
                  onClick={() => {
                    downloadAnswerKeyPdf(pkg);
                    toast.success(`PDF Kunci Jawaban ${pkg.meta.shortName} berhasil diunduh`);
                  }}
                  className="h-11 px-4 text-sm"
                >
                  <FileCheck2 aria-hidden="true" className="size-4" />
                  Unduh PDF Kunci Jawaban
                </PlayButton>

                <PlayButton asChild className="h-11 px-4 text-sm">
                  <Link href={`/cetak/${pkg.meta.slug}`}>
                    <Printer aria-hidden="true" className="size-4" />
                    Pratinjau Cetak
                  </Link>
                </PlayButton>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
