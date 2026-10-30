import type { Difficulty, Subject } from "@/lib/tryout/types";

/**
 * Data tiruan bank soal (frontend-first). Bentuknya meniru tabel
 * `subjects`, `questions`, dan `options` supaya mudah diganti query database.
 */

export type BankOption = {
  id: string;
  text: string;
  isCorrect: boolean;
  /** Catatan pembahasan pilihan ini (mis. kesalahan umum yang menghasilkan pengecoh ini). */
  explanation?: string;
};

export type BankQuestion = {
  id: string;
  subjectId: string;
  difficulty: Difficulty;
  text: string;
  explanation: string;
  options: BankOption[];
};

export const SUBJECTS: Subject[] = [
  {
    id: "matematika",
    name: "Matematika",
    description: "Aljabar, aritmetika, geometri, dan peluang dasar.",
  },
  {
    id: "bahasa-indonesia",
    name: "Bahasa Indonesia",
    description: "Ejaan, kosakata, kalimat efektif, dan gagasan paragraf.",
  },
  {
    id: "bahasa-inggris",
    name: "Bahasa Inggris",
    description: "Grammar, vocabulary, dan struktur kalimat.",
  },
  {
    id: "ipa",
    name: "IPA",
    description: "Fisika, biologi, dan ilmu bumi dasar.",
  },
];

const LETTERS = ["a", "b", "c", "d", "e"];

/** Buat satu soal bank dari daftar teks pilihan (dipakai juga oleh data seed tambahan). */
export function q(
  id: string,
  subjectId: string,
  difficulty: Difficulty,
  text: string,
  options: string[],
  correctIndex: number,
  explanation: string,
  /** Catatan per pilihan, dikunci indeks (0 = A). */
  notes: Partial<Record<number, string>> = {},
): BankQuestion {
  return {
    id,
    subjectId,
    difficulty,
    text,
    explanation,
    options: options.map((optionText, index) => ({
      id: `${id}-${LETTERS[index]}`,
      text: optionText,
      isCorrect: index === correctIndex,
      ...(notes[index] ? { explanation: notes[index] } : {}),
    })),
  };
}

export const QUESTION_BANK: BankQuestion[] = [
  q(
    "mtk-001",
    "matematika",
    "sedang",
    "Jika 2x + 5 = 17, berapakah nilai x?",
    ["4", "5", "6", "7", "8"],
    2,
    "Kurangi kedua ruas dengan 5 sehingga 2x = 12, lalu bagi dengan 2: x = 6.",
    {
      0: "Cek dengan substitusi: 2 × 4 + 5 = 13, bukan 17.",
      3: "Cek dengan substitusi: 2 × 7 + 5 = 19, bukan 17.",
      4: "Cek dengan substitusi: 2 × 8 + 5 = 21, bukan 17.",
    },
  ),
  q(
    "mtk-002",
    "matematika",
    "sedang",
    "Hasil dari 3/4 + 2/3 adalah …",
    ["5/7", "17/12", "5/12", "6/7", "1/2"],
    1,
    "Samakan penyebut menjadi 12: 3/4 = 9/12 dan 2/3 = 8/12. Jumlahnya 17/12.",
    {
      0: "5/7 didapat dari menjumlahkan pembilang dan penyebut langsung (3+2)/(4+3). Penyebut harus disamakan dulu.",
      2: "5/12 memakai penyebut 12 tapi pembilangnya belum dikalikan.",
    },
  ),
  q(
    "mtk-003",
    "matematika",
    "sedang",
    "Sebuah baju seharga Rp150.000 mendapat diskon 20%. Berapa harganya setelah diskon?",
    ["Rp110.000", "Rp120.000", "Rp125.000", "Rp130.000", "Rp135.000"],
    1,
    "Diskon 20% dari Rp150.000 adalah Rp30.000, jadi harga akhirnya Rp150.000 − Rp30.000 = Rp120.000.",
    {
      3: "Rp130.000 sama dengan diskon Rp20.000 — itu 20 ribu, bukan 20 persen.",
      4: "Rp135.000 adalah potongan 10%, bukan 20%.",
    },
  ),
  q(
    "mtk-004",
    "matematika",
    "sedang",
    "Rata-rata dari 6, 8, 10, 12, dan 14 adalah …",
    ["8", "9", "10", "11", "12"],
    2,
    "Jumlahkan semua data: 6 + 8 + 10 + 12 + 14 = 50. Bagi dengan banyak data (5): 50 ÷ 5 = 10.",
    {
      0: "8 adalah rata-rata tiga data pertama saja (6, 8, 10). Semua data harus ikut dijumlahkan.",
      4: "12 adalah rata-rata tiga data terakhir saja (10, 12, 14). Semua data harus ikut dijumlahkan.",
    },
  ),
  q(
    "mtk-005",
    "matematika",
    "sedang",
    "Nilai dari 2⁵ − 3² adalah …",
    ["21", "23", "25", "27", "29"],
    1,
    "2⁵ = 32 dan 3² = 9, sehingga 32 − 9 = 23.",
    {
      4: "29 muncul bila 3² dianggap 3, sehingga 32 − 3. Ingat 3² = 3 × 3 = 9.",
    },
  ),
  q(
    "mtk-006",
    "matematika",
    "sedang",
    "Sebuah persegi panjang memiliki panjang 12 cm dan lebar 7 cm. Berapa kelilingnya?",
    ["19 cm", "26 cm", "38 cm", "42 cm", "84 cm"],
    2,
    "Keliling persegi panjang = 2 × (panjang + lebar) = 2 × (12 + 7) = 38 cm.",
    {
      0: "19 cm hanya panjang + lebar; keliling mengelilingi keempat sisi, jadi dikali 2.",
      4: "84 cm adalah luas (12 × 7) dalam cm², bukan keliling.",
    },
  ),
  q(
    "mtk-007",
    "matematika",
    "sedang",
    "Jika f(x) = 3x − 4, maka nilai f(5) adalah …",
    ["9", "10", "11", "12", "19"],
    2,
    "Substitusi x = 5: f(5) = 3 × 5 − 4 = 15 − 4 = 11.",
    {
      4: "19 muncul bila 4 ditambahkan: 3 × 5 + 4. Rumusnya dikurangi 4.",
    },
  ),
  q(
    "mtk-008",
    "matematika",
    "sedang",
    "Akar-akar persamaan x² − 5x + 6 = 0 adalah …",
    ["1 dan 6", "2 dan 3", "−2 dan −3", "−1 dan 6", "3 dan 4"],
    1,
    "Faktorkan menjadi (x − 2)(x − 3) = 0, sehingga x = 2 atau x = 3.",
    {
      0: "1 × 6 memang 6, tapi 1 + 6 = 7, bukan 5.",
      2: "−2 dan −3 adalah akar dari x² + 5x + 6 = 0 (tanda suku tengah positif).",
    },
  ),
  q(
    "mtk-009",
    "matematika",
    "sedang",
    "Sebuah dadu dilempar satu kali. Berapa peluang muncul mata dadu genap?",
    ["1/6", "1/3", "1/2", "2/3", "5/6"],
    2,
    "Mata dadu genap ada 3 (2, 4, 6) dari 6 kemungkinan, jadi peluangnya 3/6 = 1/2.",
    {
      0: "1/6 adalah peluang satu mata dadu tertentu, misalnya mata 4 saja.",
      3: "2/3 menghitung 4 mata dadu; mata genap hanya 2, 4, dan 6.",
    },
  ),
  q(
    "mtk-010",
    "matematika",
    "sedang",
    "Sebuah mobil menempuh 180 km dalam 3 jam. Berapa kecepatan rata-ratanya?",
    ["50 km/jam", "55 km/jam", "60 km/jam", "65 km/jam", "70 km/jam"],
    2,
    "Kecepatan rata-rata = jarak ÷ waktu = 180 km ÷ 3 jam = 60 km/jam.",
    {
      4: "70 km/jam didapat jika jaraknya 210 km. Kecepatan = jarak ÷ waktu = 180 ÷ 3.",
    },
  ),

  // Matematika — mudah
  q(
    "mtk-101",
    "matematika",
    "mudah",
    "Hasil dari 15 + 27 adalah …",
    ["32", "42", "43", "52", "41"],
    1,
    "Jumlahkan satuan dan puluhan: 15 + 27 = 42.",
  ),
  q(
    "mtk-102",
    "matematika",
    "mudah",
    "Hasil dari 8 × 7 adalah …",
    ["54", "56", "58", "63", "48"],
    1,
    "Perkalian dasar: 8 × 7 = 56.",
  ),
  q(
    "mtk-103",
    "matematika",
    "mudah",
    "Bentuk desimal dari 3/4 adalah …",
    ["0,25", "0,5", "0,75", "0,34", "1,25"],
    2,
    "Bagi pembilang dengan penyebut: 3 ÷ 4 = 0,75.",
  ),
  q(
    "mtk-104",
    "matematika",
    "mudah",
    "Sebuah segitiga memiliki alas 10 cm dan tinggi 6 cm. Berapa luasnya?",
    ["16 cm²", "30 cm²", "60 cm²", "36 cm²", "20 cm²"],
    1,
    "Luas segitiga = ½ × alas × tinggi = ½ × 10 × 6 = 30 cm².",
  ),
  q(
    "mtk-105",
    "matematika",
    "mudah",
    "Jika 5 buku seharga Rp25.000, berapa harga 1 buku?",
    ["Rp4.000", "Rp5.000", "Rp6.000", "Rp2.500", "Rp7.500"],
    1,
    "Harga satuan = Rp25.000 ÷ 5 = Rp5.000.",
  ),
  // Matematika — sulit
  q(
    "mtk-201",
    "matematika",
    "sulit",
    "Nilai x yang memenuhi 2^(x+1) = 32 adalah …",
    ["3", "4", "5", "6", "16"],
    1,
    "32 = 2⁵, jadi x + 1 = 5 sehingga x = 4.",
  ),
  q(
    "mtk-202",
    "matematika",
    "sulit",
    "Jumlah 10 suku pertama deret aritmetika 3, 7, 11, … adalah …",
    ["190", "200", "210", "220", "230"],
    2,
    "a = 3 dan b = 4. S₁₀ = 10/2 × (2·3 + 9·4) = 5 × 42 = 210.",
  ),
  q(
    "mtk-203",
    "matematika",
    "sulit",
    "Jika log 2 = 0,301 dan log 3 = 0,477, maka log 12 = …",
    ["0,778", "1,079", "1,204", "0,903", "1,380"],
    1,
    "log 12 = log (2² × 3) = 2 log 2 + log 3 = 0,602 + 0,477 = 1,079.",
  ),
  q(
    "mtk-204",
    "matematika",
    "sulit",
    "Dua dadu dilempar bersamaan. Peluang jumlah mata dadu 7 adalah …",
    ["1/12", "1/9", "1/6", "5/36", "7/36"],
    2,
    "Pasangan berjumlah 7 ada 6 dari 36 kemungkinan, jadi peluangnya 6/36 = 1/6.",
  ),
  q(
    "mtk-205",
    "matematika",
    "sulit",
    "Turunan pertama dari f(x) = 3x² − 4x + 5 adalah …",
    ["6x − 4", "3x − 4", "6x + 5", "6x² − 4", "x − 4"],
    0,
    "Turunkan tiap suku: 3x² → 6x, −4x → −4, konstanta 5 → 0. Hasilnya 6x − 4.",
  ),

  // Bahasa Indonesia
  q(
    "bin-001",
    "bahasa-indonesia",
    "mudah",
    "Kata baku yang tepat adalah …",
    ["Apotik", "Apotek", "Apotec", "Apoteek", "Apotiek"],
    1,
    'Menurut KBBI, bentuk bakunya adalah "apotek".',
  ),
  q(
    "bin-002",
    "bahasa-indonesia",
    "mudah",
    'Antonim kata "rajin" adalah …',
    ["Tekun", "Giat", "Malas", "Ulet", "Cermat"],
    2,
    "Antonim berarti lawan kata. Lawan dari rajin adalah malas; pilihan lain justru sinonimnya.",
  ),
  q(
    "bin-003",
    "bahasa-indonesia",
    "sedang",
    "Kalimat yang menggunakan tanda koma dengan benar adalah …",
    [
      "Ibu membeli sayur, buah, dan ikan di pasar.",
      "Ibu membeli sayur buah, dan ikan di pasar.",
      "Ibu, membeli sayur, buah dan ikan di pasar.",
      "Ibu membeli: sayur, buah, dan ikan, di pasar.",
      "Ibu membeli sayur, buah, dan, ikan di pasar.",
    ],
    0,
    'Koma dipakai di antara unsur perincian, termasuk sebelum "dan" pada perincian tiga unsur atau lebih. Subjek dan predikat tidak dipisah koma.',
  ),
  q(
    "bin-004",
    "bahasa-indonesia",
    "sedang",
    'Sinonim kata "kendala" adalah …',
    ["Hambatan", "Kemajuan", "Peluang", "Tujuan", "Bantuan"],
    0,
    "Kendala berarti halangan atau rintangan, sama artinya dengan hambatan.",
  ),
  q(
    "bin-005",
    "bahasa-indonesia",
    "sedang",
    "Gagasan utama sebuah paragraf biasanya terdapat dalam …",
    ["Kalimat penjelas", "Kalimat utama", "Kalimat tanya", "Kalimat seru", "Judul bacaan"],
    1,
    "Gagasan utama dituangkan dalam kalimat utama, yang bisa berada di awal, akhir, atau awal dan akhir paragraf.",
  ),
  q(
    "bin-006",
    "bahasa-indonesia",
    "sedang",
    "Penulisan kata depan yang benar terdapat pada kalimat …",
    [
      "Buku itu ada dimeja.",
      "Ia pergi ke pasar.",
      "Kami tinggal dirumah nenek.",
      "Surat itu dari pada ayah.",
      "Ia datang kesekolah pagi.",
    ],
    1,
    'Kata depan di, ke, dan dari ditulis terpisah dari kata yang mengikutinya: "ke pasar", "di meja", "ke sekolah".',
  ),
  q(
    "bin-007",
    "bahasa-indonesia",
    "sulit",
    'Kata "mempertanggungjawabkan" terbentuk dari …',
    [
      "mem- + tanggung jawab",
      "memper-…-kan + tanggung jawab",
      "per- + tanggung jawab + -kan",
      "mempertanggung + jawab",
      "mem- + pertanggung + jawabkan",
    ],
    1,
    'Konfiks memper-…-kan melekat sekaligus pada gabungan kata "tanggung jawab", sehingga seluruhnya ditulis serangkai.',
  ),
  q(
    "bin-008",
    "bahasa-indonesia",
    "sulit",
    "Kalimat efektif terdapat pada …",
    [
      "Para siswa-siswa berbaris di lapangan.",
      "Kepada para peserta dimohon untuk hadir tepat waktu.",
      "Peserta dimohon hadir tepat waktu.",
      "Dia adalah merupakan juara kelas.",
      "Banyak tamu-tamu yang datang.",
    ],
    2,
    "Kalimat efektif hemat kata dan jelas subjeknya. Pilihan lain memakai bentuk berlebihan (para siswa-siswa, adalah merupakan, banyak tamu-tamu) atau subjek kabur.",
  ),

  // Bahasa Inggris
  q(
    "bing-001",
    "bahasa-inggris",
    "mudah",
    'What is the English word for "perpustakaan"?',
    ["Bookstore", "Library", "Laboratory", "Classroom", "Office"],
    1,
    "Perpustakaan dalam bahasa Inggris adalah library; bookstore berarti toko buku.",
  ),
  q(
    "bing-002",
    "bahasa-inggris",
    "mudah",
    "She ___ to school every day.",
    ["go", "goes", "going", "gone", "to go"],
    1,
    "Pada simple present, subjek orang ketiga tunggal (she) memakai verb + -s/-es: goes.",
  ),
  q(
    "bing-003",
    "bahasa-inggris",
    "sedang",
    "They ___ football when it started to rain.",
    ["play", "plays", "were playing", "have played", "are playing"],
    2,
    "Aksi yang sedang berlangsung di masa lalu lalu disela kejadian lain memakai past continuous: were playing.",
  ),
  q(
    "bing-004",
    "bahasa-inggris",
    "sedang",
    'The opposite of "ancient" is …',
    ["old", "modern", "historic", "antique", "classic"],
    1,
    "Ancient berarti kuno, lawannya modern. Pilihan lain bermakna mirip kuno.",
  ),
  q(
    "bing-005",
    "bahasa-inggris",
    "sedang",
    "If I ___ rich, I would travel the world.",
    ["am", "was", "were", "be", "been"],
    2,
    'Conditional tipe 2 (pengandaian masa kini) memakai "were" untuk semua subjek pada klausa if.',
  ),
  q(
    "bing-006",
    "bahasa-inggris",
    "sedang",
    "Choose the correct sentence.",
    [
      "He don't like coffee.",
      "He doesn't likes coffee.",
      "He doesn't like coffee.",
      "He not like coffee.",
      "He isn't like coffee.",
    ],
    2,
    "Kalimat negatif simple present untuk he memakai doesn't + verb dasar: doesn't like.",
  ),
  q(
    "bing-007",
    "bahasa-inggris",
    "sulit",
    "The report ___ by the manager before the meeting started.",
    ["has finished", "had been finished", "was finishing", "finishes", "is finished"],
    1,
    "Laporan selesai sebelum kejadian lampau lain dan dikerjakan oleh orang lain, jadi memakai pasif past perfect: had been finished.",
  ),
  q(
    "bing-008",
    "bahasa-inggris",
    "sulit",
    "Hardly ___ the station when the train left.",
    ["I had reached", "had I reached", "I reached", "did I reached", "I have reached"],
    1,
    "Kata negatif seperti hardly di awal kalimat memicu inversi: had + subjek + V3.",
  ),

  // IPA
  q(
    "ipa-001",
    "ipa",
    "mudah",
    "Planet yang paling dekat dengan Matahari adalah …",
    ["Venus", "Bumi", "Merkurius", "Mars", "Jupiter"],
    2,
    "Urutan planet dari Matahari: Merkurius, Venus, Bumi, Mars, dan seterusnya.",
  ),
  q(
    "ipa-002",
    "ipa",
    "mudah",
    "Tumbuhan membuat makanannya sendiri melalui proses …",
    ["Respirasi", "Fotosintesis", "Transpirasi", "Evaporasi", "Fermentasi"],
    1,
    "Fotosintesis mengubah air dan karbon dioksida menjadi glukosa dengan bantuan cahaya matahari.",
  ),
  q(
    "ipa-003",
    "ipa",
    "sedang",
    "Satuan SI untuk gaya adalah …",
    ["Joule", "Watt", "Newton", "Pascal", "Kilogram"],
    2,
    "Gaya diukur dalam newton (N). Joule untuk energi, watt untuk daya, pascal untuk tekanan.",
  ),
  q(
    "ipa-004",
    "ipa",
    "sedang",
    "Pada tekanan 1 atm, air murni mendidih pada suhu …",
    ["0 °C", "50 °C", "90 °C", "100 °C", "120 °C"],
    3,
    "Titik didih air murni pada tekanan 1 atm adalah 100 °C.",
  ),
  q(
    "ipa-005",
    "ipa",
    "sedang",
    "Organ yang berfungsi memompa darah ke seluruh tubuh adalah …",
    ["Paru-paru", "Hati", "Jantung", "Ginjal", "Lambung"],
    2,
    "Jantung memompa darah melalui pembuluh darah ke seluruh tubuh.",
  ),
  q(
    "ipa-006",
    "ipa",
    "sedang",
    "Sebuah benda bermassa 2 kg mengalami percepatan 3 m/s². Berapa besar gayanya?",
    ["1,5 N", "5 N", "6 N", "9 N", "12 N"],
    2,
    "Hukum II Newton: F = m × a = 2 kg × 3 m/s² = 6 N.",
  ),
  q(
    "ipa-007",
    "ipa",
    "sulit",
    "Sebuah mobil bergerak dari diam dengan percepatan 2 m/s². Berapa jarak yang ditempuh setelah 5 detik?",
    ["10 m", "20 m", "25 m", "50 m", "100 m"],
    2,
    "Dari keadaan diam: s = ½ × a × t² = ½ × 2 × 5² = 25 m.",
  ),
  q(
    "ipa-008",
    "ipa",
    "sulit",
    "Persilangan Aa dengan Aa menghasilkan perbandingan fenotipe dominan : resesif sebesar …",
    ["1 : 1", "2 : 1", "3 : 1", "1 : 2 : 1", "4 : 0"],
    2,
    "Hasil genotipe AA : Aa : aa = 1 : 2 : 1. AA dan Aa sama-sama tampak dominan, jadi fenotipenya 3 : 1.",
  ),
];
