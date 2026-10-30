/**
 * Tambah soal contoh ke bank soal tanpa menghapus data apa pun.
 * Jalankan: npm run db:seed:bank  (aman diulang; soal yang sudah ada dilewati)
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { seedQuestionBank } from "./bank-seed";
import * as schema from "./schema";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL belum diatur.");
  const pool = new Pool({ connectionString: url });
  const db = drizzle({ client: pool, schema });
  const result = await seedQuestionBank(db);
  console.log(`✓ ${result.subjects} mapel, ${result.inserted} soal baru, ${result.skipped} soal sudah ada`);
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
