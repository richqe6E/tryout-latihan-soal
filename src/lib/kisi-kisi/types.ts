import type { Difficulty } from "@/lib/tryout/types";

export type QuestionType = "pg" | "isian" | "uraian";
export type CognitiveLevel = "C1" | "C2" | "C3" | "C4";

export type VisualAssetId =
  | "math-fraction-3-8"
  | "math-pattern-blocks"
  | "ppkn-aturan-perpustakaan"
  | "ppkn-buang-sampah"
  | "ppkn-hak-rumah"
  | "ppkn-pos-kamling"
  | "ppkn-kerja-bakti";

export type KisiKisiOption = {
  text: string;
  isCorrect: boolean;
  explanation?: string;
};

export type KisiKisiQuestion = {
  /** Kode unik stabil, mis. "mtk-01" .. "mtk-25". */
  code: string;
  subjectSlug: string;
  /** Nomor urut soal dalam paket kisi-kisi (1..25 atau 1..35). */
  number: number;
  /** Bentuk soal sesuai dokumen kisi-kisi. */
  type: QuestionType;
  /** Label bentuk asli di dokumen jika perlu ditampilkan (mis. "Essay" / "Uraian Singkat"). */
  typeLabel?: string;
  /** Materi / Lingkup Materi / Tujuan Pembelajaran. */
  topic: string;
  /** Indikator soal persis / selaras dengan dokumen kisi-kisi. */
  indicator: string;
  /** Level kognitif C1-C4. */
  cognitiveLevel: CognitiveLevel;
  /** Pemetaan ke difficulty tryout-yuk agar mode acak/per tingkat tetap berjalan. */
  difficulty: Difficulty;
  /** Teks bacaan / cerita stimulus (opsional, dapat dipakai bersama oleh beberapa nomor). */
  stimulusTitle?: string;
  stimulusText?: string;
  /** ID gambar SVG hitam-putih ramah cetak (opsional). */
  visualAsset?: VisualAssetId;
  visualCaption?: string;
  /** Teks pertanyaan inti. */
  text: string;
  /** Pilihan ganda tepat 4 opsi (a, b, c, d). Kosong untuk isian & uraian. */
  options?: [KisiKisiOption, KisiKisiOption, KisiKisiOption, KisiKisiOption];
  /** Kunci jawaban resmi untuk Isian / Uraian (dan ringkasan jawaban). */
  expectedAnswer: string;
  /** Variasi kata/angka jawaban yang dianggap benar saat koreksi otomatis soal Isian. */
  acceptedAnswers?: string[];
  /** Pedoman penskoran / kata kunci penilaian untuk Uraian. */
  rubricNotes?: string;
  /** Pembahasan langkah demi langkah. */
  explanation: string;
};

export type KisiKisiSubjectMeta = {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  /** Contoh: "Kurikulum Merdeka" */
  curriculum: string;
  educationLevel: string;
  gradeSemester: string;
  schoolYear: string;
  regionHeader: string;
  totalQuestions: number;
  compositionLabel: string;
  durationMinutes: number;
};

export type KisiKisiSubjectPackage = {
  meta: KisiKisiSubjectMeta;
  questions: KisiKisiQuestion[];
};

export const DEFAULT_HEADER_CONFIG = {
  title: "LATIHAN SOAL KISI-KISI",
  subtitle: "ASESMEN SUMATIF AKHIR SEMESTER (ASAS) GANJIL",
  schoolYear: "TAHUN PELAJARAN 2026/2027",
  region: "KECAMATAN SAMBUTAN - KOTA SAMARINDA",
  educationLevel: "Sekolah Dasar (SD)",
  curriculum: "Kurikulum Merdeka",
  gradeSemester: "IV (Empat) / Ganjil",
} as const;
