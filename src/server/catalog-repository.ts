import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db, hasDatabase } from "@/db";
import { questions, subjects } from "@/db/schema";
import type { Difficulty, SubjectCatalogItem } from "@/lib/tryout/types";
import { getLocalSubjectCatalog } from "@/server/local-store";

export const SUBJECT_CATALOG_TAG = "subject-catalog";

export async function getSubjectCatalog(): Promise<SubjectCatalogItem[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(SUBJECT_CATALOG_TAG);

  if (!hasDatabase()) {
    return getLocalSubjectCatalog();
  }

  const rows = await db
    .select({
      slug: subjects.slug,
      name: subjects.name,
      description: subjects.description,
      difficulty: questions.difficulty,
      count: sql<number>`count(${questions.id})::int`,
    })
    .from(subjects)
    .leftJoin(questions, and(eq(questions.subjectId, subjects.id), eq(questions.isActive, true)))
    .where(eq(subjects.isActive, true))
    .groupBy(subjects.id, questions.difficulty)
    .orderBy(asc(subjects.position), asc(subjects.name));

  const bySlug = new Map<string, SubjectCatalogItem>();
  for (const row of rows) {
    let item = bySlug.get(row.slug);
    if (!item) {
      item = {
        id: row.slug,
        name: row.name,
        description: row.description,
        counts: { mudah: 0, sedang: 0, sulit: 0 },
        total: 0,
      };
      bySlug.set(row.slug, item);
    }
    if (row.difficulty) {
      item.counts[row.difficulty as Difficulty] = row.count;
      item.total += row.count;
    }
  }
  return [...bySlug.values()];
}
