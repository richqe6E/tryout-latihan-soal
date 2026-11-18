import type { VisualAssetId } from "@/lib/kisi-kisi/types";

type QuestionVisualProps = {
  assetId: VisualAssetId;
  caption?: string;
  compact?: boolean;
};

/**
 * Ilustrasi SVG monokrom (hitam-putih) ramah layar dan ramah cetak untuk soal bergambar.
 */
export function QuestionVisual({ assetId, caption, compact = false }: QuestionVisualProps) {
  return (
    <figure className="my-2 flex flex-col items-center gap-1.5 rounded-xl border border-neutral-300 bg-white p-3 print:border-black">
      <div className={compact ? "w-full max-w-[260px]" : "w-full max-w-[340px]"}>
        <VisualSvg assetId={assetId} />
      </div>
      {caption ? (
        <figcaption className="text-center text-xs font-semibold text-neutral-600 print:text-black">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

function VisualSvg({ assetId }: { assetId: VisualAssetId }) {
  switch (assetId) {
    case "math-fraction-3-8": {
      // Lingkaran dibagi 8 juring sama besar, 3 juring diarsir abu-abu gelap/pola garis.
      const cx = 100;
      const cy = 75;
      const r = 60;
      const slices = Array.from({ length: 8 }, (_, idx) => {
        const a1 = ((idx * 45 - 90) * Math.PI) / 180;
        const a2 = (((idx + 1) * 45 - 90) * Math.PI) / 180;
        const x1 = cx + r * Math.cos(a1);
        const y1 = cy + r * Math.sin(a1);
        const x2 = cx + r * Math.cos(a2);
        const y2 = cy + r * Math.sin(a2);
        const shaded = idx < 3;
        return (
          <path
            key={idx}
            d={`M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`}
            fill={shaded ? "#9ca3af" : "#ffffff"}
            stroke="#111111"
            strokeWidth="2"
          />
        );
      });
      return (
        <svg viewBox="0 0 200 150" className="h-auto w-full" role="img" aria-label="Lingkaran pecahan 3 per 8">
          {slices}
        </svg>
      );
    }

    case "math-pattern-blocks": {
      // Pola 1: 2 persegi, Pola 2: 4 persegi, Pola 3: 6 persegi, Pola 4: ?
      const drawStack = (ox: number, count: number, label: string) => {
        const cols = 2;
        const size = 14;
        const rects = Array.from({ length: count }, (_, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          return (
            <rect
              key={i}
              x={ox + col * size}
              y={88 - (row + 1) * size}
              width={size}
              height={size}
              fill="#e5e7eb"
              stroke="#111111"
              strokeWidth="1.5"
            />
          );
        });
        return (
          <g key={label}>
            {rects}
            <text x={ox + size} y={108} textAnchor="middle" fontSize="10" fontWeight="700" fill="#111111">
              {label}
            </text>
          </g>
        );
      };

      return (
        <svg viewBox="0 0 260 120" className="h-auto w-full" role="img" aria-label="Pola susunan persegi">
          {drawStack(22, 2, "Pola 1")}
          {drawStack(80, 4, "Pola 2")}
          {drawStack(138, 6, "Pola 3")}
          <g>
            <rect x="196" y="46" width="38" height="42" fill="#ffffff" stroke="#111111" strokeDasharray="3 3" strokeWidth="1.5" />
            <text x="215" y="72" textAnchor="middle" fontSize="18" fontWeight="800" fill="#111111">
              ?
            </text>
            <text x="215" y="108" textAnchor="middle" fontSize="10" fontWeight="700" fill="#111111">
              Pola 4
            </text>
          </g>
        </svg>
      );
    }

    case "ppkn-aturan-perpustakaan":
      return (
        <svg viewBox="0 0 280 130" className="h-auto w-full" role="img" aria-label="Papan tata tertib ruang baca">
          {/* Rak buku kiri */}
          <rect x="14" y="18" width="56" height="94" fill="#ffffff" stroke="#111111" strokeWidth="2" />
          <line x1="14" y1="48" x2="70" y2="48" stroke="#111111" strokeWidth="1.5" />
          <line x1="14" y1="80" x2="70" y2="80" stroke="#111111" strokeWidth="1.5" />
          {[20, 28, 36, 46, 54].map((bx, i) => (
            <rect key={i} x={bx} y="24" width="6" height="24" fill={i % 2 === 0 ? "#d1d5db" : "#ffffff"} stroke="#111111" strokeWidth="1" />
          ))}
          {[20, 29, 38, 49].map((bx, i) => (
            <rect key={i} x={bx} y="54" width="7" height="26" fill={i % 2 === 1 ? "#d1d5db" : "#ffffff"} stroke="#111111" strokeWidth="1" />
          ))}
          {/* Papan peraturan */}
          <rect x="86" y="18" width="180" height="94" rx="4" fill="#f9fafb" stroke="#111111" strokeWidth="2" />
          <line x1="86" y1="40" x2="266" y2="40" stroke="#111111" strokeWidth="1.5" />
          <text x="176" y="33" textAnchor="middle" fontSize="11" fontWeight="800" fill="#111111">
            TATA TERTIB RUANGAN
          </text>
          <text x="98" y="57" fontSize="10" fontWeight="600" fill="#111111">
            1. Harap tenang &amp; dilarang berisik
          </text>
          <text x="98" y="75" fontSize="10" fontWeight="600" fill="#111111">
            2. Dilarang membawa makanan/minuman
          </text>
          <text x="98" y="93" fontSize="10" fontWeight="600" fill="#111111">
            3. Kembalikan buku ke rak semula
          </text>
        </svg>
      );

    case "ppkn-buang-sampah":
      return (
        <svg viewBox="0 0 280 130" className="h-auto w-full" role="img" aria-label="Anak membuang sampah sembarangan di dekat tempat sampah">
          {/* Lantai */}
          <line x1="12" y1="110" x2="268" y2="110" stroke="#111111" strokeWidth="2" />
          {/* Anak */}
          <circle cx="84" cy="36" r="12" fill="#ffffff" stroke="#111111" strokeWidth="2" />
          <line x1="84" y1="48" x2="84" y2="82" stroke="#111111" strokeWidth="2" />
          <line x1="84" y1="56" x2="108" y2="66" stroke="#111111" strokeWidth="2" />
          <line x1="84" y1="56" x2="66" y2="70" stroke="#111111" strokeWidth="2" />
          <line x1="84" y1="82" x2="72" y2="110" stroke="#111111" strokeWidth="2" />
          <line x1="84" y1="82" x2="96" y2="110" stroke="#111111" strokeWidth="2" />
          {/* Sampah jatuh di tanah */}
          <polygon points="122,96 132,92 138,104 124,106" fill="#d1d5db" stroke="#111111" strokeWidth="1.5" />
          <circle cx="148" cy="103" r="5" fill="#d1d5db" stroke="#111111" strokeWidth="1.5" />
          <path d="M 108 66 Q 124 72 128 90" fill="none" stroke="#111111" strokeDasharray="3 3" strokeWidth="1.5" />
          {/* Tempat sampah */}
          <polygon points="196,62 234,62 228,110 202,110" fill="#ffffff" stroke="#111111" strokeWidth="2" />
          <rect x="193" y="55" width="44" height="7" fill="#d1d5db" stroke="#111111" strokeWidth="1.5" />
          <text x="215" y="88" textAnchor="middle" fontSize="8" fontWeight="700" fill="#111111">
            SAMPAH
          </text>
        </svg>
      );

    case "ppkn-hak-rumah":
      return (
        <svg viewBox="0 0 280 130" className="h-auto w-full" role="img" aria-label="Suasana kasih sayang keluarga di meja makan rumah">
          {/* Atap rumah */}
          <polyline points="20,46 140,12 260,46" fill="none" stroke="#111111" strokeWidth="2" />
          <line x1="34" y1="44" x2="34" y2="116" stroke="#111111" strokeWidth="1.5" />
          <line x1="246" y1="44" x2="246" y2="116" stroke="#111111" strokeWidth="1.5" />
          <line x1="24" y1="116" x2="256" y2="116" stroke="#111111" strokeWidth="2" />
          {/* Meja makan */}
          <rect x="86" y="78" width="108" height="7" fill="#d1d5db" stroke="#111111" strokeWidth="1.5" />
          <line x1="94" y1="85" x2="94" y2="116" stroke="#111111" strokeWidth="2" />
          <line x1="186" y1="85" x2="186" y2="116" stroke="#111111" strokeWidth="2" />
          {/* Piring makanan */}
          <ellipse cx="140" cy="75" rx="14" ry="4" fill="#ffffff" stroke="#111111" strokeWidth="1.5" />
          {/* Orang tua & Anak */}
          <circle cx="72" cy="56" r="9" fill="#ffffff" stroke="#111111" strokeWidth="1.8" />
          <line x1="72" y1="65" x2="72" y2="100" stroke="#111111" strokeWidth="1.8" />
          <circle cx="208" cy="56" r="9" fill="#ffffff" stroke="#111111" strokeWidth="1.8" />
          <line x1="208" y1="65" x2="208" y2="100" stroke="#111111" strokeWidth="1.8" />
          <circle cx="140" cy="52" r="8" fill="#ffffff" stroke="#111111" strokeWidth="1.8" />
          <line x1="140" y1="60" x2="140" y2="75" stroke="#111111" strokeWidth="1.8" />
          {/* Simbol hati */}
          <path d="M 140 36 C 136 30, 128 32, 132 39 L 140 46 L 148 39 C 152 32, 144 30, 140 36 Z" fill="#d1d5db" stroke="#111111" strokeWidth="1.2" />
        </svg>
      );

    case "ppkn-pos-kamling":
      return (
        <svg viewBox="0 0 280 130" className="h-auto w-full" role="img" aria-label="Pos Kamling di lingkungan warga">
          <line x1="16" y1="114" x2="264" y2="114" stroke="#111111" strokeWidth="2" />
          {/* Bangunan Pos Kamling */}
          <polygon points="62,42 140,14 218,42" fill="#e5e7eb" stroke="#111111" strokeWidth="2" />
          <rect x="74" y="42" width="132" height="72" fill="#ffffff" stroke="#111111" strokeWidth="2" />
          <rect x="92" y="24" width="96" height="16" fill="#ffffff" stroke="#111111" strokeWidth="1.5" />
          <text x="140" y="36" textAnchor="middle" fontSize="10" fontWeight="800" fill="#111111">
            POS KAMLING
          </text>
          {/* Kentongan */}
          <line x1="88" y1="42" x2="88" y2="54" stroke="#111111" strokeWidth="1.5" />
          <rect x="83" y="54" width="10" height="22" rx="3" fill="#d1d5db" stroke="#111111" strokeWidth="1.5" />
          {/* Bangku & warga jaga */}
          <rect x="108" y="92" width="84" height="6" fill="#d1d5db" stroke="#111111" strokeWidth="1.5" />
          <circle cx="136" cy="64" r="9" fill="#ffffff" stroke="#111111" strokeWidth="1.8" />
          <line x1="136" y1="73" x2="136" y2="92" stroke="#111111" strokeWidth="1.8" />
          <circle cx="170" cy="64" r="9" fill="#ffffff" stroke="#111111" strokeWidth="1.8" />
          <line x1="170" y1="73" x2="170" y2="92" stroke="#111111" strokeWidth="1.8" />
          {/* Bulan sabit tanda malam */}
          <circle cx="242" cy="28" r="10" fill="#d1d5db" stroke="#111111" strokeWidth="1.5" />
          <circle cx="247" cy="25" r="8" fill="#ffffff" />
        </svg>
      );

    case "ppkn-kerja-bakti":
      return (
        <svg viewBox="0 0 280 130" className="h-auto w-full" role="img" aria-label="Warga kerja bakti membersihkan lingkungan kampung">
          {/* Rumah di latar */}
          <polygon points="24,48 56,28 88,48" fill="#e5e7eb" stroke="#111111" strokeWidth="1.5" />
          <rect x="30" y="48" width="52" height="44" fill="#ffffff" stroke="#111111" strokeWidth="1.5" />
          <polygon points="194,48 226,28 258,48" fill="#e5e7eb" stroke="#111111" strokeWidth="1.5" />
          <rect x="200" y="48" width="52" height="44" fill="#ffffff" stroke="#111111" strokeWidth="1.5" />
          {/* Jalan / tanah */}
          <line x1="14" y1="112" x2="266" y2="112" stroke="#111111" strokeWidth="2" />
          {/* Warga 1 memegang sapu */}
          <circle cx="106" cy="54" r="9" fill="#ffffff" stroke="#111111" strokeWidth="1.8" />
          <line x1="106" y1="63" x2="106" y2="92" stroke="#111111" strokeWidth="1.8" />
          <line x1="106" y1="92" x2="98" y2="112" stroke="#111111" strokeWidth="1.8" />
          <line x1="106" y1="92" x2="114" y2="112" stroke="#111111" strokeWidth="1.8" />
          <line x1="106" y1="72" x2="124" y2="84" stroke="#111111" strokeWidth="1.8" />
          <line x1="120" y1="66" x2="132" y2="110" stroke="#111111" strokeWidth="1.5" />
          <polygon points="127,106 138,106 141,112 125,112" fill="#d1d5db" stroke="#111111" strokeWidth="1.2" />
          {/* Warga 2 & anak mengangkat keranjang sampah */}
          <circle cx="170" cy="60" r="8" fill="#ffffff" stroke="#111111" strokeWidth="1.8" />
          <line x1="170" y1="68" x2="170" y2="94" stroke="#111111" strokeWidth="1.8" />
          <line x1="170" y1="94" x2="162" y2="112" stroke="#111111" strokeWidth="1.8" />
          <line x1="170" y1="94" x2="178" y2="112" stroke="#111111" strokeWidth="1.8" />
          <rect x="145" y="92" width="20" height="20" fill="#d1d5db" stroke="#111111" strokeWidth="1.5" />
        </svg>
      );
  }
}
