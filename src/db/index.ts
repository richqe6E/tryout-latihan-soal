import "server-only";

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

/**
 * Koneksi database (node-postgres). Pool disimpan di globalThis agar
 * hot reload saat development tidak membuka koneksi baru terus-menerus.
 * Bila DATABASE_URL belum diisi, aplikasi otomatis memakai penyimpanan lokal.
 */
const globalForDb = globalThis as unknown as {
  tryoutPool?: Pool;
  tryoutDb?: Database;
};

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL belum diatur. Lihat .env.example.");
  }
  const needsSsl =
    connectionString.includes("supabase.co") ||
    connectionString.includes("supabase.com") ||
    connectionString.includes("sslmode=require");
  return new Pool({
    connectionString,
    max: 10,
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
}

export function getDb(): Database {
  if (!globalForDb.tryoutDb) {
    const pool = globalForDb.tryoutPool ?? createPool();
    if (process.env.NODE_ENV !== "production") globalForDb.tryoutPool = pool;
    globalForDb.tryoutDb = drizzle({ client: pool, schema });
  }
  return globalForDb.tryoutDb;
}

/** Proxy kompatibel dengan impor `db` yang sudah ada; hanya menyentuh Pool saat dipakai. */
export const db: Database = new Proxy({} as Database, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});
