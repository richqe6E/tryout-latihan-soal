"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, FileCheck2, FileText, Printer } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { QuestionVisual } from "@/components/question-visual";
import { PlayButton } from "@/components/ui/play-button";
import { downloadAnswerKeyPdf, downloadQuestionsPdf } from "@/features/pdf/generate-pdf";
import { DEFAULT_HEADER_CONFIG, type KisiKisiQuestion, type KisiKisiSubjectPackage } from "@/lib/kisi-kisi/types";

const LETTERS_LOWER = ["a", "b", "c", "d"] as const;
const LETTERS_UPPER = ["A", "B", "C", "D"] as const;

export function PrintPreviewScreen({ pkg }: { pkg: KisiKisiSubjectPackage }) {
  const [docKind, setDocKind] = useState<"soal" | "kunci">("soal");

  const pgQuestions = pkg.questions.filter((q) => q.type === "pg");
  const isianQuestions = pkg.questions.filter((q) => q.type === "isian");
  const uraianQuestions = pkg.questions.filter((q) => q.type === "uraian");

  const seenStimuli = new Set<string>();
  const takeNewStimulus = (q: KisiKisiQuestion) => {
    if (!q.stimulusText) return null;
    const key = q.stimulusTitle ?? q.stimulusText;
    if (seenStimuli.has(key)) return null;
    seenStimuli.add(key);
    return { title: q.stimulusTitle, text: q.stimulusText };
  };

  return (
    <div className="min-h-dvh bg-neutral-100 text-black print:bg-white">
      {/* Toolbar non-cetak */}
      <div className="sticky top-0 z-20 border-b border-neutral-300 bg-white px-4 py-3 print:hidden">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link
              href={`/kisi-kisi/${pkg.meta.slug}`}
              className="inline-flex size-10 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100"
              aria-label="Kembali"
            >
              <ArrowLeft aria-hidden="true" className="size-5" />
            </Link>
            <div className="flex rounded-xl border border-neutral-300 p-1">
              <button
                type="button"
                onClick={() => setDocKind("soal")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-bold",
                  docKind === "soal" ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100",
                )}
              >
                Lembar Soal
              </button>
              <button
                type="button"
                onClick={() => setDocKind("kunci")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-bold",
                  docKind === "kunci" ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100",
                )}
              >
                Kunci Jawaban (Terpisah)
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <PlayButton
              type="button"
              onClick={() => {
                if (docKind === "soal") {
                  downloadQuestionsPdf(pkg);
                  toast.success("PDF Soal berhasil diunduh");
                } else {
                  downloadAnswerKeyPdf(pkg);
                  toast.success("PDF Kunci Jawaban berhasil diunduh");
                }
              }}
              className="h-10 px-4 text-sm"
            >
              {docKind === "soal" ? (
                <FileText aria-hidden="true" className="size-4" />
              ) : (
                <FileCheck2 aria-hidden="true" className="size-4" />
              )}
              Unduh PDF {docKind === "soal" ? "Soal" : "Kunci Jawaban"}
            </PlayButton>
            <PlayButton
              type="button"
              tone="blue"
              onClick={() => window.print()}
              className="h-10 px-4 text-sm"
            >
              <Printer aria-hidden="true" className="size-4" />
              Cetak (Print)
            </PlayButton>
          </div>
        </div>
      </div>

      {/* Kertas A4 Hitam-Putih Formal */}
      <main className="mx-auto my-6 max-w-[210mm] bg-white px-[16mm] py-[14mm] font-serif text-[11pt] leading-[1.45] text-black shadow-sm print:my-0 print:max-w-none print:p-0 print:shadow-none">
        {/* Header / Kop Dokumen */}
        <header className="border-b-[3px] border-double border-black pb-2.5 text-center">
          <h1 className="text-[13.5pt] font-bold tracking-wide uppercase">
            {docKind === "soal"
              ? `${DEFAULT_HEADER_CONFIG.title} — ${pkg.meta.name}`
              : `KUNCI JAWABAN & PEMBAHASAN — ${DEFAULT_HEADER_CONFIG.title}`}
          </h1>
          <p className="text-[11.5pt] font-bold">TAHUN PELAJARAN {pkg.meta.schoolYear}</p>
          <p className="text-[10.5pt] font-bold">{pkg.meta.regionHeader}</p>
        </header>

        {/* Metadata 2 Kolom sesuai contoh PDF/Word */}
        <section className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-[10pt]">
          <p>
            <span className="inline-block w-36 font-bold">Satuan Pendidikan</span>: {pkg.meta.educationLevel}
          </p>
          <p>
            <span className="inline-block w-28 font-bold">Kurikulum</span>: {pkg.meta.curriculum}
          </p>
          <p>
            <span className="inline-block w-36 font-bold">Mata Pelajaran</span>: {pkg.meta.name}
          </p>
          <p>
            <span className="inline-block w-28 font-bold">Jumlah Soal</span>: {pkg.meta.totalQuestions} Butir Soal
          </p>
          <p>
            <span className="inline-block w-36 font-bold">Kelas / Semester</span>: {pkg.meta.gradeSemester}
          </p>
          <p>
            <span className="inline-block w-28 font-bold">Bentuk Soal</span>: {pkg.meta.compositionLabel}
          </p>
        </section>

        {docKind === "soal" ? (
          <>
            {/* Identitas Siswa */}
            <section className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 border border-black px-3 py-2 text-[10pt]">
              <p>
                <span className="inline-block w-28 font-bold">Nama Siswa</span>: ..........................................
              </p>
              <p>
                <span className="inline-block w-28 font-bold">Kelas / Absen</span>: IV / ...........................
              </p>
              <p>
                <span className="inline-block w-28 font-bold">Hari / Tanggal</span>: ..........................................
              </p>
              <p>
                <span className="inline-block w-28 font-bold">Waktu</span>: {pkg.meta.durationMinutes} Menit
              </p>
            </section>

            <p className="mt-2.5 border-b border-black pb-2 text-[9.5pt] italic">
              Petunjuk Umum: Berdoalah sebelum mengerjakan. Bacalah setiap soal dengan teliti dan tuliskan jawabanmu dengan rapi pada tempat yang tersedia.
            </p>

            {/* Bagian I: PG */}
            {pgQuestions.length > 0 ? (
              <section className="mt-4">
                <h2 className="text-[11pt] font-bold">I. PILIHAN GANDA</h2>
                <p className="mb-3 text-[9.5pt] italic">
                  Berilah tanda silang (X) pada huruf a, b, c, atau d di depan jawaban yang paling tepat!
                </p>
                <div className="flex flex-col gap-3.5">
                  {pgQuestions.map((q) => {
                    const stimulus = takeNewStimulus(q);
                    return (
                      <div key={q.code} className="break-inside-avoid">
                        {stimulus ? (
                          <div className="mb-3 border border-black bg-neutral-50 p-2.5 text-[10pt]">
                            <p className="font-bold">{stimulus.title ?? "Bacaan:"}</p>
                            <p className="mt-0.5">{stimulus.text}</p>
                          </div>
                        ) : null}
                        <div className="flex gap-2">
                          <span className="w-6 shrink-0 font-bold">{q.number}.</span>
                          <div className="flex-1">
                            <p className="whitespace-pre-line">{q.text}</p>
                            {q.visualAsset ? (
                              <QuestionVisual assetId={q.visualAsset} caption={q.visualCaption} compact />
                            ) : null}
                            {q.options ? (
                              <ol className="mt-1.5 flex flex-col gap-0.5 pl-1">
                                {q.options.map((opt, idx) => (
                                  <li key={idx} className="flex gap-2">
                                    <span className="w-5 shrink-0">{LETTERS_LOWER[idx]}.</span>
                                    <span>{opt.text}</span>
                                  </li>
                                ))}
                              </ol>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {/* Bagian II: Isian */}
            {isianQuestions.length > 0 ? (
              <section className="mt-6">
                <h2 className="text-[11pt] font-bold">II. ISIAN SINGKAT</h2>
                <p className="mb-3 text-[9.5pt] italic">
                  Isilah titik-titik atau tuliskan jawaban singkat yang tepat pada ruang yang tersedia!
                </p>
                <div className="flex flex-col gap-4">
                  {isianQuestions.map((q) => (
                    <div key={q.code} className="flex gap-2 break-inside-avoid">
                      <span className="w-6 shrink-0 font-bold">{q.number}.</span>
                      <div className="flex-1">
                        <p className="whitespace-pre-line">{q.text}</p>
                        {q.visualAsset ? (
                          <QuestionVisual assetId={q.visualAsset} caption={q.visualCaption} compact />
                        ) : null}
                        <p className="mt-2.5 border-b border-dotted border-black pb-1 text-[10pt]">
                          Jawaban:
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Bagian III: Uraian */}
            {uraianQuestions.length > 0 ? (
              <section className="mt-6">
                <h2 className="text-[11pt] font-bold">III. URAIAN / ESSAY</h2>
                <p className="mb-3 text-[9.5pt] italic">
                  Jawablah pertanyaan berikut dengan jelas dan lengkap pada garis yang disediakan!
                </p>
                <div className="flex flex-col gap-5">
                  {uraianQuestions.map((q) => (
                    <div key={q.code} className="flex gap-2 break-inside-avoid">
                      <span className="w-6 shrink-0 font-bold">{q.number}.</span>
                      <div className="flex-1">
                        <p className="whitespace-pre-line">{q.text}</p>
                        {q.visualAsset ? (
                          <QuestionVisual assetId={q.visualAsset} caption={q.visualCaption} compact />
                        ) : null}
                        <div className="mt-2 flex flex-col gap-5">
                          <span className="block border-b border-neutral-500 pt-3" />
                          <span className="block border-b border-neutral-500 pt-3" />
                          <span className="block border-b border-neutral-500 pt-3" />
                          <span className="block border-b border-neutral-500 pt-3" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : (
          /* DOKUMEN TERPISAH: KUNCI JAWABAN & PEMBAHASAN */
          <div className="mt-4 flex flex-col gap-5">
            {pgQuestions.length > 0 ? (
              <section>
                <h2 className="mb-2 text-[11pt] font-bold">I. KUNCI JAWABAN &amp; PEMBAHASAN PILIHAN GANDA</h2>
                <table className="w-full border-collapse border border-black text-[9.5pt]">
                  <thead>
                    <tr className="bg-neutral-200">
                      <th className="w-10 border border-black px-2 py-1 text-center">No</th>
                      <th className="w-14 border border-black px-2 py-1 text-center">Kunci</th>
                      <th className="border border-black px-2 py-1 text-left">Jawaban &amp; Pembahasan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pgQuestions.map((q) => {
                      const keyIdx = q.options ? q.options.findIndex((o) => o.isCorrect) : -1;
                      const letter = keyIdx >= 0 ? LETTERS_UPPER[keyIdx] : "-";
                      return (
                        <tr key={q.code} className="break-inside-avoid">
                          <td className="border border-black px-2 py-1 text-center font-bold">{q.number}</td>
                          <td className="border border-black px-2 py-1 text-center font-bold">{letter}</td>
                          <td className="border border-black px-2 py-1">
                            <span className="font-bold">
                              {keyIdx >= 0 && q.options ? q.options[keyIdx].text : q.expectedAnswer}.
                            </span>{" "}
                            {q.explanation}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            ) : null}

            {isianQuestions.length > 0 ? (
              <section>
                <h2 className="mb-2 text-[11pt] font-bold">II. KUNCI JAWABAN ISIAN SINGKAT</h2>
                <div className="flex flex-col gap-2 text-[10pt]">
                  {isianQuestions.map((q) => (
                    <div key={q.code} className="break-inside-avoid border-b border-neutral-300 pb-1.5">
                      <p>
                        <strong>{q.number}. Jawaban:</strong> {q.expectedAnswer}
                      </p>
                      <p className="pl-4 text-[9.5pt]">Pembahasan: {q.explanation}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {uraianQuestions.length > 0 ? (
              <section>
                <h2 className="mb-2 text-[11pt] font-bold">III. PEDOMAN JAWABAN URAIAN / ESSAY</h2>
                <div className="flex flex-col gap-3 text-[10pt]">
                  {uraianQuestions.map((q) => (
                    <div key={q.code} className="break-inside-avoid border border-black p-2.5">
                      <p className="font-bold">
                        {q.number}. {q.topic} (Level {q.cognitiveLevel})
                      </p>
                      <p className="mt-1 whitespace-pre-line">
                        <strong>Kunci Jawaban:</strong> {q.expectedAnswer}
                      </p>
                      {q.rubricNotes ? (
                        <p className="mt-1 text-[9.5pt] italic">Pedoman Penilaian: {q.rubricNotes}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}
