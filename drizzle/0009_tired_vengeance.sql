CREATE TABLE "user_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"default_question_count" integer DEFAULT 10 NOT NULL,
	"default_duration_seconds" integer DEFAULT 1800 NOT NULL,
	"reminder_enabled" boolean DEFAULT true NOT NULL,
	"reminder_time" text DEFAULT '19:00' NOT NULL,
	"reminder_timezone" text DEFAULT 'Asia/Jakarta' NOT NULL,
	"last_reminder_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "user_settings_question_count_range" CHECK ("user_settings"."default_question_count" BETWEEN 1 AND 50),
	CONSTRAINT "user_settings_duration_range" CHECK ("user_settings"."default_duration_seconds" BETWEEN 60 AND 10800),
	CONSTRAINT "user_settings_reminder_time_format" CHECK ("user_settings"."reminder_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
);
--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_settings_reminder_idx" ON "user_settings" USING btree ("reminder_time") WHERE "user_settings"."reminder_enabled";