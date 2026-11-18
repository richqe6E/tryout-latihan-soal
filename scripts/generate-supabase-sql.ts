import fs from "node:fs";
import path from "node:path";
import { KISI_KISI_PACKAGES } from "../src/lib/kisi-kisi";

function sqlStr(value: string | null | undefined): string {
  if (value === null || value === undefined) return "NULL";
  return `'${value.replace(/'/g, "''")}'`;
}

function buildSql(): string {
  const lines: string[] = [];

  lines.push("-- =============================================================================");
  lines.push("-- SUPABASE POSTGRESQL SETUP & SEED SCRIPT");
  lines.push("-- Aplikasi Latihan Soal Kisi-Kisi & Tryout Kelas IV SD (5 Mapel, 165 Soal)");
  lines.push("-- Jalankan seluruh isi file ini di Supabase -> SQL Editor -> Run");
  lines.push("-- =============================================================================");
  lines.push("");
  lines.push('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
  lines.push("");

  // Enum types (idempotent)
  lines.push(`DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'difficulty') THEN
    CREATE TYPE difficulty AS ENUM ('mudah', 'sedang', 'sulit');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_type') THEN
    CREATE TYPE question_type AS ENUM ('pg', 'isian', 'uraian');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_status') THEN
    CREATE TYPE session_status AS ENUM ('berjalan', 'selesai');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'submit_reason') THEN
    CREATE TYPE submit_reason AS ENUM ('manual', 'timeout');
  END IF;
END $$;`);
  lines.push("");

  // Tables
  lines.push(`CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  email_verified boolean NOT NULL DEFAULT false,
  phone text UNIQUE,
  phone_verified boolean NOT NULL DEFAULT false,
  image text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);`);
  lines.push("");

  lines.push(`CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  default_question_count integer NOT NULL DEFAULT 35,
  default_duration_seconds integer NOT NULL DEFAULT 3600,
  reminder_enabled boolean NOT NULL DEFAULT true,
  reminder_time text NOT NULL DEFAULT '19:00',
  reminder_timezone text NOT NULL DEFAULT 'Asia/Jakarta',
  last_reminder_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_settings_question_count_range CHECK (default_question_count BETWEEN 1 AND 50),
  CONSTRAINT user_settings_duration_range CHECK (default_duration_seconds BETWEEN 60 AND 10800),
  CONSTRAINT user_settings_reminder_time_format CHECK (reminder_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
);`);
  lines.push("");

  lines.push(`CREATE TABLE IF NOT EXISTS auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions(user_id);`);
  lines.push("");

  lines.push(`CREATE TABLE IF NOT EXISTS auth_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id text NOT NULL,
  provider_id text NOT NULL,
  access_token text,
  refresh_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  id_token text,
  password text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_accounts_user_idx ON auth_accounts(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS auth_accounts_provider_account_uq ON auth_accounts(provider_id, account_id);`);
  lines.push("");

  lines.push(`CREATE TABLE IF NOT EXISTS auth_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  value text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_verifications_identifier_idx ON auth_verifications(identifier);`);
  lines.push("");

  lines.push(`CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  position smallint NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);`);
  lines.push("");

  lines.push(`CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  question_text text NOT NULL,
  difficulty difficulty NOT NULL,
  question_type question_type NOT NULL DEFAULT 'pg',
  type_label text,
  question_number integer,
  topic text,
  indicator text,
  cognitive_level text,
  stimulus_title text,
  stimulus_text text,
  visual_asset text,
  visual_caption text,
  expected_answer text,
  accepted_answers text,
  rubric_notes text,
  explanation text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT questions_text_not_blank CHECK (length(btrim(question_text)) > 0),
  CONSTRAINT questions_explanation_not_blank CHECK (length(btrim(explanation)) > 0)
);
CREATE INDEX IF NOT EXISTS questions_active_pick_idx ON questions(subject_id, difficulty) WHERE is_active;
CREATE INDEX IF NOT EXISTS questions_subject_number_idx ON questions(subject_id, question_number);
CREATE UNIQUE INDEX IF NOT EXISTS questions_subject_text_uq ON questions(subject_id, md5(lower(btrim(question_text))));`);
  lines.push("");

  lines.push(`CREATE TABLE IF NOT EXISTS options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_text text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  position smallint NOT NULL,
  explanation text,
  CONSTRAINT options_position_range CHECK (position BETWEEN 0 AND 4)
);
CREATE INDEX IF NOT EXISTS options_question_idx ON options(question_id);
CREATE UNIQUE INDEX IF NOT EXISTS options_question_position_uq ON options(question_id, position);
CREATE UNIQUE INDEX IF NOT EXISTS options_one_correct_per_question_uq ON options(question_id) WHERE is_correct;`);
  lines.push("");

  lines.push(`CREATE TABLE IF NOT EXISTS tryout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id),
  difficulty difficulty NOT NULL,
  mode text NOT NULL DEFAULT 'kisi-kisi',
  total_questions integer NOT NULL,
  requested_questions integer NOT NULL,
  duration_seconds integer NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  deadline_at timestamptz NOT NULL,
  paused_remaining_seconds integer,
  last_order_number integer NOT NULL DEFAULT 1,
  finished_at timestamptz,
  status session_status NOT NULL DEFAULT 'berjalan',
  submit_reason submit_reason,
  score integer,
  correct_count integer,
  wrong_count integer,
  unanswered_count integer,
  used_seconds integer,
  deleted_at timestamptz,
  CONSTRAINT tryout_sessions_duration_positive CHECK (duration_seconds > 0),
  CONSTRAINT tryout_sessions_total_positive CHECK (total_questions > 0),
  CONSTRAINT tryout_sessions_requested_covers_total CHECK (requested_questions >= total_questions),
  CONSTRAINT tryout_sessions_deadline_after_start CHECK (deadline_at >= started_at),
  CONSTRAINT tryout_sessions_paused_remaining_valid CHECK (paused_remaining_seconds IS NULL OR paused_remaining_seconds BETWEEN 0 AND duration_seconds),
  CONSTRAINT tryout_sessions_score_range CHECK (score IS NULL OR score BETWEEN 0 AND 100),
  CONSTRAINT tryout_sessions_finished_consistent CHECK ((status = 'selesai') = (finished_at IS NOT NULL)),
  CONSTRAINT tryout_sessions_result_consistent CHECK ((status = 'selesai') = (score IS NOT NULL AND correct_count IS NOT NULL AND wrong_count IS NOT NULL AND unanswered_count IS NOT NULL AND used_seconds IS NOT NULL)),
  CONSTRAINT tryout_sessions_used_seconds_valid CHECK (used_seconds IS NULL OR used_seconds BETWEEN 0 AND duration_seconds),
  CONSTRAINT tryout_sessions_result_counts_valid CHECK (correct_count IS NULL OR (correct_count >= 0 AND wrong_count >= 0 AND unanswered_count >= 0 AND correct_count + wrong_count + unanswered_count = total_questions))
);
CREATE INDEX IF NOT EXISTS tryout_sessions_user_idx ON tryout_sessions(user_id);
CREATE INDEX IF NOT EXISTS tryout_sessions_user_status_idx ON tryout_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS tryout_sessions_user_finished_idx ON tryout_sessions(user_id, finished_at);
CREATE INDEX IF NOT EXISTS tryout_sessions_user_history_idx ON tryout_sessions(user_id, started_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS tryout_sessions_deleted_idx ON tryout_sessions(deleted_at) WHERE deleted_at IS NOT NULL;`);
  lines.push("");

  lines.push(`CREATE TABLE IF NOT EXISTS session_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES tryout_sessions(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  order_number integer NOT NULL
);
CREATE INDEX IF NOT EXISTS session_questions_session_idx ON session_questions(session_id);
CREATE UNIQUE INDEX IF NOT EXISTS session_questions_session_order_uq ON session_questions(session_id, order_number);
CREATE UNIQUE INDEX IF NOT EXISTS session_questions_session_question_uq ON session_questions(session_id, question_id);`);
  lines.push("");

  lines.push(`CREATE TABLE IF NOT EXISTS answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES tryout_sessions(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  selected_option_id uuid REFERENCES options(id) ON DELETE RESTRICT,
  answer_text text,
  is_flagged boolean NOT NULL DEFAULT false,
  is_correct boolean,
  answered_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS answers_session_idx ON answers(session_id);
CREATE UNIQUE INDEX IF NOT EXISTS answers_session_question_uq ON answers(session_id, question_id);`);
  lines.push("");

  // Seed Subjects
  lines.push("-- =============================================================================");
  lines.push("-- SEED 5 MATA PELAJARAN & 165 SOAL KISI-KISI");
  lines.push("-- =============================================================================");
  lines.push("");

  KISI_KISI_PACKAGES.forEach((pkg, position) => {
    lines.push(
      `INSERT INTO subjects (slug, name, description, position, is_active) VALUES (${sqlStr(pkg.meta.slug)}, ${sqlStr(pkg.meta.name)}, ${sqlStr(pkg.meta.description)}, ${position}, true) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, position = EXCLUDED.position, is_active = true;`,
    );
  });
  lines.push("");

  // Seed Questions + Options inside DO block per package for clean idempotency
  lines.push("DO $$");
  lines.push("DECLARE");
  lines.push("  v_subject_id uuid;");
  lines.push("  v_question_id uuid;");
  lines.push("BEGIN");

  for (const pkg of KISI_KISI_PACKAGES) {
    lines.push(`  SELECT id INTO v_subject_id FROM subjects WHERE slug = ${sqlStr(pkg.meta.slug)};`);
    for (const q of pkg.questions) {
      const acceptedJson = q.acceptedAnswers ? JSON.stringify(q.acceptedAnswers) : null;
      lines.push(`  v_question_id := NULL;`);
      lines.push(
        `  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, ${sqlStr(q.text)}, ${sqlStr(q.difficulty)}, ${sqlStr(q.type)}, ${sqlStr(q.typeLabel)}, ${q.number}, ${sqlStr(q.topic)}, ${sqlStr(q.indicator)}, ${sqlStr(q.cognitiveLevel)}, ${sqlStr(q.stimulusTitle)}, ${sqlStr(q.stimulusText)}, ${sqlStr(q.visualAsset)}, ${sqlStr(q.visualCaption)}, ${sqlStr(q.expectedAnswer)}, ${sqlStr(acceptedJson)}, ${sqlStr(q.rubricNotes)}, ${sqlStr(q.explanation)}, true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;`,
      );
      if (q.options && q.options.length > 0) {
        lines.push(`  IF v_question_id IS NOT NULL THEN`);
        q.options.forEach((opt, pos) => {
          lines.push(
            `    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, ${sqlStr(opt.text)}, ${opt.isCorrect ? "true" : "false"}, ${pos}, ${sqlStr(opt.explanation)});`,
          );
        });
        lines.push(`  END IF;`);
      }
    }
    lines.push("");
  }

  lines.push("END $$;");
  lines.push("");

  return lines.join("\n");
}

const outPath = path.join(process.cwd(), "supabase_setup.sql");
fs.writeFileSync(outPath, buildSql(), "utf8");
console.log(`Generated ${outPath}`);
