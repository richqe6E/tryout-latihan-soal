"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  FileCheck2,
  FileText,
  LoaderCircle,
  Printer,
  Rocket,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { QuestionVisual } from "@/components/question-visual";
import { SubjectIcon } from "@/components/subject-icon";
import { PlayButton } from "@/components/ui/play-button";
import { downloadAnswerKeyPdf, downloadQuestionsPdf } from "@/features/pdf/generate-pdf";
import { DEFAULT_HEADER_CONFIG, type KisiKisiSubjectPackage, type QuestionType } from "@/lib/kisi-kisi/types";
import { startTryoutAction } from "@/server/actions/tryout-actions";

const TYPE_FILTERS: { id: "all" | QuestionType; label: string }[] = [
  { id: "all", label: "Semua Soal" },
  { id: "pg", label: "Pilihan Ganda (a–d)" },
  { id: "isian", label: "Isian" },
  { id: "uraian", label: "Uraian / Essay" },
];

const LETTERS_LOWER = ["a", "b", "c", "d"] as const;

export function KisiKisiDetailScreen({
  pkg,
  signedIn,
}: {
  pkg: KisiKisiSubjectPackage;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | QuestionType>("all");
  const [showKeys, setShowKeys] = useState(true);
  const [starting, startTransition] = useTransition();

  const visible =
    filter === "all" ? pkg.questions : pkg.questions.filter((question) => question.type === filter);

  const countByType = {
    all: pkg.questions.length,
    pg: pkg.questions.filter((q) => q.type === "pg").length,
    isian: pkg.questions.filter((q) => q.type === "isian").length,
    uraian: pkg.questions.filter((q) => q.type === "uraian").length,
  };

  const handleStartTryout = () => {
    if (!signedIn) {
      router.push(`/masuk?next=/kisi-kisi/${pkg.meta.slug}`);
      return;
    }
    startTransition(async () => {
      const result = await startTryoutAction({
        subjectSlug: pkg.meta.slug,
        difficulty: "sedang",
        mode: "kisi-kisi",
        questionCount: pkg.meta.totalQuestions,
        durationSeconds: pkg.meta.durationMinutes * 60,
      });
      if (!result.ok) {
        toast.error("Tryout belum bisa dimulai", { description: result.message });
        return;
      }
      router.push(`/tryout/${result.data.sessionId}`);
    });
  };

  return (
    <div className="flex min-h-dvh flex-col bg-white text-play-ink">
      <header className="mx-auto flex w-full max-w-4xl items-center gap-3 px-4 pt-4 md:px-8 md:pt-6">
        <Link
          href="/kisi-kisi"
          aria-label="Kembali ke daftar kisi-kisi"
          className="inline-flex size-12 items-center justify-center rounded-lg text-play-ink-muted transition-colors hover:bg-play-polar focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-play-ink"
        >
          <ArrowLeft aria-hidden="true" className="size-6" />
        </Link>
        <div className="flex min-w-0 items-center gap-3">
          <SubjectIcon subjectId={pkg.meta.slug} tile className="size-12" />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black tracking-tight md:text-3xl">
              {pkg.meta.name}
            </h1>
            <p className="truncate text-sm font-bold text-play-ink-muted">
              {DEFAULT_HEADER_CONFIG.title} · {pkg.meta.compositionLabel}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 pt-5 pb-14 md:px-8">
        {/* Ringkasan Format Kisi-Kisi & Tombol Aksi */}
        <section className="flex flex-col gap-4 rounded-2xl border-2 border-play-line bg-play-polar p-5">
          <div className="grid gap-2 text-sm font-bold sm:grid-cols-2">
            <p>
              <span className="text-play-ink-muted">Satuan Pendidikan:</span> {pkg.meta.educationLevel}
            </p>
            <p>
              <span className="text-play-ink-muted">Kurikulum:</span> {pkg.meta.curriculum}
            </p>
            <p>
              <span className="text-play-ink-muted">Kelas / Semester:</span> {pkg.meta.gradeSemester}
            </p>
            <p>
              <span className="text-play-ink-muted">Tahun Pelajaran:</span> {pkg.meta.schoolYear}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 border-t border-play-line pt-3">
            <PlayButton
              type="button"
              tone="green"
              disabled={starting}
              onClick={handleStartTryout}
              className="h-11 px-4 text-sm"
            >
              {starting ? (
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <Rocket aria-hidden="true" className="size-4" />
              )}
              {signedIn ? `Mulai Tryout (${pkg.meta.totalQuestions} Soal)` : "Masuk untuk Tryout"}
            </PlayButton>

            <PlayButton
              type="button"
              tone="blue"
              onClick={() => {
                downloadQuestionsPdf(pkg);
                toast.success("PDF Lembar Soal berhasil diunduh");
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
                toast.success("PDF Kunci Jawaban berhasil diunduh");
              }}
              className="h-11 px-4 text-sm"
            >
              <FileCheck2 aria-hidden="true" className="size-4" />
              Unduh PDF Kunci Jawaban
            </PlayButton>

            <PlayButton asChild className="h-11 px-4 text-sm">
              <Link href={`/cetak/${pkg.meta.slug}`}>
                <Printer aria-hidden="true" className="size-4" />
                Pratinjau Cetak A4
              </Link>
            </PlayButton>
          </div>
        </section>

        {/* Filter Bentuk Soal & Toggle Kunci Jawaban */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {TYPE_FILTERS.filter((f) => countByType[f.id] > 0).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={cn(
                  "press-3d inline-flex h-10 items-center gap-2 rounded-xl border-solid px-3 text-sm font-black transition-colors",
                  filter === item.id
                    ? "border-play-blue border-b-play-blue-strong bg-play-blue-soft text-play-blue-ink"
                    : "border-play-line bg-white text-play-ink-muted hover:bg-play-polar",
                )}
              >
                <span>{item.label}</span>
                <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs tabular-nums">
                  {countByType[item.id]}
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowKeys((prev) => !prev)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border-2 border-play-line bg-white px-3 text-sm font-black text-play-ink hover:bg-play-polar"
          >
            {showKeys ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
            {showKeys ? "Sembunyikan Kunci Jawaban" : "Tampilkan Kunci Jawaban"}
          </button>
        </div>

        {/* Daftar Soal & Indikator */}
        <div className="flex flex-col gap-4">
          {visible.map((q) => (
            <article
              key={q.code}
              className="flex flex-col gap-3 rounded-2xl border-2 border-play-line bg-white p-5"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase">
                <span className="rounded-lg bg-play-blue-soft px-2.5 py-1 text-play-blue-ink">
                  No. {q.number}
                </span>
                <span className="rounded-lg bg-play-polar px-2.5 py-1 text-play-ink">
                  {q.typeLabel ?? (q.type === "pg" ? "Pilihan Ganda" : q.type === "isian" ? "Isian" : "Uraian")}
                </span>
                <span className="rounded-lg bg-play-gold-soft px-2.5 py-1 text-play-gold-ink">
                  Level {q.cognitiveLevel}
                </span>
                <span className="text-play-ink-muted">· {q.topic}</span>
              </div>

              <p className="rounded-xl bg-play-polar px-3.5 py-2 text-sm font-bold text-play-ink-muted">
                <strong className="font-black text-play-ink">Indikator:</strong> {q.indicator}
              </p>

              {q.stimulusText ? (
                <div className="rounded-xl border border-play-line bg-neutral-50 p-3.5 text-sm leading-relaxed font-semibold text-play-ink">
                  <p className="mb-1 font-black">{q.stimulusTitle ?? "Bacaan:"}</p>
                  <p>{q.stimulusText}</p>
                </div>
              ) : null}

              {q.visualAsset ? <QuestionVisual assetId={q.visualAsset} caption={q.visualCaption} /> : null}

              <p className="whitespace-pre-line text-lg leading-relaxed font-bold text-play-ink">
                {q.text}
              </p>

              {q.options ? (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {q.options.map((opt, idx) => {
                    const highlight = showKeys && opt.isCorrect;
                    return (
                      <li
                        key={idx}
                        className={cn(
                          "flex items-start gap-2.5 rounded-xl border-2 px-3 py-2 text-sm font-bold",
                          highlight
                            ? "border-play-green bg-play-green-soft text-play-green-ink"
                            : "border-play-line bg-white text-play-ink",
                        )}
                      >
                        <span className="font-black">{LETTERS_LOWER[idx]}.</span>
                        <span>{opt.text}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : null}

              {showKeys ? (
                <div className="mt-1 rounded-xl border border-play-green bg-play-green-soft/60 p-3.5 text-sm">
                  <p className="font-black text-play-green-ink">
                    Kunci Jawaban: <span className="whitespace-pre-line font-bold text-play-ink">{q.expectedAnswer}</span>
                  </p>
                  {q.rubricNotes ? (
                    <p className="mt-1 font-bold text-play-ink-muted">
                      <strong className="font-black text-play-ink">Pedoman Skor:</strong> {q.rubricNotes}
                    </p>
                  ) : null}
                  <p className="mt-1 font-bold text-play-ink">
                    <strong className="font-black text-play-blue-ink">Pembahasan:</strong> {q.explanation}
                  </p>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
