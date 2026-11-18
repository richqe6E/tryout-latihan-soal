import type { jsPDF } from "jspdf";
import type { VisualAssetId } from "@/lib/kisi-kisi/types";

/**
 * Menggambar ilustrasi vektor monokrom tajam langsung ke dokumen jsPDF
 * agar hasil cetak A4 tidak pecah dan ramah printer hitam-putih.
 * Mengembalikan tinggi (mm) yang terpakai termasuk spasi bawah.
 */
export function drawPdfVisual(doc: jsPDF, assetId: VisualAssetId, x: number, y: number, maxWidth: number): number {
  const boxW = Math.min(76, maxWidth);
  const boxH = 34;
  const cx = x + boxW / 2;

  doc.setDrawColor(40);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, boxW, boxH, 1.5, 1.5, "S");

  switch (assetId) {
    case "math-fraction-3-8": {
      const centerX = cx;
      const centerY = y + boxH / 2;
      const r = 13;
      // Gambar 8 juring: 3 diarsir abu-abu
      for (let i = 0; i < 8; i++) {
        const a1 = ((i * 45 - 90) * Math.PI) / 180;
        const a2 = (((i + 1) * 45 - 90) * Math.PI) / 180;
        const steps = 8;
        const pts: [number, number][] = [[centerX, centerY]];
        for (let s = 0; s <= steps; s++) {
          const a = a1 + ((a2 - a1) * s) / steps;
          pts.push([centerX + r * Math.cos(a), centerY + r * Math.sin(a)]);
        }
        if (i < 3) {
          doc.setFillColor(180, 180, 180);
        } else {
          doc.setFillColor(255, 255, 255);
        }
        doc.setDrawColor(20);
        doc.setLineWidth(0.35);
        // Polygon draw in jsPDF via lines
        const deltas: [number, number][] = [];
        for (let k = 1; k < pts.length; k++) {
          deltas.push([pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]]);
        }
        doc.lines(deltas, pts[0][0], pts[0][1], [1, 1], "FD", true);
      }
      break;
    }

    case "math-pattern-blocks": {
      const baseLineY = y + 25;
      const size = 4;
      const stacks = [
        { ox: x + 8, count: 2, label: "Pola 1" },
        { ox: x + 25, count: 4, label: "Pola 2" },
        { ox: x + 42, count: 6, label: "Pola 3" },
      ];
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(0);
      for (const st of stacks) {
        for (let i = 0; i < st.count; i++) {
          const col = i % 2;
          const row = Math.floor(i / 2);
          doc.setFillColor(225, 225, 225);
          doc.setDrawColor(20);
          doc.setLineWidth(0.3);
          doc.rect(st.ox + col * size, baseLineY - (row + 1) * size, size, size, "FD");
        }
        doc.text(st.label, st.ox + size, y + 30.5, { align: "center" });
      }
      // Pola 4 (?)
      doc.setDrawColor(20);
      doc.setLineWidth(0.3);
      doc.rect(x + 58, y + 11, 11, 14, "S");
      doc.setFontSize(11);
      doc.text("?", x + 63.5, y + 20, { align: "center" });
      doc.setFontSize(7.5);
      doc.text("Pola 4", x + 63.5, y + 30.5, { align: "center" });
      break;
    }

    case "ppkn-aturan-perpustakaan": {
      doc.setDrawColor(20);
      doc.setLineWidth(0.3);
      // Rak buku kiri
      doc.rect(x + 4, y + 4, 15, 26, "S");
      doc.line(x + 4, y + 13, x + 19, y + 13);
      doc.line(x + 4, y + 22, x + 19, y + 22);
      for (let i = 0; i < 4; i++) {
        doc.setFillColor(i % 2 === 0 ? 210 : 255, i % 2 === 0 ? 210 : 255, i % 2 === 0 ? 210 : 255);
        doc.rect(x + 6 + i * 3, y + 6, 2.4, 7, "FD");
      }
      // Papan tata tertib
      doc.setFillColor(248, 248, 248);
      doc.rect(x + 22, y + 4, 50, 26, "FD");
      doc.line(x + 22, y + 10.5, x + 72, y + 10.5);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.2);
      doc.setTextColor(0);
      doc.text("TATA TERTIB RUANGAN", x + 47, y + 8.5, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.text("1. Harap tenang & dilarang berisik", x + 24.5, y + 15);
      doc.text("2. Dilarang membawa makanan", x + 24.5, y + 20);
      doc.text("3. Kembalikan buku ke rak semula", x + 24.5, y + 25);
      break;
    }

    case "ppkn-buang-sampah": {
      doc.setDrawColor(20);
      doc.setLineWidth(0.35);
      // Lantai
      doc.line(x + 4, y + 29, x + boxW - 4, y + 29);
      // Anak
      doc.circle(x + 20, y + 9, 3.2, "S");
      doc.line(x + 20, y + 12.2, x + 20, y + 21);
      doc.line(x + 20, y + 14.5, x + 27, y + 17.5);
      doc.line(x + 20, y + 14.5, x + 15, y + 18);
      doc.line(x + 20, y + 21, x + 17, y + 29);
      doc.line(x + 20, y + 21, x + 23, y + 29);
      // Sampah di tanah
      doc.setFillColor(200, 200, 200);
      doc.circle(x + 34, y + 27, 1.5, "FD");
      doc.rect(x + 37, y + 25.5, 3, 2.5, "FD");
      // Tempat sampah
      doc.setFillColor(245, 245, 245);
      doc.rect(x + 53, y + 15, 13, 14, "FD");
      doc.setFillColor(210, 210, 210);
      doc.rect(x + 52, y + 13, 15, 2.2, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6);
      doc.setTextColor(0);
      doc.text("SAMPAH", x + 59.5, y + 23, { align: "center" });
      break;
    }

    case "ppkn-hak-rumah": {
      doc.setDrawColor(20);
      doc.setLineWidth(0.35);
      // Atap & dinding rumah
      doc.line(x + 10, y + 13, cx, y + 3.5);
      doc.line(cx, y + 3.5, x + boxW - 10, y + 13);
      doc.line(x + 13, y + 12, x + 13, y + 30);
      doc.line(x + boxW - 13, y + 12, x + boxW - 13, y + 30);
      doc.line(x + 11, y + 30, x + boxW - 11, y + 30);
      // Meja makan
      doc.setFillColor(215, 215, 215);
      doc.rect(x + 26, y + 21, 24, 2, "FD");
      doc.line(x + 28, y + 23, x + 28, y + 30);
      doc.line(x + 48, y + 23, x + 48, y + 30);
      // Anggota keluarga
      doc.circle(x + 21, y + 16, 2.3, "S");
      doc.line(x + 21, y + 18.3, x + 21, y + 27);
      doc.circle(x + 55, y + 16, 2.3, "S");
      doc.line(x + 55, y + 18.3, x + 55, y + 27);
      doc.circle(cx, y + 15, 2.1, "S");
      doc.line(cx, y + 17.1, cx, y + 21);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.text("Keluarga di Rumah", cx, y + 10.5, { align: "center" });
      break;
    }

    case "ppkn-pos-kamling": {
      doc.setDrawColor(20);
      doc.setLineWidth(0.35);
      doc.line(x + 6, y + 30, x + boxW - 6, y + 30);
      // Atap & bangunan pos
      doc.line(x + 18, y + 12, cx, y + 4);
      doc.line(cx, y + 4, x + boxW - 18, y + 12);
      doc.rect(x + 21, y + 12, 34, 18, "S");
      doc.setFillColor(245, 245, 245);
      doc.rect(x + 25, y + 7.5, 26, 4.5, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(0);
      doc.text("POS KAMLING", cx, y + 10.8, { align: "center" });
      // Warga ronda & kentongan
      doc.setFillColor(210, 210, 210);
      doc.rect(x + 24, y + 14.5, 2.5, 6, "FD");
      doc.circle(x + 36, y + 18, 2.2, "S");
      doc.line(x + 36, y + 20.2, x + 36, y + 27);
      doc.circle(x + 45, y + 18, 2.2, "S");
      doc.line(x + 45, y + 20.2, x + 45, y + 27);
      doc.line(x + 30, y + 27, x + 51, y + 27);
      break;
    }

    case "ppkn-kerja-bakti": {
      doc.setDrawColor(20);
      doc.setLineWidth(0.3);
      doc.line(x + 5, y + 30, x + boxW - 5, y + 30);
      // Rumah kiri & kanan
      doc.rect(x + 8, y + 14, 13, 12, "S");
      doc.line(x + 7, y + 14, x + 14.5, y + 9);
      doc.line(x + 14.5, y + 9, x + 22, y + 14);
      doc.rect(x + 55, y + 14, 13, 12, "S");
      doc.line(x + 54, y + 14, x + 61.5, y + 9);
      doc.line(x + 61.5, y + 9, x + 69, y + 14);
      // Warga menyapu & keranjang sampah
      doc.circle(x + 31, y + 15, 2.3, "S");
      doc.line(x + 31, y + 17.3, x + 31, y + 25);
      doc.line(x + 31, y + 25, x + 29, y + 30);
      doc.line(x + 31, y + 25, x + 33, y + 30);
      doc.line(x + 34, y + 18, x + 37, y + 29);
      doc.circle(x + 47, y + 16, 2.1, "S");
      doc.line(x + 47, y + 18.1, x + 47, y + 25);
      doc.line(x + 47, y + 25, x + 45, y + 30);
      doc.line(x + 47, y + 25, x + 49, y + 30);
      doc.setFillColor(210, 210, 210);
      doc.rect(x + 39, y + 24.5, 5, 5.5, "FD");
      break;
    }
  }

  return boxH + 2;
}
