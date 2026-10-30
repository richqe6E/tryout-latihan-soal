import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * Koneksi database (node-postgres). Pool disimpan di globalThis agar
 * hot reload saat development tidak membuka koneksi baru terus-menerus.
 */
const globalForDb = globalThis as unknown as { tryoutPool?: Pool };

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL belum diatur. Lihat .env.example.");
  return new Pool({ connectionString, max: 10 });
}

const pool = globalForDb.tryoutPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForDb.tryoutPool = pool;

export const db = drizzle({ client: pool, schema });
export type Database = typeof db;
