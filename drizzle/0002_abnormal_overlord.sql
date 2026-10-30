ALTER TABLE "tryout_sessions" ADD COLUMN "correct_count" integer;--> statement-breakpoint
ALTER TABLE "tryout_sessions" ADD COLUMN "wrong_count" integer;--> statement-breakpoint
ALTER TABLE "tryout_sessions" ADD COLUMN "unanswered_count" integer;--> statement-breakpoint
-- Isi rincian hasil untuk sesi yang sudah selesai sebelum kolom ini ada.
UPDATE "tryout_sessions" AS s SET
  "correct_count" = r.correct,
  "wrong_count" = r.wrong,
  "unanswered_count" = s."total_questions" - r.correct - r.wrong
FROM (
  SELECT t."id",
    COUNT(a."id") FILTER (WHERE a."is_correct" = true)::int AS correct,
    COUNT(a."id") FILTER (WHERE a."is_correct" = false)::int AS wrong
  FROM "tryout_sessions" t
  LEFT JOIN "answers" a ON a."session_id" = t."id"
  WHERE t."status" = 'selesai'
  GROUP BY t."id"
) AS r
WHERE s."id" = r."id";--> statement-breakpoint
CREATE INDEX "tryout_sessions_user_finished_idx" ON "tryout_sessions" USING btree ("user_id","finished_at");--> statement-breakpoint
ALTER TABLE "tryout_sessions" ADD CONSTRAINT "tryout_sessions_result_consistent" CHECK (("tryout_sessions"."status" = 'selesai') = ("tryout_sessions"."score" IS NOT NULL AND "tryout_sessions"."correct_count" IS NOT NULL AND "tryout_sessions"."wrong_count" IS NOT NULL AND "tryout_sessions"."unanswered_count" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "tryout_sessions" ADD CONSTRAINT "tryout_sessions_result_counts_valid" CHECK ("tryout_sessions"."correct_count" IS NULL OR ("tryout_sessions"."correct_count" >= 0 AND "tryout_sessions"."wrong_count" >= 0 AND "tryout_sessions"."unanswered_count" >= 0 AND "tryout_sessions"."correct_count" + "tryout_sessions"."wrong_count" + "tryout_sessions"."unanswered_count" = "tryout_sessions"."total_questions"));