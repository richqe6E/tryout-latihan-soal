import { connection, NextResponse } from "next/server";
import { getSubjectCatalog } from "@/server/catalog-repository";

/**
 * GET /api/subjects — daftar mata pelajaran aktif untuk memilih tryout.
 * Balasan: { subjects: [{ id (slug), name, description, counts: { mudah, sedang, sulit }, total }] }
 * `counts` = jumlah soal aktif per tingkat kesulitan; tingkat bernilai 0 belum bisa dipilih.
 */
export async function GET() {
  // Selalu dijalankan saat permintaan (bukan saat build); datanya sendiri di-cache beberapa menit.
  await connection();
  const subjects = await getSubjectCatalog();
  return NextResponse.json({ subjects });
}
