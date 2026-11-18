"use client";

import { jsPDF } from "jspdf";
import { DEFAULT_HEADER_CONFIG, type KisiKisiQuestion, type KisiKisiSubjectPackage } from "@/lib/kisi-kisi/types";
import { drawPdfVisual } from "./pdf-visuals";

const PAGE_W = 210; // A4 width (mm)
const PAGE_H = 297; // A4 height (mm)
const MARGIN_X = 18;
const MARGIN_TOP = 16;
const MARGIN_BOTTOM = 16;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const LETTERS_LOWER = ["a", "b", "c", "d"] as const;
const LETTERS_UPPER = ["A", "B", "C", "D"] as const;

export type PdfExportOptions = {
  studentName?: string;
};

function sanitizeFileSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function drawHeader(doc: jsPDF, pkg: KisiKisiSubjectPackage, docKind: "SOAL" | "KUNCI"): number {
  let y = MARGIN_TOP;
  doc.setTextColor(0);

  // Judul utama mengikuti contoh format PDF/Word dengan judul diganti LATIHAN SOAL KISI-KISI
  doc.setFont("times", "bold");
  doc.setFontSize(12.5);
  const titleLine =
    docKind === "SOAL"
      ? `${DEFAULT_HEADER_CONFIG.title} — ${pkg.meta.name.toUpperCase()}`
      : `KUNCI JAWABAN & PEMBAHASAN — ${DEFAULT_HEADER_CONFIG.title}`;
  doc.text(titleLine, PAGE_W / 2, y, { align: "center" });
  y += 5;

  doc.setFontSize(11);
  doc.text(`TAHUN PELAJARAN ${pkg.meta.schoolYear}`, PAGE_W / 2, y, { align: "center" });
  y += 4.8;

  doc.setFontSize(10);
  doc.text(pkg.meta.regionHeader, PAGE_W / 2, y, { align: "center" });
  y += 3.5;

  // Garis ganda pemisah header layaknya naskah soal resmi sekolah
  doc.setDrawColor(0);
  doc.setLineWidth(0.7);
  doc.line(MARGIN_X, y, PAGE_W - MARGIN_X, y);
  doc.setLineWidth(0.2);
  doc.line(MARGIN_X, y + 1.1, PAGE_W - MARGIN_X, y + 1.1);
  y += 5.5;

  // Blok metadata 2 kolom sesuai contoh dokumen
  doc.setFontSize(9.5);
  const leftColX = MARGIN_X;
  const leftValX = MARGIN_X + 34;
  const rightColX = MARGIN_X + 94;
  const rightValX = MARGIN_X + 123;

  const metaRows: [string, string, string, string][] = [
    ["Satuan Pendidikan", `: ${pkg.meta.educationLevel}`, "Kurikulum", `: ${pkg.meta.curriculum}`],
    ["Mata Pelajaran", `: ${pkg.meta.name}`, "Jumlah Soal", `: ${pkg.meta.totalQuestions} Butir Soal`],
    ["Kelas / Semester", `: ${pkg.meta.gradeSemester}`, "Bentuk Soal", `: ${pkg.meta.compositionLabel}`],
  ];

  for (const [lKey, lVal, rKey, rVal] of metaRows) {
    doc.setFont("times", "bold");
    doc.text(lKey, leftColX, y);
    doc.text(rKey, rightColX, y);
    doc.setFont("times", "normal");
    doc.text(lVal, leftValX, y);
    doc.text(rVal, rightValX, y);
    y += 4.5;
  }

  y += 1;

  if (docKind === "SOAL") {
    // Kotak identitas siswa & petunjuk singkat untuk lembar soal cetak
    doc.setDrawColor(40);
    doc.setLineWidth(0.25);
    doc.rect(MARGIN_X, y, CONTENT_W, 13, "S");
    doc.setFont("times", "bold");
    doc.setFontSize(9);
    doc.text("Nama Siswa", MARGIN_X + 3, y + 5);
    doc.text("Kelas / No. Absen", MARGIN_X + 95, y + 5);
    doc.text("Hari / Tanggal", MARGIN_X + 3, y + 10.5);
    doc.text("Waktu", MARGIN_X + 95, y + 10.5);

    doc.setFont("times", "normal");
    doc.text(": ..................................................", MARGIN_X + 24, y + 5);
    doc.text(": IV / .........................", MARGIN_X + 124, y + 5);
    doc.text(": ..................................................", MARGIN_X + 24, y + 10.5);
    doc.text(`: ${pkg.meta.durationMinutes} Menit`, MARGIN_X + 124, y + 10.5);
    y += 16.5;

    doc.setFont("times", "italic");
    doc.setFontSize(8.8);
    doc.text(
      "Petunjuk: Berdoalah sebelum mengerjakan. Bacalah setiap soal dengan teliti dan tuliskan jawabanmu dengan rapi.",
      MARGIN_X,
      y,
    );
    y += 5;
  } else {
    doc.setDrawColor(0);
    doc.setLineWidth(0.25);
    doc.line(MARGIN_X, y, PAGE_W - MARGIN_X, y);
    y += 5;
  }

  return y;
}

function addPageNumbers(doc: jsPDF, label: string) {
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("times", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(70);
    doc.setDrawColor(180);
    doc.setLineWidth(0.2);
    doc.line(MARGIN_X, PAGE_H - 12, PAGE_W - MARGIN_X, PAGE_H - 12);
    doc.text(label, MARGIN_X, PAGE_H - 8);
    doc.text(`Halaman ${i} dari ${totalPages}`, PAGE_W - MARGIN_X, PAGE_H - 8, { align: "right" });
  }
}

function ensureSpace(doc: jsPDF, currentY: number, neededHeight: number): number {
  if (currentY + neededHeight <= PAGE_H - MARGIN_BOTTOM) return currentY;
  doc.addPage();
  return MARGIN_TOP;
}

function drawSectionHeading(doc: jsPDF, title: string, instruction: string, y: number): number {
  y = ensureSpace(doc, y, 16);
  doc.setTextColor(0);
  doc.setFont("times", "bold");
  doc.setFontSize(10.5);
  doc.text(title, MARGIN_X, y);
  y += 4.3;
  doc.setFont("times", "italic");
  doc.setFontSize(9);
  doc.text(instruction, MARGIN_X, y);
  y += 5;
  return y;
}

/**
 * Mengunduh PDF LEMBAR SOAL (terpisah dari kunci jawaban), berformat hitam-putih formal.
 */
export function downloadQuestionsPdf(pkg: KisiKisiSubjectPackage) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = drawHeader(doc, pkg, "SOAL");

  const pgQuestions = pkg.questions.filter((q) => q.type === "pg");
  const isianQuestions = pkg.questions.filter((q) => q.type === "isian");
  const uraianQuestions = pkg.questions.filter((q) => q.type === "uraian");

  const seenStimuli = new Set<string>();

  const renderStimulusIfNew = (q: KisiKisiQuestion) => {
    if (!q.stimulusText) return;
    const key = q.stimulusTitle ?? q.stimulusText;
    if (seenStimuli.has(key)) return;
    seenStimuli.add(key);

    doc.setFont("times", "normal");
    doc.setFontSize(9.5);
    const bodyLines = doc.splitTextToSize(q.stimulusText, CONTENT_W - 8) as string[];
    const boxH = 7 + bodyLines.length * 4.3 + 2;
    y = ensureSpace(doc, y, boxH + 4);

    doc.setDrawColor(40);
    doc.setFillColor(248, 248, 248);
    doc.setLineWidth(0.25);
    doc.rect(MARGIN_X, y, CONTENT_W, boxH, "FD");

    doc.setFont("times", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(0);
    doc.text(q.stimulusTitle ?? "Bacalah teks berikut dengan saksama:", MARGIN_X + 4, y + 4.8);

    doc.setFont("times", "normal");
    doc.text(bodyLines, MARGIN_X + 4, y + 9.5);
    y += boxH + 3.5;
  };

  // --- BAGIAN I: PILIHAN GANDA ---
  if (pgQuestions.length > 0) {
    y = drawSectionHeading(
      doc,
      "I. PILIHAN GANDA",
      "Berilah tanda silang (X) pada huruf a, b, c, atau d di depan jawaban yang paling tepat!",
      y,
    );

    for (const q of pgQuestions) {
      renderStimulusIfNew(q);

      doc.setFont("times", "normal");
      doc.setFontSize(10);
      const qLines = doc.splitTextToSize(q.text, CONTENT_W - 8) as string[];
      const optionHeights = (q.options ?? []).map((opt) => {
        const optLines = doc.splitTextToSize(opt.text, CONTENT_W - 16) as string[];
        return optLines.length * 4.4;
      });
      const visualH = q.visualAsset ? 38 : 0;
      const needed = qLines.length * 4.5 + visualH + optionHeights.reduce((a, b) => a + b, 0) + 6;
      y = ensureSpace(doc, y, needed);

      doc.setTextColor(0);
      doc.setFont("times", "bold");
      doc.text(`${q.number}.`, MARGIN_X, y);
      doc.setFont("times", "normal");
      doc.text(qLines, MARGIN_X + 7, y);
      y += qLines.length * 4.5 + 1.2;

      if (q.visualAsset) {
        y += drawPdfVisual(doc, q.visualAsset, MARGIN_X + 7, y, CONTENT_W - 10);
      }

      if (q.options) {
        q.options.forEach((opt, idx) => {
          const optLines = doc.splitTextToSize(opt.text, CONTENT_W - 16) as string[];
          doc.setFont("times", "normal");
          doc.text(`${LETTERS_LOWER[idx]}.`, MARGIN_X + 7, y);
          doc.text(optLines, MARGIN_X + 13, y);
          y += optLines.length * 4.4;
        });
      }
      y += 2.8;
    }
    y += 2;
  }

  // --- BAGIAN II: ISIAN ---
  if (isianQuestions.length > 0) {
    y = drawSectionHeading(
      doc,
      "II. ISIAN SINGKAT",
      "Isilah titik-titik atau tuliskan jawaban singkat yang tepat pada ruang yang tersedia!",
      y,
    );

    for (const q of isianQuestions) {
      renderStimulusIfNew(q);

      doc.setFont("times", "normal");
      doc.setFontSize(10);
      const qLines = doc.splitTextToSize(q.text, CONTENT_W - 8) as string[];
      const visualH = q.visualAsset ? 38 : 0;
      const needed = qLines.length * 4.5 + visualH + 11;
      y = ensureSpace(doc, y, needed);

      doc.setFont("times", "bold");
      doc.text(`${q.number}.`, MARGIN_X, y);
      doc.setFont("times", "normal");
      doc.text(qLines, MARGIN_X + 7, y);
      y += qLines.length * 4.5 + 1.5;

      if (q.visualAsset) {
        y += drawPdfVisual(doc, q.visualAsset, MARGIN_X + 7, y, CONTENT_W - 10);
      }

      // Ruang jawaban isian
      doc.setFont("times", "normal");
      doc.setFontSize(9.5);
      doc.text("Jawaban:", MARGIN_X + 7, y + 3.5);
      doc.setDrawColor(90);
      doc.setLineDashPattern([0.8, 1.2], 0);
      doc.line(MARGIN_X + 23, y + 4, PAGE_W - MARGIN_X, y + 4);
      doc.setLineDashPattern([], 0);
      y += 9;
    }
    y += 2;
  }

  // --- BAGIAN III: URAIAN ---
  if (uraianQuestions.length > 0) {
    y = drawSectionHeading(
      doc,
      "III. URAIAN / ESSAY",
      "Jawablah pertanyaan berikut ini dengan jelas dan lengkap pada garis yang disediakan!",
      y,
    );

    for (const q of uraianQuestions) {
      renderStimulusIfNew(q);

      doc.setFont("times", "normal");
      doc.setFontSize(10);
      const qLines = doc.splitTextToSize(q.text, CONTENT_W - 8) as string[];
      const visualH = q.visualAsset ? 38 : 0;
      const lineCount = 4;
      const needed = qLines.length * 4.5 + visualH + lineCount * 6.5 + 6;
      y = ensureSpace(doc, y, needed);

      doc.setFont("times", "bold");
      doc.text(`${q.number}.`, MARGIN_X, y);
      doc.setFont("times", "normal");
      doc.text(qLines, MARGIN_X + 7, y);
      y += qLines.length * 4.5 + 2;

      if (q.visualAsset) {
        y += drawPdfVisual(doc, q.visualAsset, MARGIN_X + 7, y, CONTENT_W - 10);
      }

      // Ruang tulis jawaban uraian (4 baris)
      doc.setDrawColor(120);
      doc.setLineWidth(0.2);
      for (let line = 0; line < lineCount; line++) {
        y += 6.2;
        doc.line(MARGIN_X + 7, y, PAGE_W - MARGIN_X, y);
      }
      y += 4.5;
    }
  }

  addPageNumbers(doc, `${DEFAULT_HEADER_CONFIG.title} · ${pkg.meta.name} (Lembar Soal)`);
  doc.save(`Soal-Kisi-Kisi-${sanitizeFileSlug(pkg.meta.name)}-Kelas-4.pdf`);
}

/**
 * Mengunduh PDF KUNCI JAWABAN & PEMBAHASAN (file terpisah dari lembar soal).
 */
export function downloadAnswerKeyPdf(pkg: KisiKisiSubjectPackage) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = drawHeader(doc, pkg, "KUNCI");

  const pgQuestions = pkg.questions.filter((q) => q.type === "pg");
  const isianQuestions = pkg.questions.filter((q) => q.type === "isian");
  const uraianQuestions = pkg.questions.filter((q) => q.type === "uraian");

  // --- BAGIAN I: KUNCI PILIHAN GANDA ---
  if (pgQuestions.length > 0) {
    y = drawSectionHeading(
      doc,
      "I. KUNCI JAWABAN PILIHAN GANDA",
      "Ringkasan kunci jawaban beserta pembahasan singkat per nomor soal.",
      y,
    );

    // Tabel ringkas kunci PG (2 kolom agar hemat kertas)
    const half = Math.ceil(pgQuestions.length / 2);
    const rowH = 5.6;
    const tableNeeded = (half + 1) * rowH + 4;
    y = ensureSpace(doc, y, tableNeeded);

    const colW = (CONTENT_W - 4) / 2;
    for (let col = 0; col < 2; col++) {
      const ox = MARGIN_X + col * (colW + 4);
      doc.setFillColor(235, 235, 235);
      doc.setDrawColor(40);
      doc.setLineWidth(0.25);
      doc.rect(ox, y, colW, rowH, "FD");
      doc.setFont("times", "bold");
      doc.setFontSize(8.8);
      doc.text("No", ox + 4, y + 3.9, { align: "center" });
      doc.text("Kunci", ox + 15, y + 3.9, { align: "center" });
      doc.text("Jawaban Singkat", ox + 25, y + 3.9);
    }
    y += rowH;

    for (let r = 0; r < half; r++) {
      for (let col = 0; col < 2; col++) {
        const q = pgQuestions[r + col * half];
        if (!q) continue;
        const ox = MARGIN_X + col * (colW + 4);
        const keyIdx = q.options ? q.options.findIndex((o) => o.isCorrect) : -1;
        const keyLetter = keyIdx >= 0 ? LETTERS_UPPER[keyIdx] : "-";
        const keyText = keyIdx >= 0 && q.options ? q.options[keyIdx].text : q.expectedAnswer;
        const clipped = doc.splitTextToSize(keyText, colW - 26)[0] ?? "";

        doc.setDrawColor(120);
        doc.setLineWidth(0.2);
        doc.rect(ox, y, colW, rowH, "S");
        doc.setFont("times", "bold");
        doc.setFontSize(8.5);
        doc.text(`${q.number}.`, ox + 4, y + 3.9, { align: "center" });
        doc.text(keyLetter, ox + 15, y + 3.9, { align: "center" });
        doc.setFont("times", "normal");
        doc.text(clipped, ox + 25, y + 3.9);
      }
      y += rowH;
    }
    y += 5;

    // Pembahasan PG
    y = ensureSpace(doc, y, 12);
    doc.setFont("times", "bold");
    doc.setFontSize(9.5);
    doc.text("Pembahasan Pilihan Ganda:", MARGIN_X, y);
    y += 4.5;

    for (const q of pgQuestions) {
      const keyIdx = q.options ? q.options.findIndex((o) => o.isCorrect) : -1;
      const keyLetter = keyIdx >= 0 ? LETTERS_UPPER[keyIdx] : "-";
      const text = `${q.number}. [${keyLetter}] ${q.explanation}`;
      doc.setFont("times", "normal");
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(text, CONTENT_W) as string[];
      y = ensureSpace(doc, y, lines.length * 4 + 2);
      doc.text(lines, MARGIN_X, y);
      y += lines.length * 4 + 1.5;
    }
    y += 3;
  }

  // --- BAGIAN II: KUNCI ISIAN ---
  if (isianQuestions.length > 0) {
    y = drawSectionHeading(
      doc,
      "II. KUNCI JAWABAN ISIAN SINGKAT",
      "Jawaban benar beserta catatan pembahasan.",
      y,
    );

    for (const q of isianQuestions) {
      doc.setFont("times", "bold");
      doc.setFontSize(9.5);
      const ansLines = doc.splitTextToSize(`${q.number}. Jawaban: ${q.expectedAnswer}`, CONTENT_W) as string[];
      doc.setFont("times", "normal");
      doc.setFontSize(9);
      const expLines = doc.splitTextToSize(`Pembahasan: ${q.explanation}`, CONTENT_W - 6) as string[];
      y = ensureSpace(doc, y, (ansLines.length + expLines.length) * 4.2 + 3);

      doc.setFont("times", "bold");
      doc.setFontSize(9.5);
      doc.text(ansLines, MARGIN_X, y);
      y += ansLines.length * 4.2;

      doc.setFont("times", "normal");
      doc.setFontSize(9);
      doc.text(expLines, MARGIN_X + 5, y);
      y += expLines.length * 4 + 2.5;
    }
    y += 3;
  }

  // --- BAGIAN III: KUNCI URAIAN ---
  if (uraianQuestions.length > 0) {
    y = drawSectionHeading(
      doc,
      "III. PEDOMAN JAWABAN URAIAN / ESSAY",
      "Contoh jawaban lengkap dan poin penilaian untuk guru atau orang tua.",
      y,
    );

    for (const q of uraianQuestions) {
      doc.setFont("times", "bold");
      doc.setFontSize(9.5);
      const headLines = doc.splitTextToSize(`${q.number}. ${q.topic} (${q.cognitiveLevel})`, CONTENT_W) as string[];
      doc.setFont("times", "normal");
      doc.setFontSize(9.2);
      const ansLines = doc.splitTextToSize(`Kunci Jawaban:\n${q.expectedAnswer}`, CONTENT_W - 6) as string[];
      const rubricLines = q.rubricNotes
        ? (doc.splitTextToSize(`Pedoman Penilaian: ${q.rubricNotes}`, CONTENT_W - 6) as string[])
        : [];
      const needed = (headLines.length + ansLines.length + rubricLines.length) * 4.2 + 5;
      y = ensureSpace(doc, y, needed);

      doc.setFont("times", "bold");
      doc.setFontSize(9.5);
      doc.text(headLines, MARGIN_X, y);
      y += headLines.length * 4.2 + 0.8;

      doc.setFont("times", "normal");
      doc.setFontSize(9.2);
      doc.text(ansLines, MARGIN_X + 5, y);
      y += ansLines.length * 4.1 + 1;

      if (rubricLines.length > 0) {
        doc.setFont("times", "italic");
        doc.setFontSize(8.8);
        doc.text(rubricLines, MARGIN_X + 5, y);
        y += rubricLines.length * 4 + 1;
      }
      y += 3;
    }
  }

  addPageNumbers(doc, `${DEFAULT_HEADER_CONFIG.title} · ${pkg.meta.name} (Kunci Jawaban)`);
  doc.save(`Kunci-Jawaban-Kisi-Kisi-${sanitizeFileSlug(pkg.meta.name)}-Kelas-4.pdf`);
}
