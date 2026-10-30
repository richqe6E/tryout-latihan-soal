ALTER TABLE "tryout_sessions" ADD COLUMN "requested_questions" integer;--> statement-breakpoint
-- Sesi lama: anggap yang diminta sama dengan yang didapat.
UPDATE "tryout_sessions" SET "requested_questions" = "total_questions";--> statement-breakpoint
ALTER TABLE "tryout_sessions" ALTER COLUMN "requested_questions" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tryout_sessions" ADD CONSTRAINT "tryout_sessions_requested_covers_total" CHECK ("tryout_sessions"."requested_questions" >= "tryout_sessions"."total_questions");