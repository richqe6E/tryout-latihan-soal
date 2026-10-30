ALTER TABLE "questions" ALTER COLUMN "explanation" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "options" ADD COLUMN "explanation" text;--> statement-breakpoint
CREATE UNIQUE INDEX "options_one_correct_per_question_uq" ON "options" USING btree ("question_id") WHERE "options"."is_correct";--> statement-breakpoint
ALTER TABLE "options" ADD CONSTRAINT "options_position_range" CHECK ("options"."position" BETWEEN 0 AND 4);--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_explanation_not_blank" CHECK (length(btrim("questions"."explanation")) > 0);