-- =============================================================================
-- SUPABASE POSTGRESQL SETUP & SEED SCRIPT
-- Aplikasi Latihan Soal Kisi-Kisi & Tryout Kelas IV SD (5 Mapel, 165 Soal)
-- Jalankan seluruh isi file ini di Supabase -> SQL Editor -> Run
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
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
END $$;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  email_verified boolean NOT NULL DEFAULT false,
  phone text UNIQUE,
  phone_verified boolean NOT NULL DEFAULT false,
  image text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_settings (
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
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions(user_id);

CREATE TABLE IF NOT EXISTS auth_accounts (
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
CREATE UNIQUE INDEX IF NOT EXISTS auth_accounts_provider_account_uq ON auth_accounts(provider_id, account_id);

CREATE TABLE IF NOT EXISTS auth_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  value text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_verifications_identifier_idx ON auth_verifications(identifier);

CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  position smallint NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS questions (
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
CREATE UNIQUE INDEX IF NOT EXISTS questions_subject_text_uq ON questions(subject_id, md5(lower(btrim(question_text))));

CREATE TABLE IF NOT EXISTS options (
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
CREATE UNIQUE INDEX IF NOT EXISTS options_one_correct_per_question_uq ON options(question_id) WHERE is_correct;

CREATE TABLE IF NOT EXISTS tryout_sessions (
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
CREATE INDEX IF NOT EXISTS tryout_sessions_deleted_idx ON tryout_sessions(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS session_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES tryout_sessions(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  order_number integer NOT NULL
);
CREATE INDEX IF NOT EXISTS session_questions_session_idx ON session_questions(session_id);
CREATE UNIQUE INDEX IF NOT EXISTS session_questions_session_order_uq ON session_questions(session_id, order_number);
CREATE UNIQUE INDEX IF NOT EXISTS session_questions_session_question_uq ON session_questions(session_id, question_id);

CREATE TABLE IF NOT EXISTS answers (
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
CREATE UNIQUE INDEX IF NOT EXISTS answers_session_question_uq ON answers(session_id, question_id);

-- =============================================================================
-- SEED 5 MATA PELAJARAN & 165 SOAL KISI-KISI
-- =============================================================================

INSERT INTO subjects (slug, name, description, position, is_active) VALUES ('matematika', 'Matematika', 'Bilangan cacah hingga 10.000, operasi hitung, kelipatan & faktor, pecahan, desimal, persen, dan pola bilangan.', 0, true) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, position = EXCLUDED.position, is_active = true;
INSERT INTO subjects (slug, name, description, position, is_active) VALUES ('bahasa-indonesia', 'Bahasa Indonesia', 'Memahami isi cerita, kalimat transitif & intransitif, imbuhan me-/ber-, homonim, fobia, rambu lalu lintas, wawancara, dan majas.', 1, true) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, position = EXCLUDED.position, is_active = true;
INSERT INTO subjects (slug, name, description, position, is_active) VALUES ('budaya-kutai', 'Muatan Lokal Budaya & Bahasa Kutai (@BK)', 'Sejarah Datuk Tunggang Parangan, Tradisi Naek Ayun, permainan Asen Naga, serta pakaian adat Kutai (Kustim, Antakusuma, Takwo, Miskat).', 2, true) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, position = EXCLUDED.position, is_active = true;
INSERT INTO subjects (slug, name, description, position, is_active) VALUES ('pendidikan-pancasila', 'Pendidikan Pancasila', 'Identitas masyarakat, keberagaman suku & budaya, pemerintahan desa/RT/RW, aturan tertulis & tidak tertulis, serta hak dan kewajiban.', 3, true) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, position = EXCLUDED.position, is_active = true;
INSERT INTO subjects (slug, name, description, position, is_active) VALUES ('seni-rupa', 'Seni Rupa', 'Menggambar sketsa & kostum, karakteristik alat dan bahan berkarya, serta kreasi karya seni rupa 2 dimensi dan 3 dimensi.', 4, true) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, position = EXCLUDED.position, is_active = true;

DO $$
DECLARE
  v_subject_id uuid;
  v_question_id uuid;
BEGIN
  SELECT id INTO v_subject_id FROM subjects WHERE slug = 'matematika';
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Lambang bilangan dari "empat ribu dua ratus tujuh puluh lima" adalah …', 'mudah', 'pg', NULL, 1, 'Bilangan Cacah sampai 10.000', 'Siswa dapat mengetahui tentang penulisan bilangan menggunakan angka', 'C1', NULL, NULL, NULL, NULL, 'B (4.275)', NULL, NULL, 'Empat ribu = 4.000, dua ratus = 200, tujuh puluh = 70, dan lima = 5. Jika digabung menjadi 4.275.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '4.257', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '4.275', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '4.725', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '4.075', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Pada bilangan 6.842, angka 8 menempati nilai tempat …', 'mudah', 'pg', NULL, 2, 'Nilai Tempat Bilangan', 'Siswa dapat mengetahui tentang nilai tempat', 'C1', NULL, NULL, NULL, NULL, 'B (Ratusan)', NULL, NULL, 'Pada bilangan 6.842: 6 adalah ribuan, 8 adalah ratusan (800), 4 adalah puluhan, dan 2 adalah satuan.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Ribuan', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Ratusan', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Puluhan', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Satuan', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Hasil dari 348 + 275 adalah …', 'mudah', 'pg', NULL, 3, 'Operasi Penjumlahan Bilangan Cacah', 'Siswa dapat menghitung operasi hitung penjumlahan', 'C2', NULL, NULL, NULL, NULL, 'C (623)', NULL, NULL, 'Penjumlahan bersusun: 8 + 5 = 13 (tulis 3, simpan 1); 1 + 4 + 7 = 12 (tulis 2, simpan 1); 1 + 3 + 2 = 6. Hasilnya 623.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '513', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '613', false, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '623', true, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '633', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Hasil dari 72 : 8 adalah …', 'mudah', 'pg', NULL, 4, 'Operasi Pembagian Bilangan Cacah', 'Siswa dapat menghitung operasi hitung pembagian', 'C2', NULL, NULL, NULL, NULL, 'C (9)', NULL, NULL, 'Karena 8 × 9 = 72, maka 72 : 8 = 9.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '7', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '8', false, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '9', true, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '10', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Hasil dari 14 × 6 adalah …', 'mudah', 'pg', NULL, 5, 'Operasi Perkalian Bilangan Cacah', 'Siswa dapat menghitung operasi hitung perkalian', 'C2', NULL, NULL, NULL, NULL, 'C (84)', NULL, NULL, '14 × 6 = (10 × 6) + (4 × 6) = 60 + 24 = 84.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '64', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '74', false, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '84', true, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '94', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Bilangan berikut yang merupakan kelipatan dari 7 adalah …', 'sedang', 'pg', NULL, 6, 'Kelipatan Bilangan', 'Siswa dapat mengetahui tentang kelipatan', 'C2', NULL, NULL, NULL, NULL, 'A (14, 21, 28, 35)', NULL, NULL, 'Kelipatan 7 diperoleh dengan mengalikan 7 dengan 1, 2, 3, 4, 5, ... yaitu 7, 14, 21, 28, 35, ...', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '14, 21, 28, 35', true, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '14, 20, 28, 35', false, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '7, 15, 21, 28', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '14, 21, 27, 36', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Nilai pecahan yang ditunjukkan oleh bagian yang diarsir pada gambar di atas adalah …', 'sedang', 'pg', NULL, 7, 'Pecahan dari Gambar', 'Siswa dapat mengetahui nilai pecahan dari gambar', 'C2', NULL, NULL, 'math-fraction-3-8', 'Perhatikan gambar lingkaran yang dibagi sama besar berikut.', 'B (3/8)', NULL, NULL, 'Lingkaran dibagi menjadi 8 bagian sama besar (penyebut = 8), dan 3 bagian diarsir (pembilang = 3). Jadi nilai pecahannya adalah 3/8.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '3/5', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '3/8', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '5/8', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '8/3', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Pada pecahan 5/9, angka 5 disebut … dan angka 9 disebut …', 'mudah', 'pg', NULL, 8, 'Pembilang dan Penyebut Pecahan', 'Siswa dapat mengetahui penyebut dan pembilang dalam pecahan', 'C1', NULL, NULL, NULL, NULL, 'B (pembilang dan penyebut)', NULL, NULL, 'Dalam pecahan a/b, bilangan di bagian atas (a = 5) disebut pembilang dan bilangan di bagian bawah (b = 9) disebut penyebut.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'penyebut dan pembilang', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'pembilang dan penyebut', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'pembagi dan hasil', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'satuan dan puluhan', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Tanda perbandingan yang tepat untuk mengisi titik-titik pada 3/7 … 5/7 adalah …', 'sedang', 'pg', NULL, 9, 'Membandingkan Pecahan', 'Siswa dapat mengetahui cara membandingkan pecahan dengan menggunakan tanda perbandingan', 'C2', NULL, NULL, NULL, NULL, 'B (<)', NULL, NULL, 'Karena penyebutnya sudah sama (7), kita cukup membandingkan pembilangnya: 3 lebih kecil dari 5, sehingga 3/7 < 5/7.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '>', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '<', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '=', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '+', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Pecahan yang senilai dengan 2/3 adalah …', 'sedang', 'pg', NULL, 10, 'Pecahan Senilai', 'Siswa dapat menghitung pecahan senilai', 'C2', NULL, NULL, NULL, NULL, 'C (4/6)', NULL, NULL, 'Kalikan pembilang dan penyebut 2/3 dengan bilangan yang sama (2): (2 × 2)/(3 × 2) = 4/6.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '3/6', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '4/5', false, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '4/6', true, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '6/8', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Bentuk desimal dari pecahan 4/10 adalah …', 'sedang', 'pg', NULL, 11, 'Bentuk Desimal', 'Siswa dapat mengetahui tentang bentuk desimal', 'C2', NULL, NULL, NULL, NULL, 'B (0,4)', NULL, NULL, 'Pecahan persepuluhan 4/10 memiliki satu angka di belakang koma, yaitu 0,4.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '0,04', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '0,4', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '4,0', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '0,45', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Banyak persegi kecil pada pola ke-4 adalah …', 'sedang', 'pg', NULL, 12, 'Pola Bilangan Melalui Gambar', 'Siswa dapat mengetahui cara menentukan pola bilangan melalui gambar', 'C2', NULL, NULL, 'math-pattern-blocks', 'Amati susunan persegi kecil pada gambar pola berikut.', 'C (8 buah)', NULL, NULL, 'Pola ke-1 memiliki 2 persegi, pola ke-2 memiliki 4 persegi, pola ke-3 memiliki 6 persegi (selalu bertambah 2). Jadi pola ke-4 memiliki 6 + 2 = 8 persegi.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '6 buah', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '7 buah', false, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '8 buah', true, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '10 buah', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Perhatikan barisan bilangan: 5, 10, 15, 20, …. Bilangan yang tepat untuk mengisi titik-titik adalah …', 'sedang', 'pg', NULL, 13, 'Menghitung Pola Bilangan', 'Siswa dapat menghitung pola bilangan', 'C2', NULL, NULL, NULL, NULL, 'C (25)', NULL, NULL, 'Setiap suku bertambah 5 (5 + 5 = 10, 10 + 5 = 15, 15 + 5 = 20, 20 + 5 = 25).', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '22', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '24', false, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '25', true, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '30', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Diketahui pola bilangan: 12, 19, 26, 33, 40. Selisih antarbilangan yang berdekatan pada pola tersebut adalah …', 'sulit', 'pg', NULL, 14, 'Selisih Pola Bilangan', 'Siswa dapat menghitung selisih dalam pola bilangan', 'C2', NULL, NULL, NULL, NULL, 'C (7)', NULL, NULL, 'Selisih tiap suku berurutan adalah 19 − 12 = 7, 26 − 19 = 7, 33 − 26 = 7, dan 40 − 33 = 7.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '5', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '6', false, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '7', true, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '8', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Bentuk persen dari pecahan 35/100 adalah …', 'sedang', 'pg', NULL, 15, 'Persen', 'Siswa dapat mengetahui tentang persen', 'C2', NULL, NULL, NULL, NULL, 'B (35%)', NULL, NULL, 'Persen berarti perseratus (/100). Maka 35/100 sama dengan 35%.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '3,5%', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '35%', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '65%', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '350%', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Tuliskan lambang bilangan dari "delapan ribu lima ratus tiga puluh sembilan"!', 'mudah', 'isian', NULL, 16, 'Bilangan Cacah sampai 10.000', 'Disajikan nama bilangan cacah dalam bentuk kata-kata, peserta didik dapat menuliskan lambang bilangannya.', 'C1', NULL, NULL, NULL, NULL, '8.539', '["8.539","8539"]', NULL, 'Delapan ribu (8.000) + lima ratus (500) + tiga puluh (30) + sembilan (9) = 8.539.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Pada bilangan 7.364, sebutkan nilai tempat dan nilai angka dari angka 3!', 'mudah', 'isian', NULL, 17, 'Nilai Tempat Bilangan 4 Angka', 'Disajikan bilangan empat angka, peserta didik dapat menentukan nilai tempat dan nilai salah satu angkanya.', 'C2', NULL, NULL, NULL, NULL, 'Ratusan, nilainya 300', '["ratusan, 300","ratusan dan 300","ratusan nilainya 300","ratusan 300"]', NULL, 'Pada 7.364, angka 3 berada di posisi ketiga dari belakang sehingga menempati nilai tempat ratusan dengan nilai angka 300.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Urutkan bilangan berikut dari yang terkecil ke terbesar: 3.450, 2.980, 3.405, 4.120.', 'sedang', 'isian', NULL, 18, 'Mengurutkan Bilangan Cacah', 'Disajikan empat bilangan cacah, peserta didik dapat mengurutkannya dari yang terkecil ke terbesar.', 'C2', NULL, NULL, NULL, NULL, '2.980, 3.405, 3.450, 4.120', '["2.980, 3.405, 3.450, 4.120","2980, 3405, 3450, 4120","2.980 3.405 3.450 4.120"]', NULL, 'Bandingkan angka ribuan terlebih dahulu (2 < 3 < 4). Untuk 3.405 dan 3.450, puluhannya 0 < 5 sehingga 3.405 lebih kecil dari 3.450.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Uraikan bilangan 5.629 berdasarkan nilai tempat ribuan, ratusan, puluhan, dan satuan!', 'sedang', 'isian', NULL, 19, 'Menguraikan Bilangan Berdasarkan Nilai Tempat', 'Disajikan bilangan empat angka, peserta didik dapat menguraikannya berdasarkan nilai tempat ribuan, ratusan, puluhan, dan satuan.', 'C2', NULL, NULL, NULL, NULL, '5 ribuan + 6 ratusan + 2 puluhan + 9 satuan (atau 5.000 + 600 + 20 + 9)', '["5 ribuan + 6 ratusan + 2 puluhan + 9 satuan","5000 + 600 + 20 + 9","5.000 + 600 + 20 + 9"]', NULL, '5.629 terdiri dari 5 ribuan (5.000), 6 ratusan (600), 2 puluhan (20), dan 9 satuan (9).', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Rafi membeli sebuah buku tulis seharga Rp4.500 dan sebuah pensil seharga Rp2.250. Berapa total uang yang harus dibayar Rafi?', 'sedang', 'isian', NULL, 20, 'Soal Cerita Penjumlahan Uang', 'Disajikan soal cerita tentang harga dua barang, peserta didik dapat menghitung total uang yang harus dibayar.', 'C3', NULL, NULL, NULL, NULL, 'Rp6.750', '["Rp6.750","Rp 6.750","6750","6.750"]', NULL, 'Total harga = Rp4.500 + Rp2.250 = Rp6.750.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Hitunglah hasil operasi berikut:
a) 15 × 6 = …
b) 84 : 7 = …', 'sedang', 'isian', NULL, 21, 'Operasi Perkalian dan Pembagian', 'Disajikan operasi perkalian dua bilangan cacah, peserta didik dapat menghitung hasilnya. Disajikan operasi pembagian bilangan cacah, peserta didik dapat menghitung hasilnya.', 'C2', NULL, NULL, NULL, NULL, 'a) 90; b) 12', '["a) 90; b) 12","90 dan 12","90, 12","90; 12"]', NULL, 'a) 15 × 6 = 90. b) 84 : 7 = 12 karena 7 × 12 = 84.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'a) Tuliskan semua faktor dari bilangan 12!
b) Tuliskan semua kelipatan 6 yang kurang dari 30!', 'sulit', 'isian', NULL, 22, 'Faktor dan Kelipatan Bilangan', 'Disajikan bilangan 12, peserta didik dapat menuliskan semua faktornya. Disajikan bilangan 6 dan suatu batas nilai, peserta didik dapat menuliskan kelipatan 6 yang kurang dari batas tersebut.', 'C2', NULL, NULL, NULL, NULL, 'a) 1, 2, 3, 4, 6, 12; b) 6, 12, 18, 24', '["1, 2, 3, 4, 6, 12 dan 6, 12, 18, 24","1,2,3,4,6,12; 6,12,18,24"]', NULL, 'a) 12 dapat dibagi habis oleh 1, 2, 3, 4, 6, dan 12. b) Kelipatan 6 di bawah 30 adalah 6, 12, 18, dan 24.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Tuliskan satu pecahan yang senilai dengan 3/4!', 'sedang', 'isian', NULL, 23, 'Pecahan Senilai', 'Disajikan pecahan 3/4, peserta didik dapat menuliskan satu pecahan yang senilai.', 'C2', NULL, NULL, NULL, NULL, '6/8 (atau 9/12, 12/16)', '["6/8","9/12","12/16","15/20","75/100"]', NULL, 'Mengalikan pembilang dan penyebut 3/4 dengan 2 menghasilkan (3×2)/(4×2) = 6/8. Jawaban lain seperti 9/12 atau 12/16 juga benar.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Ubahlah pecahan 25/100 ke dalam bentuk desimal dan bentuk persen!', 'sulit', 'isian', NULL, 24, 'Hubungan Pecahan, Desimal, dan Persen', 'Disajikan pecahan 25/100, peserta didik dapat mengubahnya ke bentuk desimal dan persen.', 'C2', NULL, NULL, NULL, NULL, 'Desimal = 0,25 dan Persen = 25%', '["0,25 dan 25%","0.25 dan 25%","0,25; 25%","0,25 25%"]', NULL, 'Pecahan perseratus 25/100 memiliki dua angka di belakang koma yaitu 0,25, dan dalam persen ditulis 25%.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Lengkapilah pola bilangan berikut dengan aturan bertambah 3: 4, 7, …, 13, …, 19.', 'sedang', 'isian', NULL, 25, 'Pola Bilangan (Aljabar)', 'Disajikan pola bilangan dengan dua bagian kosong, peserta didik dapat menentukan kedua bilangan yang hilang berdasarkan pola penambahan 3.', 'C3', NULL, NULL, NULL, NULL, '10 dan 16', '["10 dan 16","10, 16","10; 16","10 16"]', NULL, '7 + 3 = 10, dan 13 + 3 = 16. Jadi dua bilangan yang kosong adalah 10 dan 16.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;

  SELECT id INTO v_subject_id FROM subjects WHERE slug = 'bahasa-indonesia';
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Mengapa Raka merasa kesal pada pagi hari sebelum berangkat ke sekolah?', 'mudah', 'pg', NULL, 1, 'Memahami isi cerita', 'Menentukan alasan tokoh merasa kesal berdasarkan cerita', 'C1', 'Bacaan 1: Baju Olahraga Raka (untuk soal nomor 1, 2, dan 7)', 'Pagi itu Raka bersiap-siap pergi ke sekolah untuk mengikuti pelajaran olahraga. Namun, saat memakai baju olahraganya, kancing baju tersebut sulit dipasang dan bagian lengannya terasa sempit. Raka merasa kesal karena ia tidak bisa memakai baju kesukaannya itu lagi. Ibu lalu tersenyum dan menjelaskan bahwa tubuh Raka bertambah tinggi dan besar karena ia sekarang sudah kelas empat SD, serta rajin makan makanan bergizi.', NULL, NULL, 'B (Karena baju olahraga kesukaannya sudah tidak muat lagi)', NULL, NULL, 'Dalam cerita dijelaskan bahwa Raka merasa kesal karena kancing baju olahraganya sulit dipasang dan tidak bisa dipakai lagi.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Karena ia bangun kesiangan dan tertinggal bus', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Karena baju olahraga kesukaannya sudah tidak muat lagi', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Karena ibu melarangnya mengikuti pelajaran olahraga', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Karena sepatunya hilang di halaman rumah', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Berdasarkan penjelasan Ibu, apa penyebab baju olahraga Raka tidak muat lagi?', 'mudah', 'pg', NULL, 2, 'Memahami isi cerita', 'Menentukan informasi tentang penyebab pakaian tidak muat', 'C2', 'Bacaan 1: Baju Olahraga Raka (untuk soal nomor 1, 2, dan 7)', 'Pagi itu Raka bersiap-siap pergi ke sekolah untuk mengikuti pelajaran olahraga. Namun, saat memakai baju olahraganya, kancing baju tersebut sulit dipasang dan bagian lengannya terasa sempit. Raka merasa kesal karena ia tidak bisa memakai baju kesukaannya itu lagi. Ibu lalu tersenyum dan menjelaskan bahwa tubuh Raka bertambah tinggi dan besar karena ia sekarang sudah kelas empat SD, serta rajin makan makanan bergizi.', NULL, NULL, 'C (Tubuh Raka bertambah tinggi dan besar seiring pertumbuhannya)', NULL, NULL, 'Ibu menjelaskan bahwa Raka kini bertambah tinggi dan besar karena sudah kelas 4 SD dan rajin makan bergizi.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Baju tersebut tertukar dengan milik adiknya', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Baju Raka robek saat dicuci di mesin cuci', false, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Tubuh Raka bertambah tinggi dan besar seiring pertumbuhannya', true, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Ibu salah membelikan ukuran baju yang lebih kecil', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Kalimat transitif adalah kalimat yang …', 'mudah', 'pg', NULL, 3, 'Kalimat transitif', 'Menjelaskan pengertian kalimat transitif', 'C2', NULL, NULL, NULL, NULL, 'B (memerlukan objek setelah predikat)', NULL, NULL, 'Kalimat transitif merupakan kalimat aktif yang membutuhkan unsur objek (O) agar maknanya lengkap.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'tidak memerlukan subjek sama sekali', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'memerlukan objek setelah predikat', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'hanya terdiri atas kata sifat dan keterangan', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'selalu diakhiri dengan tanda seru', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Manakah di antara kalimat berikut yang termasuk kalimat transitif karena memiliki objek?', 'sedang', 'pg', NULL, 4, 'Kalimat transitif', 'Mengidentifikasi kalimat transitif berdasarkan objeknya', 'C1', NULL, NULL, NULL, NULL, 'C (Budi membaca buku cerita di perpustakaan.)', NULL, NULL, 'Pada kalimat "Budi membaca buku cerita", "buku cerita" adalah objek yang dikenai pekerjaan membaca.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Adik tidur nyenyak di kamar.', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Ayah berangkat ke kantor pagi ini.', false, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Budi membaca buku cerita di perpustakaan.', true, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Lina tersenyum gembira.', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Arti kata fobia yang tepat adalah …', 'mudah', 'pg', NULL, 5, 'Fobia', 'Menjelaskan arti kata fobia', 'C2', NULL, NULL, NULL, NULL, 'B (ketakutan yang sangat berlebihan terhadap benda atau keadaan tertentu)', NULL, NULL, 'Menurut KBBI, fobia adalah ketakutan yang sangat berlebihan terhadap benda atau keadaan tertentu yang dapat menghambat kehidupan penderitanya.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'rasa kagum yang sangat besar terhadap sesuatu', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'ketakutan yang sangat berlebihan terhadap benda atau keadaan tertentu', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'kebiasaan bangun pagi setiap hari', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'kemampuan mengingat pelajaran dengan cepat', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Mengapa Sinta menyukai kegiatan menyiram tanaman setiap sore?', 'mudah', 'pg', NULL, 6, 'Memahami isi cerita', 'Menentukan alasan tokoh menyukai kegiatan menyiram tanaman', 'C2', 'Bacaan 2: Taman Kecil Sinta (untuk soal nomor 6)', 'Setiap sore sepulang sekolah, Sinta selalu menyiram tanaman bunga di halaman rumah bersama kakaknya. Sinta sangat menyukai kegiatan menyiram tanaman karena membuat udara di sekitar rumah menjadi sejuk dan bunga-bunganya tumbuh subur serta berwarna cerah.', NULL, NULL, 'B (Karena udara menjadi sejuk dan bunga-bunga tumbuh subur)', NULL, NULL, 'Pada kalimat kedua bacaan tertulis bahwa menyiram tanaman membuat udara sejuk dan bunga tumbuh subur serta berwarna cerah.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Karena ia ingin mendapat hadiah dari kakaknya', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Karena udara menjadi sejuk dan bunga-bunga tumbuh subur', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Karena ia tidak suka belajar di dalam rumah', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Karena halaman rumahnya sangat sempit', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Siapakah tokoh-tokoh yang ada dalam cerita Baju Olahraga Raka di atas?', 'mudah', 'pg', NULL, 7, 'Memahami isi cerita', 'Mengidentifikasi tokoh dalam cerita', 'C1', 'Bacaan 1: Baju Olahraga Raka (untuk soal nomor 1, 2, dan 7)', 'Pagi itu Raka bersiap-siap pergi ke sekolah untuk mengikuti pelajaran olahraga. Namun, saat memakai baju olahraganya, kancing baju tersebut sulit dipasang dan bagian lengannya terasa sempit. Raka merasa kesal karena ia tidak bisa memakai baju kesukaannya itu lagi. Ibu lalu tersenyum dan menjelaskan bahwa tubuh Raka bertambah tinggi dan besar karena ia sekarang sudah kelas empat SD, serta rajin makan makanan bergizi.', NULL, NULL, 'B (Raka dan Ibu)', NULL, NULL, 'Dalam teks bacaan pertama, tokoh yang berperan adalah Raka dan Ibu.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Raka dan Sinta', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Raka dan Ibu', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Ibu dan Kakak', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Raka dan Ayah', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Kata homonim adalah kata yang …', 'sedang', 'pg', NULL, 8, 'Homonim', 'Menjelaskan pengertian kata homonim', 'C2', NULL, NULL, NULL, NULL, 'B (sama lafal dan ejaannya, tetapi berbeda maknanya)', NULL, NULL, 'Homonim adalah kata yang sama lafal dan ejaannya, tetapi mempunyai arti yang berbeda (misalnya kata ''bisa'').', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'penulisannya berbeda tetapi maknanya sama', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'sama lafal dan ejaannya, tetapi berbeda maknanya', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'memiliki makna berlawanan dengan kata lain', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'berasal dari bahasa daerah setempat', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Perhatikan kalimat berikut:
(1) Ular kobra memiliki bisa yang sangat berbahaya.
(2) Rani sudah bisa mengendarai sepeda sendiri.
Makna kata "bisa" pada kalimat (1) dan (2) berturut-turut adalah …', 'sedang', 'pg', NULL, 9, 'Homonim', 'Menentukan makna kata yang memiliki arti berbeda', 'C2', NULL, NULL, NULL, NULL, 'B (racun ular dan mampu/dapat)', NULL, NULL, 'Pada kalimat (1), "bisa" berarti zat racun dari hewan; sedangkan pada kalimat (2), "bisa" berarti mampu atau dapat.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'mampu dan racun', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'racun ular dan mampu/dapat', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'obat dan pandai', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'gigitan dan berani', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Bentuk kata berimbuhan "me-" yang tepat dari kata dasar "sapu" adalah …', 'sedang', 'pg', NULL, 10, 'Imbuhan me-', 'Menentukan bentuk kata berimbuhan me- yang tepat', 'C1', NULL, NULL, NULL, NULL, 'C (menyapu)', NULL, NULL, 'Kata dasar berawalan huruf "s" luluh ketika bertemu awalan me-, sehingga me- + sapu menjadi "menyapu".', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'mesapu', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'mensapu', false, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'menyapu', true, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'mengsapu', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Jika kata dasar "tulis" mendapat awalan "me-", kata berimbuhan yang terbentuk adalah …', 'sedang', 'pg', NULL, 11, 'Imbuhan me-', 'Menentukan kata berimbuhan dari kata dasar', 'C1', NULL, NULL, NULL, NULL, 'C (menulis)', NULL, NULL, 'Huruf awal "t" pada kata dasar "tulis" luluh apabila diberi imbuhan me-, sehingga menjadi "menulis".', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'metulis', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'mentulis', false, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'menulis', true, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'mengtulis', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Fungsi utama rambu-rambu lalu lintas di jalan raya adalah untuk …', 'mudah', 'pg', NULL, 12, 'Rambu-rambu lalu lintas', 'Menjelaskan fungsi rambu-rambu lalu lintas', 'C1', NULL, NULL, NULL, NULL, 'B (mengatur, memberi peringatan, dan menjaga keselamatan pengguna jalan)', NULL, NULL, 'Rambu lalu lintas dibuat untuk mengatur ketertiban, memberi petunjuk/peringatan, dan menjaga keselamatan semua pengguna jalan.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'menghiasi pinggir jalan agar terlihat indah', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'mengatur, memberi peringatan, dan menjaga keselamatan pengguna jalan', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'membuat kendaraan berjalan semakin cepat', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'menggantikan tugas polisi di kantor', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Saat lampu lalu lintas menyala warna merah, tindakan yang harus dilakukan pengendara adalah …', 'mudah', 'pg', NULL, 13, 'Rambu-rambu lalu lintas', 'Menentukan tindakan saat lampu lalu lintas merah', 'C1', NULL, NULL, NULL, NULL, 'B (berhenti di belakang garis batas)', NULL, NULL, 'Lampu merah berarti berhenti. Pengendara wajib berhenti di belakang garis marka hingga lampu berubah hijau.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'menambah kecepatan kendaraan', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'berhenti di belakang garis batas', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'membunyikan klakson terus-menerus', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'tetap melaju jika jalan terlihat sepi', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Berikut ini yang merupakan ciri utama paragraf argumentasi adalah …', 'sedang', 'pg', NULL, 14, 'Paragraf argumentasi', 'Menentukan ciri paragraf argumentasi', 'C2', NULL, NULL, NULL, NULL, 'B (berisi pendapat penulis yang disertai alasan dan bukti nyata)', NULL, NULL, 'Paragraf argumentasi bertujuan meyakinkan pembaca dengan mengemukakan pendapat yang didukung alasan logis serta fakta/bukti.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'hanya berisi khayalan atau cerita dongeng', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'berisi pendapat penulis yang disertai alasan dan bukti nyata', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'menggambarkan bentuk fisik benda secara rinci tanpa pendapat', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'berisi langkah-langkah memasak makanan', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Kelompok alat transportasi yang seluruhnya digunakan di perairan (laut/sungai) adalah …', 'mudah', 'pg', NULL, 15, 'Alat transportasi', 'Mengelompokkan alat transportasi berdasarkan tempat penggunaannya', 'C2', NULL, NULL, NULL, NULL, 'A (kapal feri, perahu klotok, dan sampan)', NULL, NULL, 'Kapal feri, perahu klotok, dan sampan seluruhnya beroperasi di air (transportasi air).', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'kapal feri, perahu klotok, dan sampan', true, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'kereta api, bus kota, dan perahu', false, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'pesawat terbang, helikopter, dan kapal laut', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'sepeda motor, delman, dan rakit', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Awalan "ber-" pada kata "bersepeda" dalam kalimat "Dina bersepeda ke taman" memiliki arti …', 'sedang', 'pg', NULL, 16, 'Imbuhan ber-', 'Menjelaskan fungsi awalan ber-', 'C2', NULL, NULL, NULL, NULL, 'B (menggunakan atau mengendarai sepeda)', NULL, NULL, 'Kata "bersepeda" bermakna melakukan kegiatan menggunakan atau naik sepeda.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'mempunyai sepeda', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'menggunakan atau mengendarai sepeda', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'menjual sepeda', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'memperbaiki sepeda', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Dalam kalimat "Daun kelapa tampak meliuk tertiup angin pantai", arti kata "meliuk" adalah …', 'sedang', 'pg', NULL, 17, 'Kosakata', 'Menentukan arti kata meliuk', 'C2', NULL, NULL, NULL, NULL, 'B (berkelok-kelok atau melengkung ke kiri dan ke kanan)', NULL, NULL, 'Menurut KBBI, meliuk berarti berkelok atau melengkung ke sisi kiri dan kanan secara gemulai.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'gugur ke tanah dengan cepat', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'berkelok-kelok atau melengkung ke kiri dan ke kanan', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'berubah warna menjadi kecokelatan', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'berdiri tegak dan kaku', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Hal utama yang menjadi gagasan dasar dan dibahas dalam suatu paragraf disebut …', 'sedang', 'pg', NULL, 18, 'Ide pokok', 'Menentukan pengertian ide pokok', 'C3', NULL, NULL, NULL, NULL, 'B (ide pokok)', NULL, NULL, 'Ide pokok (gagasan utama) adalah inti pembicaraan yang menjadi dasar pengembangan sebuah paragraf.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'kalimat penjelas', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'ide pokok', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'tanda baca', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'judul karangan', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Kalimat yang bertujuan mengajak, membujuk, atau memengaruhi pembaca agar melakukan suatu hal disebut …', 'sulit', 'pg', NULL, 19, 'Kalimat persuasif', 'Menjelaskan pengertian kalimat persuasif', 'C3', NULL, NULL, NULL, NULL, 'C (kalimat persuasif)', NULL, NULL, 'Kalimat persuasif bersifat mengajak atau membujuk orang lain, biasanya ditandai kata seperti "ayo" atau "mari".', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'kalimat berita', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'kalimat tanya', false, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'kalimat persuasif', true, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'kalimat majemuk', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Jika kelompokmu ingin melakukan wawancara tentang cara merawat gigi yang sehat, narasumber yang paling tepat untuk diwawancarai adalah …', 'mudah', 'pg', NULL, 20, 'Wawancara', 'Menentukan narasumber sesuai topik wawancara', 'C2', NULL, NULL, NULL, NULL, 'B (dokter gigi)', NULL, NULL, 'Narasumber harus ahli atau memahami topik yang ditanyakan. Untuk kesehatan gigi, narasumber yang tepat adalah dokter gigi.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'masinis kereta api', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'dokter gigi', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'arsitek bangunan', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'petugas pemadam kebakaran', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Kata yang berfungsi menghubungkan dua kata, frasa, atau klausa dalam kalimat disebut kata hubung atau …', 'sedang', 'isian', NULL, 21, 'Kalimat konjungsi', 'Menyebutkan istilah kata hubung yang tepat', 'C2', NULL, NULL, NULL, NULL, 'konjungsi', '["konjungsi","kata penghubung"]', NULL, 'Dalam tata bahasa Indonesia, kata hubung memiliki istilah resmi yaitu konjungsi.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Kalimat yang terdiri atas dua kalimat tunggal atau lebih yang digabungkan menggunakan kata hubung disebut kalimat …', 'mudah', 'isian', NULL, 22, 'Kalimat majemuk', 'Menjelaskan pengertian kalimat majemuk', 'C1', NULL, NULL, NULL, NULL, 'majemuk', '["majemuk","kalimat majemuk"]', NULL, 'Kalimat majemuk dibentuk dengan menggabungkan dua atau lebih klausa/kalimat tunggal memakai konjungsi.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Jenis paragraf yang menggambarkan suatu objek, tempat, atau peristiwa secara rinci sehingga pembaca seolah-olah melihat atau merasakannya sendiri disebut paragraf …', 'sedang', 'isian', NULL, 23, 'Paragraf deskripsi', 'Menyebut jenis paragraf yang menggambarkan suatu objek', 'C2', NULL, NULL, NULL, NULL, 'deskripsi', '["deskripsi","paragraf deskripsi"]', NULL, 'Paragraf deskripsi melukiskan objek secara jelas menggunakan pengindraan (penglihatan, pendengaran, perasaan).', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Pada petunjuk denah jalan, kata arah yang berarti berjalan terus ke depan tanpa berbelok ke kiri atau ke kanan adalah …', 'mudah', 'isian', NULL, 24, 'Kata arah', 'Menentukan kata arah yang berarti berjalan tanpa berbelok', 'C1', NULL, NULL, NULL, NULL, 'lurus', '["lurus","jalan lurus"]', NULL, '"Lurus" berarti terus menuju satu arah ke depan tanpa berbelok.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Alat keselamatan yang wajib dipakai untuk melindungi kepala saat mengendarai sepeda motor adalah …', 'mudah', 'isian', NULL, 25, 'Keselamatan berkendara', 'Menyebutkan alat pelindung kepala saat berkendara', 'C1', NULL, NULL, NULL, NULL, 'helm', '["helm","helem"]', NULL, 'Helm berstandar SNI berfungsi melindungi kepala pengendara sepeda motor dari benturan.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Dalam kegiatan wawancara, orang yang memberikan informasi dan menjawab pertanyaan disebut …', 'mudah', 'isian', NULL, 26, 'Wawancara', 'Menyebutkan orang yang memberikan jawaban dalam wawancara', 'C1', NULL, NULL, NULL, NULL, 'narasumber', '["narasumber","nara sumber","informan"]', NULL, 'Pewawancara adalah orang yang mengajukan pertanyaan, sedangkan yang menjawab dan memberi informasi adalah narasumber.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Majas yang mengumpamakan benda mati seolah-olah dapat bertingkah laku seperti manusia (contoh: "ombak berkejaran di tepi pantai") disebut majas …', 'sedang', 'isian', NULL, 27, 'Majas personifikasi', 'Mengidentifikasi majas yang mengumpamakan benda mati seolah-olah hidup seperti manusia', 'C2', NULL, NULL, NULL, NULL, 'personifikasi', '["personifikasi","majas personifikasi"]', NULL, 'Majas personifikasi memberikan sifat-sifat manusia kepada benda mati atau makhluk bukan manusia.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Pada kalimat "Ibu memotong sayur bayam di dapur", yang berkedudukan sebagai objek (O) adalah …', 'mudah', 'isian', NULL, 28, 'Kalimat transitif', 'Menentukan objek dalam sebuah kalimat', 'C1', NULL, NULL, NULL, NULL, 'sayur bayam', '["sayur bayam","bayam"]', NULL, 'Struktur kalimat tersebut: Ibu (Subjek), memotong (Predikat), sayur bayam (Objek), di dapur (Keterangan tempat).', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Berbeda dengan kalimat transitif, unsur kalimat yang tidak diperlukan dalam kalimat intransitif adalah …', 'sedang', 'isian', NULL, 29, 'Kalimat transitif dan intransitif', 'Menjelaskan unsur yang tidak diperlukan dalam kalimat intransitif', 'C2', NULL, NULL, NULL, NULL, 'objek', '["objek","unsur objek","o"]', NULL, 'Kalimat intransitif adalah kalimat yang tidak membutuhkan objek (hanya S-P atau S-P-K).', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Kata kerja (predikat) dalam kalimat "Kakak mencuci piring di dapur" adalah …', 'mudah', 'isian', NULL, 30, 'Kata kerja', 'Menentukan kata kerja dalam sebuah kalimat', 'C2', NULL, NULL, NULL, NULL, 'mencuci', '["mencuci","cuci"]', NULL, '"Mencuci" menyatakan tindakan atau perbuatan yang dilakukan oleh Kakak.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Bagaimana sikap yang tepat apabila barang kesukaanmu dipakai oleh adik tanpa izin?', 'sedang', 'uraian', 'Uraian Singkat', 31, 'Sikap dalam kehidupan sehari-hari', 'Menjelaskan sikap yang tepat ketika barang kesukaan dipakai adik tanpa izin', 'C2', NULL, NULL, NULL, NULL, 'Menegur adik dengan tenang dan lemah lembut (tidak membentak), lalu menasihatinya agar meminta izin terlebih dahulu sebelum meminjam barang orang lain.', NULL, 'Menyebutkan sikap sabar/tidak marah-marah + menasihati adik untuk izin sebelum meminjam.', 'Menyampaikan perasaan dengan kata-kata yang sopan dan menasihati adik agar terbiasa meminta izin akan menjaga kerukunan di rumah.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Buatlah 1 (satu) contoh kalimat majemuk setara menggunakan kata hubung (seperti dan, tetapi, atau)! ', 'sedang', 'uraian', 'Uraian Singkat', 32, 'Kalimat majemuk setara', 'Membuat contoh kalimat majemuk setara', 'C2', NULL, NULL, NULL, NULL, 'Contoh: Rani rajin membaca buku, sedangkan adiknya gemar menggambar. (atau: Andi ingin bermain bola, tetapi di luar sedang hujan.)', NULL, 'Kalimat terdiri dari dua klausa setara yang dihubungkan konjungsi setara (dan, atau, tetapi, sedangkan).', 'Kalimat majemuk setara menggabungkan dua kalimat tunggal yang kedudukannya sejajar dengan kata hubung dan, tetapi, atau, lalu, serta sedangkan.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Buatlah 1 (satu) contoh kalimat transitif yang lengkap dengan Subjek, Predikat, dan Objek!', 'sedang', 'uraian', 'Uraian Singkat', 33, 'Kalimat transitif', 'Membuat contoh kalimat transitif dengan benar', 'C2', NULL, NULL, NULL, NULL, 'Contoh: Siti menyiram tanaman bunga di halaman.', NULL, 'Mengandung Subjek + Predikat kata kerja transitif + Objek yang jelas.', 'Pada contoh "Siti (S) menyiram (P) tanaman bunga (O)", kata "tanaman bunga" berfungsi sebagai objek yang dikenai tindakan menyiram.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Buatlah 1 (satu) contoh kalimat intransitif (kalimat yang tidak memerlukan objek)!', 'mudah', 'uraian', 'Uraian Singkat', 34, 'Kalimat intransitif', 'Membuat contoh kalimat intransitif dengan benar', 'C1', NULL, NULL, NULL, NULL, 'Contoh: Adik menangis dengan keras. (atau: Burung berkicau di atas pohon.)', NULL, 'Kalimat memiliki Subjek + Predikat intransitif dan TIDAK menggunakan objek.', 'Kata kerja "menangis" atau "berkicau" tidak memerlukan objek sehingga termasuk kalimat intransitif.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Temanmu tampak gemetar dan ketakutan karena memiliki fobia terhadap tempat gelap saat lampu sekolah padam. Tuliskan 2 tindakan yang tepat untuk membantunya!', 'sulit', 'uraian', 'Uraian Singkat', 35, 'Fobia', 'Tindakan yang tepat untuk membantu teman yang mengalami fobia', 'C3', NULL, NULL, NULL, NULL, '1) Tidak mengejek atau menakut-nakutinya.
2) Menemani, menenangkan dengan mengajak tarik napas perlahan, serta menyalakan cahaya/membawanya ke tempat yang terang.', NULL, 'Menyebutkan sikap empati (tidak mengejek) + tindakan menenangkan/menemani/menghindarkan dari pemicu fobia.', 'Orang yang mengalami fobia membutuhkan rasa aman dan dukungan teman, bukan ejekan.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;

  SELECT id INTO v_subject_id FROM subjects WHERE slug = 'budaya-kutai';
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Tokoh ulama yang dikenal berjasa menyebarkan agama Islam di Kerajaan Kutai Kartanegara pada masa Raja Aji Mahkota adalah …', 'mudah', 'pg', NULL, 1, 'Datuk Tunggang Parangan', 'Mengidentifikasi tokoh dan perannya dalam sejarah penyebaran Islam di Kutai', 'C1', NULL, NULL, NULL, NULL, 'B (Datuk Tunggang Parangan)', NULL, NULL, 'Datuk Tunggang Parangan (Habib Hasyim bin Musayyah) adalah ulama penyebar agama Islam di Kerajaan Kutai Kartanegara pada masa pemerintahan Raja Aji Mahkota.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Pangeran Diponegoro', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Datuk Tunggang Parangan', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Sultan Hasanuddin', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Patih Gajah Mada', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Nilai keteladanan utama yang dapat kita contoh dari perjuangan Datuk Tunggang Parangan dalam berdakwah di Kutai adalah …', 'mudah', 'pg', NULL, 2, 'Datuk Tunggang Parangan', 'Menentukan nilai keteladanan tokoh', 'C2', NULL, NULL, NULL, NULL, 'B (sabar, bijaksana, dan penuh keberanian dalam menyebarkan kebaikan)', NULL, NULL, 'Datuk Tunggang Parangan berdakwah dengan sikap sabar, bijaksana, dan damai sehingga ajaran Islam dapat diterima baik oleh raja dan rakyat Kutai.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'mudah menyerah saat menghadapi tantangan', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'sabar, bijaksana, dan penuh keberanian dalam menyebarkan kebaikan', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'memaksa masyarakat meninggalkan pekerjaannya', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'mementingkan diri sendiri daripada masyarakat', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Tujuan kita mempelajari sejarah tokoh daerah Kutai serta cara menghargainya adalah …', 'sedang', 'pg', NULL, 3, 'Datuk Tunggang Parangan', 'Menjelaskan tujuan mempelajari sejarah dan sikap menghargai tokoh', 'C2', NULL, NULL, NULL, NULL, 'B (untuk mengenal jasa pendahulu dan meneladani nilai baiknya dalam kehidupan)', NULL, NULL, 'Mempelajari sejarah tokoh daerah membantu siswa mengenal jati diri budaya, menghormati jasa tokoh, dan menerapkan teladan positifnya.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'agar melupakan budaya masa kini', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'untuk mengenal jasa pendahulu dan meneladani nilai baiknya dalam kehidupan', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'supaya hanya menghafal tahun tanpa memahami maknanya', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'agar tidak perlu belajar pelajaran lain', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Tradisi Naek Ayun dalam masyarakat Kutai merupakan upacara adat yang dilaksanakan untuk …', 'mudah', 'pg', NULL, 4, 'Tradisi Naek Ayun', 'Mengidentifikasi pengertian dan hubungan tradisi dengan kehidupan bayi', 'C1', NULL, NULL, NULL, NULL, 'B (mendoakan dan menaikkan bayi pertama kali ke dalam ayunan adat)', NULL, NULL, 'Tradisi Naek Ayun (Naik Ayun) adalah upacara adat Kutai bagi bayi yang baru pertama kali dinaikkan ke ayunan berhias kain adat sambil didoakan keselamatannya.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'menyambut musim panen padi di ladang', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'mendoakan dan menaikkan bayi pertama kali ke dalam ayunan adat', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'perlombaan perahu di Sungai Mahakam', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'acara perpisahan siswa kelas akhir', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Nilai budaya yang terkandung dalam tradisi Naek Ayun bagi keluarga dan masyarakat adalah …', 'sedang', 'pg', NULL, 5, 'Tradisi Naek Ayun', 'Memahami nilai budaya dan tujuan pelestarian tradisi', 'C2', NULL, NULL, NULL, NULL, 'B (ungkapan rasa syukur, doa keselamatan anak, dan kebersamaan keluarga)', NULL, NULL, 'Naek Ayun mencerminkan rasa syukur kepada Tuhan atas kelahiran anak, doa agar tumbuh sehat dan berbakti, serta mempererat silaturahmi warga.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'persaingan untuk pamer kekayaan', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'ungkapan rasa syukur, doa keselamatan anak, dan kebersamaan keluarga', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'larangan bagi anak untuk bermain di luar rumah', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'kebiasaan membuang makanan ke sungai', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Sikap yang paling tepat ditunjukkan ketika menghadiri upacara tradisi Naek Ayun di lingkungan sekitar adalah …', 'mudah', 'pg', NULL, 6, 'Tradisi Naek Ayun', 'Menentukan sikap yang tepat saat mengikuti tradisi', 'C2', NULL, NULL, NULL, NULL, 'B (mengikuti acara dengan tertib, sopan, dan menghormati prosesi adat)', NULL, NULL, 'Menjaga ketertiban, bersikap sopan, dan ikut berdoa menunjukkan penghargaan terhadap tradisi adat masyarakat Kutai.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'bermain kejar-kejaran dan membuat gaduh saat doa berlangsung', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'mengikuti acara dengan tertib, sopan, dan menghormati prosesi adat', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'mengejek perlengkapan adat yang dipakai', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'pulang sebelum acara dimulai karena bosan', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Permainan tradisional anak khas Kutai yang dimainkan secara beregu dengan menjaga garis petak agar lawan tidak lolos (mirip gobak sodor) adalah …', 'mudah', 'pg', NULL, 7, 'Asen Naga', 'Mengidentifikasi Asen Naga sebagai permainan tradisional anak Kutai', 'C1', NULL, NULL, NULL, NULL, 'B (Asen Naga)', NULL, NULL, 'Asen Naga merupakan permainan tradisional masyarakat Kutai yang dimainkan secara berkelompok di lapangan bergaris petak.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Egrang', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Asen Naga', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Congklak', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Bakiak', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Berikut ini yang merupakan manfaat bermain permainan tradisional Asen Naga bersama teman adalah …', 'mudah', 'pg', NULL, 8, 'Asen Naga', 'Memahami manfaat permainan tradisional', 'C2', NULL, NULL, NULL, NULL, 'B (melatih kelincahan, kerja sama tim, dan mempererat persahabatan)', NULL, NULL, 'Permainan Asen Naga melibatkan aktivitas fisik berlari dan menghindar secara tim sehingga melatih ketangkasan, kekompakan, dan kebersamaan.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'membuat tubuh malas bergerak', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'melatih kelincahan, kerja sama tim, dan mempererat persahabatan', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'memicu pertengkaran antarpemain', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'menghabiskan kuota internet', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Dalam bermain Asen Naga, apabila seorang pemain tersentuh oleh penjaga garis maka sikap sportif yang harus dilakukan adalah …', 'sedang', 'pg', NULL, 9, 'Asen Naga', 'Menentukan aturan, sikap sportif, dan cara mengenalkan permainan', 'C2', NULL, NULL, NULL, NULL, 'B (mengakui dengan jujur sesuai aturan dan bergantian peran menjaga garis)', NULL, NULL, 'Sportivitas dalam permainan tradisional ditunjukkan dengan jujur mengakui kekalahan, mematuhi aturan, dan menghargai lawan.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'tetap berlari dan berpura-pura tidak tersentuh', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'mengakui dengan jujur sesuai aturan dan bergantian peran menjaga garis', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'memarahi penjaga garis di lapangan', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'membatalkan permainan secara sepihak', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Pakaian adat kebesaran Kesultanan Kutai Kartanegara yang dahulu dipakai oleh kalangan bangsawan dan kini sering digunakan dalam acara pernikahan adat adalah …', 'mudah', 'pg', NULL, 10, 'Baju Kustim', 'Mengenali nama dan kedudukan Baju Kustim sebagai busana adat Kutai', 'C1', NULL, NULL, NULL, NULL, 'B (Baju Kustim)', NULL, NULL, 'Baju Kustim adalah pakaian adat kebesaran Kutai berbahan beludru hitam dengan hiasan keemasan (pasmen) yang digunakan pada upacara besar/pernikahan.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Baju Bodo', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Baju Kustim', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Ulos', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Kebaya Encim', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Busana adat Kutai yang berbentuk rompi/baju berlengan pendek berwarna cerah (biasanya kuning atau hijau) dan dikenakan dalam upacara adat atau keagamaan disebut …', 'sedang', 'pg', NULL, 11, 'Antakusuma', 'Mengenali Antakusuma dalam materi busana adat Kutai', 'C1', NULL, NULL, NULL, NULL, 'A (Antakusuma)', NULL, NULL, 'Baju Antakusuma (Sakai) merupakan salah satu busana adat Kutai yang dikenakan pada upacara adat dan acara resmi kesultanan.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Antakusuma', true, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Beskap', false, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Koteka', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Baju Kurung Melayu', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Busana adat Kutai berupa baju kurung/jas tutup berkerah tegak dengan kain jelapah dan hiasan kancing di bagian dada yang dipakai dalam acara resmi daerah disebut …', 'mudah', 'pg', NULL, 12, 'Takwo', 'Mengidentifikasi Takwo sebagai busana adat Kutai', 'C1', NULL, NULL, NULL, NULL, 'A (Baju Takwo)', NULL, NULL, 'Baju Takwo adalah busana adat khas Kutai (ada Takwo Biasa, Takwo Sebelah, dan Takwo Kustim) yang sering dikenakan pada acara adat maupun kegiatan resmi.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Baju Takwo', true, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Baju Safari', false, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Baju Pesa''an', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Lurik', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Pakaian adat Kutai yang modelnya mirip baju cina berlengan panjang dengan kancing menyamping dan sering ditetapkan sebagai pakaian dinas daerah di Kalimantan Timur adalah …', 'mudah', 'pg', NULL, 13, 'Miskat', 'Mengidentifikasi Miskat sebagai busana adat Kutai', 'C1', NULL, NULL, NULL, NULL, 'B (Baju Miskat)', NULL, NULL, 'Baju Miskat adalah busana adat Kutai yang menjadi pakaian resmi/dinas pada hari tertentu di Kalimantan Timur.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Surjan', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Baju Miskat', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Payas Agung', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Teluk Belanga', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Mengapa kita perlu mengenakan dan mengenal pakaian adat Kutai seperti Kustim, Takwo, dan Miskat pada peringatan hari besar daerah?', 'sedang', 'pg', NULL, 14, 'Pakaian adat Kutai', 'Memahami fungsi budaya, identitas, dan pelestarian pakaian adat', 'C2', NULL, NULL, NULL, NULL, 'B (Sebagai wujud cinta, kebanggaan terhadap identitas budaya daerah, dan upaya pelestarian)', NULL, NULL, 'Pakaian adat mencerminkan identitas budaya lokal sehingga memakainya merupakan bentuk penghargaan dan pelestarian warisan daerah.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Agar terlihat lebih mahal dari daerah lain', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Sebagai wujud cinta, kebanggaan terhadap identitas budaya daerah, dan upaya pelestarian', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Karena dilarang memakai seragam sekolah', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Agar pakaian modern tidak laku dijual', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Siapakah yang bertanggung jawab untuk menjaga dan melestarikan budaya serta bahasa Kutai agar tidak punah?', 'sedang', 'pg', NULL, 15, 'Pelestarian budaya', 'Menentukan tanggung jawab masyarakat dalam menjaga budaya Kutai', 'C2', NULL, NULL, NULL, NULL, 'C (Seluruh lapisan masyarakat, termasuk anak-anak dan generasi muda)', NULL, NULL, 'Pelestarian budaya daerah merupakan tanggung jawab bersama seluruh masyarakat dari anak-anak hingga orang tua.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Hanya kepala desa dan camat', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Hanya para tetua adat di museum', false, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Seluruh lapisan masyarakat, termasuk anak-anak dan generasi muda', true, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Wisatawan yang datang berkunjung', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Jika kamu ingin mengetahui sejarah tradisi Naek Ayun secara tepat, sumber informasi tepercaya dan cara wawancara yang baik adalah …', 'sedang', 'pg', NULL, 16, 'Sumber informasi budaya', 'Menentukan sumber informasi yang tepercaya dan cara melakukan wawancara', 'C2', NULL, NULL, NULL, NULL, 'B (mewawancarai tokoh adat atau sesepuh Kutai dengan bahasa yang sopan)', NULL, NULL, 'Tokoh adat atau budayawan daerah merupakan narasumber tepercaya, dan wawancara harus dilakukan dengan daftar pertanyaan serta sikap sopan.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'menebak sendiri tanpa bertanya kepada siapa pun', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'mewawancarai tokoh adat atau sesepuh Kutai dengan bahasa yang sopan', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'menyalin cerita fiksi yang tidak jelas sumbernya', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'memaksa narasumber menjawab dengan tergesa-gesa', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Informasi penting yang perlu dicatat saat mendokumentasikan permainan Asen Naga untuk laporan sekolah adalah …', 'sedang', 'pg', NULL, 17, 'Dokumentasi Asen Naga', 'Menentukan informasi yang diperlukan untuk mendokumentasikan permainan', 'C2', NULL, NULL, NULL, NULL, 'B (nama permainan, jumlah pemain, alat/garis arena, aturan bermain, dan manfaatnya)', NULL, NULL, 'Dokumentasi permainan tradisional yang lengkap memuat nama, asal daerah, perlengkapan/lapangan, cara bermain, aturan, dan nilai manfaatnya.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'harga makanan di kantin sekolah', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'nama permainan, jumlah pemain, alat/garis arena, aturan bermain, dan manfaatnya', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'merek sepatu yang dipakai siswa', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'jadwal pelajaran matematika di kelas', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Di kelasmu ada teman yang berasal dari suku Kutai dan ada pula yang berasal dari suku lain dengan tradisi berbeda. Sikap yang harus kamu tunjukkan adalah …', 'sulit', 'pg', NULL, 18, 'Keragaman tradisi', 'Menunjukkan sikap menghargai variasi tradisi di masyarakat', 'C3', NULL, NULL, NULL, NULL, 'B (saling menghormati, berteman akrab, dan mau belajar mengenal budaya teman)', NULL, NULL, 'Menghargai keragaman tradisi menciptakan kerukunan dan persatuan di lingkungan sekolah dan masyarakat.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'menganggap hanya tradisi sendiri yang paling bagus', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'saling menghormati, berteman akrab, dan mau belajar mengenal budaya teman', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'menghindari teman yang berbeda bahasa daerah', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'menertawakan nama pakaian adat teman', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Tindakan nyata yang dapat dilakukan siswa kelas 4 untuk melestarikan pakaian adat dan permainan tradisional Kutai adalah …', 'sulit', 'pg', NULL, 19, 'Penerapan budaya', 'Menerapkan sikap menjaga pakaian adat dan melestarikan permainan', 'C3', NULL, NULL, NULL, NULL, 'B (memakai baju Miskat/Takwo pada hari budaya sekolah dan mengajak teman bermain Asen Naga saat istirahat)', NULL, NULL, 'Pelestarian budaya dimulai dari praktik sehari-hari seperti memakai busana adat saat acara sekolah dan memopulerkan permainan tradisional bersama teman.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'menyimpan pakaian adat tanpa pernah mengenalkannya dan hanya bermain gim di ponsel', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'memakai baju Miskat/Takwo pada hari budaya sekolah dan mengajak teman bermain Asen Naga saat istirahat', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'menolak tampil saat pentas seni daerah', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'melupakan kosakata bahasa Kutai', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Mengenal tokoh sejarah Datuk Tunggang Parangan serta beragam busana adat Kutai membuat kita semakin sadar untuk …', 'sedang', 'pg', NULL, 20, 'Sejarah dan pakaian adat', 'Menghubungkan pengetahuan budaya dengan kegiatan pelestarian', 'C2', NULL, NULL, NULL, NULL, 'B (merawat peninggalan sejarah dan aktif melestarikan budaya Kutai)', NULL, NULL, 'Pengetahuan tentang sejarah dan warisan budaya menumbuhkan rasa memiliki untuk terus menjaga kelestariannya.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'meninggalkan adat istiadat lama', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'merawat peninggalan sejarah dan aktif melestarikan budaya Kutai', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'mengganti semua pakaian adat dengan budaya asing', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'tidak peduli terhadap kesenian daerah', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Salah satu nilai keteladanan dari tokoh Datuk Tunggang Parangan dalam menyebarkan agama Islam di Kutai adalah sikap sabar dan …', 'mudah', 'isian', NULL, 21, 'Datuk Tunggang Parangan', 'Menyebutkan nilai keteladanan tokoh sejarah', 'C2', NULL, NULL, NULL, NULL, 'bijaksana (atau berani/ikhlas/damai)', '["bijaksana","berani","ikhlas","damai","jujur","tekun"]', NULL, 'Datuk Tunggang Parangan dikenal memiliki sikap sabar, bijaksana, tekun, dan damai dalam berdakwah.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Kegiatan utama dalam tradisi Naek Ayun adalah menaikkan … ke dalam ayunan berhias kain adat sambil membacakan doa keselamatan.', 'mudah', 'isian', NULL, 22, 'Tradisi Naek Ayun', 'Menyebutkan kegiatan utama dalam tradisi Naek Ayun', 'C1', NULL, NULL, NULL, NULL, 'bayi', '["bayi","seorang bayi","bayi/anak"]', NULL, 'Upacara Naek Ayun dilaksanakan khusus untuk bayi agar kelak tumbuh sehat dan selamat.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Generasi muda dan masyarakat Kutai merupakan pewaris tradisi Naek Ayun yang bertugas melestarikannya agar tradisi tersebut tidak …', 'sedang', 'isian', NULL, 23, 'Tradisi Naek Ayun', 'Mengidentifikasi pewaris tradisi dan tujuan pelestariannya', 'C2', NULL, NULL, NULL, NULL, 'punah (atau hilang)', '["punah","hilang","luntur","terlupakan"]', NULL, 'Pelestarian tradisi oleh generasi penerus bertujuan agar warisan budaya tidak punah atau hilang ditelan zaman.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Asen Naga adalah permainan tradisional anak-anak yang berasal dari daerah …', 'mudah', 'isian', NULL, 24, 'Asen Naga', 'Menyebutkan asal permainan dan aturan yang harus dipahami', 'C1', NULL, NULL, NULL, NULL, 'Kutai (Kalimantan Timur)', '["kutai","kalimantan timur","kutai kartanegara"]', NULL, 'Asen Naga merupakan permainan rakyat tradisional yang berasal dari Kutai, Kalimantan Timur.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Baju Kustim merupakan busana adat kebesaran yang berasal dari daerah …', 'mudah', 'isian', NULL, 25, 'Baju Kustim', 'Menyebutkan daerah asal busana adat', 'C1', NULL, NULL, NULL, NULL, 'Kutai (Kalimantan Timur)', '["kutai","kalimantan timur","kutai kartanegara"]', NULL, 'Baju Kustim adalah pakaian adat kebesaran Kesultanan Kutai Kartanegara, Kalimantan Timur.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Busana adat Kutai berupa rompi berlengan pendek dengan warna cerah yang dikenakan dalam upacara adat disebut baju …', 'mudah', 'isian', NULL, 26, 'Antakusuma', 'Menyebutkan jenis busana dalam materi adat Kutai', 'C1', NULL, NULL, NULL, NULL, 'Antakusuma', '["antakusuma","baju antakusuma","sakai"]', NULL, 'Baju Antakusuma termasuk bagian dari busana adat tradisional masyarakat Kutai.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Pakaian adat Kutai berupa baju berkerah tegak yang memiliki variasi Takwo Biasa dan Takwo Sebelah disebut baju …', 'mudah', 'isian', NULL, 27, 'Takwo', 'Menyebutkan jenis pakaian adat Kutai', 'C1', NULL, NULL, NULL, NULL, 'Takwo', '["takwo","baju takwo"]', NULL, 'Baju Takwo adalah busana adat Kutai yang sering dikenakan pada acara resmi maupun adat.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Pakaian adat Kutai berkancing miring ke samping yang sering dipakai sebagai baju dinas resmi daerah Kalimantan Timur disebut baju …', 'mudah', 'isian', NULL, 28, 'Miskat', 'Menyebutkan jenis pakaian adat Kutai', 'C1', NULL, NULL, NULL, NULL, 'Miskat', '["miskat","baju miskat"]', NULL, 'Baju Miskat ditetapkan sebagai busana khas daerah Kalimantan Timur yang berasal dari budaya Kutai.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Pakaian adat Kutai harus kita jaga dan banggakan karena merupakan … budaya dari leluhur bangsa.', 'sedang', 'isian', NULL, 29, 'Pakaian adat Kutai', 'Menjelaskan pakaian adat sebagai warisan budaya', 'C2', NULL, NULL, NULL, NULL, 'warisan', '["warisan","identitas","kekayaan"]', NULL, 'Pakaian adat merupakan warisan dan identitas budaya daerah yang patut dijaga.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Untuk mengetahui cerita asli tentang budaya Kutai, kita dapat bertanya atau melakukan … dengan tokoh adat setempat.', 'sedang', 'isian', NULL, 30, 'Pelestarian budaya', 'Menentukan sumber informasi dan tindakan pelestarian budaya', 'C2', NULL, NULL, NULL, NULL, 'wawancara', '["wawancara","tanya jawab"]', NULL, 'Wawancara kepada tokoh adat atau sesepuh daerah adalah cara tepat menggali informasi budaya yang akurat.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Siapakah Datuk Tunggang Parangan dan apa peran pentingnya dalam sejarah Kutai?', 'sedang', 'uraian', 'Uraian Singkat', 31, 'Datuk Tunggang Parangan', 'Menjelaskan tokoh dan perannya dalam sejarah Kutai', 'C2', NULL, NULL, NULL, NULL, 'Datuk Tunggang Parangan adalah seorang ulama besar yang berperan menyebarkan agama Islam secara damai di Kerajaan Kutai Kartanegara pada masa Raja Aji Mahkota.', NULL, 'Menyebutkan identitas sebagai ulama/tokoh penyebar agama Islam + di Kerajaan Kutai.', 'Melalui dakwah Datuk Tunggang Parangan, ajaran Islam berkembang pesat di Kerajaan Kutai Kartanegara.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Jelaskan pengertian tradisi Naek Ayun pada masyarakat Kutai!', 'sedang', 'uraian', 'Uraian Singkat', 32, 'Tradisi Naek Ayun', 'Menjelaskan pengertian tradisi Naek Ayun', 'C2', NULL, NULL, NULL, NULL, 'Tradisi Naek Ayun adalah upacara adat masyarakat Kutai saat menaikkan bayi untuk pertama kalinya ke dalam ayunan berhias kain adat, disertai pembacaan doa agar bayi sehat, selamat, dan menjadi anak yang baik.', NULL, 'Menjelaskan upacara adat untuk bayi + dinaikkan ke ayunan + doa keselamatan/syukur.', 'Tradisi Naek Ayun merupakan bentuk syukur keluarga dan doa bersama untuk keselamatan serta masa depan bayi.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Sebutkan 3 (tiga) manfaat memainkan permainan tradisional Asen Naga bersama teman!', 'sedang', 'uraian', 'Uraian Singkat', 33, 'Asen Naga', 'Menyebutkan manfaat permainan tradisional', 'C2', NULL, NULL, NULL, NULL, '1) Menyehatkan tubuh dan melatih kelincahan.
2) Melatih kerja sama dan kekompakan tim.
3) Menumbuhkan sikap jujur, sportif, dan mempererat persahabatan.', NULL, 'Menyebutkan minimal 3 manfaat relevan (fisik/kesehatan, kerja sama, sportivitas/sosial).', 'Permainan tradisional seperti Asen Naga bermanfaat untuk kebugaran fisik, keterampilan sosial, dan pelestarian budaya.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Sebutkan 4 (empat) nama pakaian adat khas Kutai yang telah kamu pelajari!', 'mudah', 'uraian', 'Uraian Singkat', 34, 'Pakaian adat Kutai', 'Menyebutkan empat nama pakaian adat Kutai', 'C1', NULL, NULL, NULL, NULL, '1) Baju Kustim, 2) Baju Antakusuma, 3) Baju Takwo, 4) Baju Miskat.', NULL, 'Menyebutkan keempat nama busana adat Kutai dengan benar.', 'Empat pakaian adat Kutai sesuai materi pembelajaran adalah Baju Kustim, Antakusuma, Takwo, dan Miskat.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Tuliskan 3 (tiga) cara yang dapat kamu lakukan sebagai pelajar untuk melestarikan budaya daerah Kutai!', 'sulit', 'uraian', 'Uraian Singkat', 35, 'Pelestarian budaya Kutai', 'Menguraikan cara melestarikan budaya daerah', 'C3', NULL, NULL, NULL, NULL, '1) Mempelajari sejarah, bahasa, dan tradisi daerah Kutai di sekolah.
2) Memakai pakaian adat Kutai pada kegiatan peringatan hari besar atau acara sekolah.
3) Memainkan dan mengenalkan permainan tradisional seperti Asen Naga kepada teman-teman.', NULL, 'Menyebutkan minimal 3 aksi nyata pelestarian budaya daerah oleh siswa.', 'Generasi muda dapat melestarikan budaya dengan cara mempelajarinya, mempraktikkannya, dan bangga mengenalkannya kepada orang lain.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;

  SELECT id INTO v_subject_id FROM subjects WHERE slug = 'pendidikan-pancasila';
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Berikut ini yang merupakan contoh identitas masyarakat di lingkungan tempat tinggal dalam kehidupan sehari-hari adalah …', 'mudah', 'pg', NULL, 1, 'Identitas masyarakat', 'Peserta didik dapat mengidentifikasi contoh identitas masyarakat dalam kehidupan sehari-hari.', 'C2', NULL, NULL, NULL, NULL, 'B (bahasa daerah, pakaian adat, dan tradisi setempat)', NULL, NULL, 'Identitas masyarakat tampak dari ciri khas yang dimiliki bersama seperti bahasa daerah, pakaian adat, kesenian, dan tradisi setempat.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'merek pensil yang dijual di toko', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'bahasa daerah, pakaian adat, dan tradisi setempat', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'harga bahan bakar di SPBU', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'warna cat gedung perkantoran kota', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Pasangan suku bangsa asli yang berasal dari Indonesia berikut ini adalah …', 'mudah', 'pg', NULL, 2, 'Keberagaman suku bangsa', 'Peserta didik dapat menyebutkan contoh suku bangsa yang ada di Indonesia.', 'C1', NULL, NULL, NULL, NULL, 'A (Suku Kutai, Dayak, Jawa, dan Bugis)', NULL, NULL, 'Indonesia memiliki beragam suku bangsa Nusantara antara lain Suku Kutai, Dayak, Jawa, Bugis, Sunda, Banjar, Minang, dan Batak.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Suku Kutai, Dayak, Jawa, dan Bugis', true, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Suku Kutai, Melayu, dan Suku Viking', false, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Suku Banjar, Sunda, dan Suku Aztec', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Suku Minang, Batak, dan Suku Maori', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Bahasa daerah yang berasal dari Provinsi Kalimantan Timur adalah …', 'mudah', 'pg', NULL, 3, 'Keberagaman bahasa daerah', 'Peserta didik dapat mengidentifikasi bahasa daerah yang berasal dari Kalimantan Timur.', 'C1', NULL, NULL, NULL, NULL, 'B (Bahasa Kutai dan Bahasa Dayak)', NULL, NULL, 'Bahasa Kutai dan bahasa-bahasa suku Dayak (serta Bahasa Paser/Berau) merupakan bahasa daerah asli dari Kalimantan Timur.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Bahasa Sunda', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Bahasa Kutai dan Bahasa Dayak', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Bahasa Bali', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Bahasa Madura', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Saat tetangga yang berbeda agama sedang merayakan hari besar keagamaannya, sikap yang paling tepat kamu lakukan adalah …', 'sedang', 'pg', NULL, 4, 'Menghargai perbedaan agama', 'Peserta didik dapat menentukan sikap yang tepat terhadap tetangga yang berbeda agama.', 'C3', NULL, NULL, NULL, NULL, 'B (menghormati, menjaga ketenangan, dan mengucapkan selamat dengan ramah)', NULL, NULL, 'Menghormati tetangga yang sedang beribadah atau merayakan hari besar merupakan wujud toleransi antarumat beragama.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'menyalakan musik keras-keras di depan rumahnya', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'menghormati, menjaga ketenangan, dan mengucapkan selamat dengan ramah', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'melarang mereka menerima tamu di rumah', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'mengejek cara ibadah yang mereka lakukan', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Perilaku yang tepat untuk menjaga kerukunan di lingkungan sekolah yang memiliki keberagaman budaya adalah …', 'sedang', 'pg', NULL, 5, 'Menghargai perbedaan budaya', 'Peserta didik dapat menentukan perilaku yang tepat untuk menjaga kerukunan dalam keberagaman budaya.', 'C3', NULL, NULL, NULL, NULL, 'C (berteman tanpa membeda-bedakan suku dan saling menghargai kesenian daerah)', NULL, NULL, 'Kerukunan terjaga apabila kita berteman dengan siapa saja tanpa memandang suku bangsa dan menghormati budaya masing-masing.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'bermain hanya dengan teman yang satu suku saja', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'menganggap budaya daerah sendiri paling tinggi nilainya', false, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'berteman tanpa membeda-bedakan suku dan saling menghargai kesenian daerah', true, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'menertawakan logat bahasa daerah teman', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Tujuan kita mengenal dan menjelajahi lingkungan tempat tinggal sekitar adalah untuk …', 'mudah', 'pg', NULL, 6, 'Lingkungan tempat tinggal', 'Peserta didik dapat menjelaskan tujuan menjelajahi lingkungan tempat tinggal.', 'C2', NULL, NULL, NULL, NULL, 'A (mengetahui batas wilayah, fasilitas umum, dan menumbuhkan kepedulian terhadap lingkungan)', NULL, NULL, 'Mengenal lingkungan sekitar membantu kita mengetahui letak fasilitas penting (puskesmas, sekolah, pos kamling) serta menumbuhkan rasa peduli.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'mengetahui batas wilayah, fasilitas umum, dan menumbuhkan kepedulian terhadap lingkungan', true, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'merusak taman dan fasilitas umum di sekitar rumah', false, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'mencari jalan agar tidak perlu menyapa tetangga', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'bermain seharian tanpa pulang ke rumah', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Manakah kelompok berikut yang seluruhnya merupakan contoh lingkungan alam?', 'mudah', 'pg', NULL, 7, 'Lingkungan alam dan buatan', 'Peserta didik dapat membedakan contoh lingkungan alam dan lingkungan buatan.', 'C2', NULL, NULL, NULL, NULL, 'B (sungai, gunung, dan hutan)', NULL, NULL, 'Sungai, gunung, dan hutan terbentuk secara alami oleh Tuhan tanpa dibuat manusia, sedangkan jembatan, waduk, dan pasar adalah lingkungan buatan.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'jembatan, pasar, dan taman kota', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'sungai, gunung, dan hutan', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'waduk, sawah, dan sekolah', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'jalan raya, pelabuhan, dan laut', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Kepala desa dipilih secara langsung melalui pemilihan kepala desa (Pilkades) oleh …', 'mudah', 'pg', NULL, 8, 'Pemerintahan desa', 'Peserta didik dapat mengetahui pihak yang memilih kepala desa.', 'C1', NULL, NULL, NULL, NULL, 'B (warga masyarakat desa yang telah memenuhi syarat pemilih)', NULL, NULL, 'Berbeda dengan lurah yang diangkat pemerintah daerah, kepala desa dipilih langsung oleh masyarakat desa setempat.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'presiden di ibu kota', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'warga masyarakat desa yang telah memenuhi syarat pemilih', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'kepala sekolah dasar setempat', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'ketua kelas di sekolah', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Dalam struktur pemerintahan desa, tugas utama seorang sekretaris desa (sekdes) adalah …', 'sedang', 'pg', NULL, 9, 'Pemerintahan desa', 'Peserta didik dapat mengidentifikasi tugas sekretaris desa.', 'C1', NULL, NULL, NULL, NULL, 'B (membantu kepala desa di bidang administrasi, surat-menyurat, dan arsip pemerintahan desa)', NULL, NULL, 'Sekretaris desa bertugas memimpin sekretariat desa dalam urusan administrasi, pencatatan, dan pengelolaan dokumen desa.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'mengajar siswa di sekolah dasar', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'membantu kepala desa di bidang administrasi, surat-menyurat, dan arsip pemerintahan desa', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'memeriksa pasien sakit di rumah sakit', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'mengatur lalu lintas di jalan tol', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Pernyataan yang benar mengenai kedudukan RT dan RW dalam lingkungan masyarakat adalah …', 'sedang', 'pg', NULL, 10, 'RT dan RW', 'Peserta didik dapat mengidentifikasi kedudukan RT dan RW dalam lingkungan masyarakat.', 'C2', NULL, NULL, NULL, NULL, 'B (RT merupakan lembaga kemasyarakatan terkecil yang terdiri atas beberapa keluarga, dan gabungan beberapa RT membentuk RW)', NULL, NULL, 'Rukun Tetangga (RT) menghimpun beberapa kepala keluarga (KK), sedangkan Rukun Warga (RW) terdiri atas beberapa RT.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'RT berada di atas RW dan membawahi beberapa desa', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'RT merupakan lembaga kemasyarakatan terkecil yang terdiri atas beberapa keluarga, dan gabungan beberapa RT membentuk RW', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'RW adalah bagian dari pemerintahan provinsi secara langsung', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'RT dan RW bertugas memimpin angkatan bersenjata', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Yang dimaksud dengan aturan adalah …', 'mudah', 'pg', NULL, 11, 'Pengertian aturan', 'Peserta didik dapat menjelaskan pengertian aturan', 'C1', NULL, NULL, NULL, NULL, 'B (ketentuan atau petunjuk yang dibuat untuk mengatur perilaku agar tercipta ketertiban)', NULL, NULL, 'Aturan adalah ketentuan yang disepakati bersama sebagai pedoman bertindak agar kehidupan tertib, aman, dan nyaman.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'keinginan pribadi yang hanya berlaku untuk diri sendiri', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'ketentuan atau petunjuk yang dibuat untuk mengatur perilaku agar tercipta ketertiban', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'hadiah yang diberikan saat menang lomba', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'cerita rakyat yang diwariskan secara turun-temurun', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Cara yang paling adil dan demokratis dalam membuat aturan bersama di kelas atau lingkungan rumah adalah melalui …', 'mudah', 'pg', NULL, 12, 'Membuat aturan', 'Peserta didik dapat menyebutkan cara membuat aturan bersama', 'C2', NULL, NULL, NULL, NULL, 'B (musyawarah bersama untuk mencapai mufakat)', NULL, NULL, 'Aturan bersama dibuat dengan cara bermusyawarah agar setiap anggota ikut berpendapat dan merasa bertanggung jawab menaatinya.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'keputusan sepihak ketua kelas tanpa bertanya', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'musyawarah bersama untuk mencapai mufakat', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'mengikuti kemauan anak yang paling keras suaranya', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'menyalin aturan tanpa membacanya terlebih dahulu', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Contoh aturan yang berlaku di lingkungan masyarakat adalah …', 'mudah', 'pg', NULL, 13, 'Aturan di masyarakat', 'Peserta didik dapat menyebutkan salah satu contoh aturan di masyarakat', 'C2', NULL, NULL, NULL, NULL, 'B (tamu yang menginap lebih dari 1×24 jam wajib melapor kepada Ketua RT)', NULL, NULL, 'Wajib lapor bagi tamu 1×24 jam, menjaga keamanan lingkungan (ronda), dan membuang sampah pada tempatnya adalah contoh aturan masyarakat.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'memakai seragam merah putih saat upacara bendera di sekolah', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'tamu yang menginap lebih dari 1×24 jam wajib melapor kepada Ketua RT', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'mengerjakan PR matematika sebelum tidur', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'mengembalikan buku pinjaman ke perpustakaan sekolah', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Berikut ini yang merupakan contoh aturan tidak tertulis (norma kesopanan/adat) di masyarakat adalah …', 'sedang', 'pg', NULL, 14, 'Aturan tidak tertulis', 'Peserta didik dapat menyebutkan salah satu contoh aturan tidak tertulis', 'C2', NULL, NULL, NULL, NULL, 'C (mengucapkan permisi dan menundukkan badan saat lewat di depan orang yang lebih tua)', NULL, NULL, 'Aturan tidak tertulis berupa kebiasaan sopan santun yang hidup di masyarakat meski tidak dibukukan dalam papan peraturan.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'undang-undang lalu lintas jalan raya', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'tata tertib tertulis yang ditempel di dinding kelas', false, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'mengucapkan permisi dan menundukkan badan saat lewat di depan orang yang lebih tua', true, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'peraturan daerah tentang pajak kendaraan', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Jika kamu melihat temanmu melakukan perbuatan seperti pada gambar di atas, sikap yang paling tepat adalah …', 'sedang', 'pg', NULL, 15, 'Sikap menaati aturan', 'Melalui gambar, Peserta didik dapat menentukan sikap saat melihat pelanggaran aturan', 'C3', NULL, NULL, 'ppkn-buang-sampah', 'Perhatikan gambar seorang anak yang membuang sampah sembarangan di dekat tempat sampah.', 'B (menegurnya dengan bahasa yang sopan dan mengajaknya membuang sampah ke tempat sampah)', NULL, NULL, 'Saat melihat pelanggaran aturan kebersihan, kita sebaiknya mengingatkan dengan sopan dan memberi teladan untuk membuang sampah pada tempatnya.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'ikut membuang sampah di tanah agar sama', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'menegurnya dengan bahasa yang sopan dan mengajaknya membuang sampah ke tempat sampah', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'membiarkannya saja lalu memarahinya di depan orang banyak', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'menendang sampah tersebut ke halaman kelas lain', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Pengertian hak yang tepat adalah …', 'mudah', 'pg', NULL, 16, 'Pengertian hak dan kewajiban', 'Peserta didik dapat mengidentifikasi/mendefinisikan pengertian dari hak', 'C2', NULL, NULL, NULL, NULL, 'B (sesuatu yang mutlak menjadi milik kita atau layak kita terima)', NULL, NULL, 'Hak adalah segala sesuatu yang layak diterima atau dimiliki oleh seseorang, sedangkan kewajiban adalah sesuatu yang harus dilaksanakan.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'sesuatu yang harus dikerjakan dengan penuh tanggung jawab', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'sesuatu yang mutlak menjadi milik kita atau layak kita terima', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'hukuman yang diberikan jika melanggar tata tertib', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'pekerjaan rumah yang diberikan oleh guru', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Berdasarkan ilustrasi di atas, yang termasuk kewajiban Rani sebagai anak di rumah adalah …', 'sedang', 'pg', NULL, 17, 'Hak dan kewajiban di rumah', 'Berdasarkan ilustrasi, Peserta didik dapat mengidentifikasi/membedakan bentuk kewajiban anak', 'C3', 'Ilustrasi Kegiatan di Rumah', 'Setiap pagi setelah bangun tidur, Rani merapikan tempat tidurnya sendiri dan membantu Ibu menyapu teras rumah sebelum berangkat sekolah. Setelah itu, Rani mendapat sarapan bergizi dari Ibu dan uang saku dari Ayah.', NULL, NULL, 'C (merapikan tempat tidur dan membantu menyapu teras rumah)', NULL, NULL, 'Merapikan tempat tidur dan membantu orang tua adalah kewajiban yang dilakukan anak, sedangkan mendapat sarapan dan uang saku merupakan hak anak.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'mendapatkan sarapan bergizi dari Ibu', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'menerima uang saku dari Ayah', false, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'merapikan tempat tidur dan membantu menyapu teras rumah', true, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'mendapatkan kasih sayang orang tua', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Perhatikan pernyataan berikut:
1) Memakai seragam sekolah dengan rapi
2) Mendapatkan pengajaran dan bimbingan dari guru
3) Melaksanakan piket kebersihan kelas
4) Menggunakan fasilitas perpustakaan sekolah
Dari pernyataan di atas, yang termasuk contoh hak siswa di sekolah adalah nomor …', 'sedang', 'pg', NULL, 18, 'Contoh hak dan kewajiban', 'Melalui pernyataan, peserta didik dapat menentukan contoh hak di sekolah', 'C3', NULL, NULL, NULL, NULL, 'C (2 dan 4)', NULL, NULL, 'Nomor 2 (mendapat pengajaran guru) dan 4 (menggunakan perpustakaan) adalah hak siswa, sedangkan nomor 1 dan 3 adalah kewajiban siswa.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '1 dan 2', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '1 dan 3', false, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '2 dan 4', true, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, '3 dan 4', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Berdasarkan gambar di atas, pelaksanaan kewajiban menjaga kebersihan tersebut terjadi di lingkungan …', 'sedang', 'pg', NULL, 19, 'Hak dan kewajiban anak di lingkungan', 'Melalui gambar, Peserta didik dapat mengidentifikasi tempat/lingkungan terjadinya suatu kewajiban', 'C3', NULL, NULL, 'ppkn-kerja-bakti', 'Amati gambar kegiatan kerja bakti membersihkan lingkungan berikut.', 'B (masyarakat / kampung sekitar tempat tinggal)', NULL, NULL, 'Gambar menunjukkan warga bersama anak-anak bergotong royong membersihkan jalan dan selokan di lingkungan masyarakat.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'dalam ruang kelas saat ujian', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'masyarakat / kampung sekitar tempat tinggal', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'kamar tidur pribadi', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'ruang perpustakaan kota', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Salah satu akibat yang terjadi apabila siswa melalaikan kewajiban melaksanakan piket kebersihan kelas adalah …', 'mudah', 'pg', NULL, 20, 'Akibat melalaikan kewajiban', 'Peserta didik dapat menyebutkan salah satu akibat jika melalaikan kewajiban', 'C2', NULL, NULL, NULL, NULL, 'A (kelas menjadi kotor, berbau, dan tidak nyaman untuk belajar)', NULL, NULL, 'Melalaikan kewajiban akan merugikan diri sendiri dan orang lain, misalnya kelas menjadi kotor dan mengganggu kenyamanan belajar.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'kelas menjadi kotor, berbau, dan tidak nyaman untuk belajar', true, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'suasana belajar menjadi semakin tenang dan bersih', false, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'teman-teman menjadi semakin senang karena kelas berantakan', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'nilai ulangan otomatis menjadi seratus', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Ciri khas yang membedakan suatu kelompok masyarakat berdasarkan suku, agama, bahasa, dan budaya disebut … masyarakat.', 'mudah', 'isian', NULL, 21, 'Identitas masyarakat', 'Peserta didik dapat menyebutkan istilah yang tepat untuk ciri khas masyarakat berdasarkan suku, agama, bahasa, dan budaya.', 'C1', NULL, NULL, NULL, NULL, 'identitas', '["identitas","identitas budaya","jati diri"]', NULL, 'Identitas masyarakat adalah ciri khas atau jati diri yang melekat pada sekelompok warga meliputi suku, agama, bahasa, dan budayanya.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Sikap saling menghormati, menghargai, dan menerima perbedaan suku, agama, maupun budaya disebut sikap …', 'mudah', 'isian', NULL, 22, 'Sikap toleransi', 'Peserta didik dapat menyebutkan istilah sikap menghormati dan menerima perbedaan.', 'C1', NULL, NULL, NULL, NULL, 'toleransi', '["toleransi","tenggang rasa"]', NULL, 'Toleransi adalah sikap menghormati dan menerima keberagaman dalam kehidupan bermasyarakat.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Jenis lingkungan seperti gunung, sungai, dan laut yang terbentuk secara alami tanpa campur tangan manusia disebut lingkungan …', 'mudah', 'isian', NULL, 23, 'Lingkungan alam', 'Peserta didik dapat menyebutkan jenis lingkungan yang terbentuk tanpa campur tangan manusia.', 'C1', NULL, NULL, NULL, NULL, 'alam', '["alam","lingkungan alam"]', NULL, 'Lingkungan alam adalah segala sesuatu yang ada di alam dan terbentuk tanpa dibuat oleh manusia.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Kegiatan membersihkan jalan, selokan, atau lingkungan sekitar secara bersama-sama oleh warga disebut kerja bakti atau …', 'mudah', 'isian', NULL, 24, 'Gotong royong', 'Peserta didik dapat menyebutkan istilah kegiatan membersihkan lingkungan secara bersama-sama.', 'C1', NULL, NULL, NULL, NULL, 'gotong royong', '["gotong royong","kerja bakti"]', NULL, 'Gotong royong (kerja bakti) merupakan kegiatan bekerja bersama-sama secara sukarela untuk kepentingan umum.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Salah satu tempat pelayanan kesehatan milik masyarakat yang mudah dijumpai di tingkat kecamatan atau kelurahan adalah …', 'mudah', 'isian', NULL, 25, 'Fasilitas umum', 'Peserta didik dapat menyebutkan tempat pelayanan kesehatan yang terdapat di lingkungan masyarakat.', 'C1', NULL, NULL, NULL, NULL, 'Puskesmas (atau Posyandu / Klinik)', '["puskesmas","posyandu","klinik","rumah sakit","puskesmas pembantu"]', NULL, 'Puskesmas (Pusat Kesehatan Masyarakat) dan Posyandu merupakan fasilitas umum pelayanan kesehatan di masyarakat.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Salah satu manfaat mematuhi aturan di rumah dan di sekolah adalah membuat suasana kehidupan menjadi aman, nyaman, dan …', 'mudah', 'isian', NULL, 26, 'Manfaat aturan', 'Peserta didik dapat menyebutkan salah satu manfaat aturan', 'C2', NULL, NULL, NULL, NULL, 'tertib (atau teratur / rukun / damai)', '["tertib","teratur","rukun","damai","disiplin"]', NULL, 'Aturan dibuat untuk menciptakan ketertiban, keamanan, kedisiplinan, dan kerukunan bersama.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Berdasarkan gambar papan aturan di atas, tempat berlakunya aturan tersebut adalah di …', 'sedang', 'isian', NULL, 27, 'Aturan sekitar', 'Melalui gambar, Peserta didik dapat menyebutkan salah satu tempat aturan yang berlaku', 'C2', NULL, NULL, 'ppkn-aturan-perpustakaan', 'Perhatikan gambar papan tata tertib di sebuah ruangan berikut.', 'perpustakaan', '["perpustakaan","ruang perpustakaan"]', NULL, 'Aturan "Harap Tenang, Dilarang Berisik, Kembalikan Buku ke Rak" berlaku di ruang perpustakaan.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Sebelum menuntut hak kita sebagai siswa di sekolah, kita harus melaksanakan … terlebih dahulu dengan penuh tanggung jawab.', 'sedang', 'isian', NULL, 28, 'Contoh kewajiban/hak', 'Peserta didik dapat melengkapi kalimat rumpang mengenai hak/kewajiban', 'C2', NULL, NULL, NULL, NULL, 'kewajiban', '["kewajiban","kewajiban kita"]', NULL, 'Hak dan kewajiban harus berjalan seimbang; kewajiban dilaksanakan lebih dulu agar hak dapat diterima dengan baik.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Berdasarkan gambar di atas, hak yang diperoleh anak di rumah adalah mendapatkan makanan bergizi dan … dari orang tua.', 'sedang', 'isian', NULL, 29, 'Contoh hak di rumah', 'Melalui gambar, Peserta didik dapat menentukan hak anak di rumah', 'C2', NULL, NULL, 'ppkn-hak-rumah', 'Perhatikan gambar suasana keluarga di rumah berikut.', 'kasih sayang (atau bimbingan belajar / perhatian)', '["kasih sayang","perhatian","bimbingan","pendidikan","perlindungan"]', NULL, 'Anak berhak memperoleh kasih sayang, perhatian, makanan bergizi, dan bimbingan dari orang tua di rumah.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Berdasarkan gambar di atas, tujuan utama didirikannya Pos Kamling di lingkungan masyarakat adalah untuk menjaga … lingkungan.', 'sedang', 'isian', NULL, 30, 'Kewajiban dan tanggung jawab di masyarakat', 'Melalui gambar, Peserta didik dapat menyebutkan tujuan utama dari keberadaan pos kamling', 'C2', NULL, NULL, 'ppkn-pos-kamling', 'Perhatikan gambar pos ronda (Pos Kamling) di lingkungan warga berikut.', 'keamanan (atau ketertiban)', '["keamanan","ketertiban","keamanan dan ketertiban"]', NULL, 'Pos Kamling (Pos Keamanan Lingkungan) digunakan warga untuk melaksanakan ronda malam menjaga keamanan dan ketertiban kampung.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Analisislah 2 (dua) akibat buruk yang dapat terjadi apabila masyarakat tidak mau menghargai perbedaan budaya yang ada di sekitarnya!', 'sulit', 'uraian', 'Essay', 31, 'Menghargai perbedaan budaya', 'Peserta didik dapat menganalisis akibat apabila masyarakat tidak menghargai perbedaan budaya.', 'C4', NULL, NULL, NULL, NULL, '1) Timbul perselisihan, pertengkaran, atau konflik antarkelompok masyarakat.
2) Persatuan dan kerukunan warga menjadi terpecah sehingga lingkungan tidak aman dan tidak nyaman.
3) Budaya daerah tertentu bisa terpinggirkan atau punah karena tidak dihargai.', NULL, 'Menyebutkan dampak sosial seperti perpecahan/konflik + hilangnya kerukunan/rasa aman.', 'Kurangnya sikap saling menghargai memicu prasangka dan pertengkaran yang merusak persatuan masyarakat.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Jelaskan arti dan makna semboyan "Bhinneka Tunggal Ika" dalam kehidupan bermasyarakat di Indonesia!', 'sedang', 'uraian', 'Essay', 32, 'Bhinneka Tunggal Ika', 'Peserta didik dapat menjelaskan makna semboyan Bhinneka Tunggal Ika dalam kehidupan bermasyarakat.', 'C2', NULL, NULL, NULL, NULL, 'Bhinneka Tunggal Ika berarti "berbeda-beda tetapi tetap satu jua". Maknanya, meskipun rakyat Indonesia memiliki suku, agama, bahasa, dan budaya yang beragam, kita tetap satu bangsa yang harus hidup rukun dan bersatu.', NULL, 'Menuliskan arti harfiah (''berbeda-beda tetapi tetap satu jua'') + makna persatuan dalam keberagaman.', 'Semboyan Bhinneka Tunggal Ika mengingatkan seluruh warga Indonesia untuk menjaga persatuan di tengah keberagaman.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Sebutkan 3 (tiga) contoh aturan yang berlaku di rumah!', 'mudah', 'uraian', 'Essay', 33, 'Contoh aturan di rumah', 'Peserta didik dapat menyebutkan 3 contoh aturan di rumah', 'C2', NULL, NULL, NULL, NULL, '1) Merapikan tempat tidur setelah bangun pagi.
2) Meminta izin kepada orang tua sebelum keluar rumah.
3) Belajar dan mengerjakan tugas sekolah tepat waktu serta tidur tidak terlalu larut malam.', NULL, 'Menyebutkan 3 aturan rumah yang masuk akal dan positif.', 'Aturan di rumah membantu melatih kedisiplinan, tanggung jawab, dan menjaga ketertiban anggota keluarga.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Jelaskan bagaimana cara menunjukkan sikap tanggung jawab terhadap aturan yang sudah disepakati bersama!', 'sedang', 'uraian', 'Essay', 34, 'Sikap tanggung jawab terhadap aturan', 'Peserta didik dapat menjelaskan sikap tanggung jawab terhadap aturan', 'C2', NULL, NULL, NULL, NULL, 'Menjalankan aturan dengan kesadaran sendiri tanpa menunggu diawasi orang lain, tidak mencari alasan untuk melanggar, serta berani mengakui kesalahan dan menerima sanksi apabila melakukan pelanggaran.', NULL, 'Menjelaskan kesadaran mematuhi aturan tanpa dipaksa + berani menanggung konsekuensi jika melanggar.', 'Sikap bertanggung jawab berarti melaksanakan kesepakatan dengan jujur dan siap menanggung akibat dari perbuatan sendiri.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Jelaskan pengertian kewajiban dan berikan 1 (satu) contoh kewajiban anak di sekolah!', 'mudah', 'uraian', 'Essay', 35, 'Pengertian hak dan kewajiban', 'Peserta didik dapat menjelaskan pengertian kewajiban', 'C2', NULL, NULL, NULL, NULL, 'Kewajiban adalah segala sesuatu yang harus dilakukan atau dilaksanakan oleh seseorang dengan penuh rasa tanggung jawab. Contoh kewajiban di sekolah: datang tepat waktu, menghormati guru, atau melaksanakan piket kelas.', NULL, 'Definisi kewajiban (''sesuatu yang harus dilakukan'') + 1 contoh kewajiban di sekolah yang tepat.', 'Kewajiban merupakan tanggung jawab yang wajib dikerjakan sebelum seseorang memperoleh haknya.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;

  SELECT id INTO v_subject_id FROM subjects WHERE slug = 'seni-rupa';
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Gambar garis tipis atau coretan rancangan awal sebelum membuat karya seni rupa yang utuh disebut …', 'mudah', 'pg', NULL, 1, 'Menggambar Sketsa', 'Siswa dapat mengidentifikasi pengertian sketsa sebagai rancangan awal karya seni rupa.', 'C1', NULL, NULL, NULL, NULL, 'B (sketsa)', NULL, NULL, 'Sketsa adalah gambar rancangan awal atau kerangka dasar yang dibuat secara garis besar sebelum diwarnai atau disempurnakan.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'kolase', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'sketsa', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'patung', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'diorama', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Istilah cosplay berasal dari bahasa Inggris yang merupakan singkatan dari …', 'mudah', 'pg', NULL, 2, 'Menggambar Sketsa (Kostum/Cosplay)', 'Siswa dapat menyebutkan kepanjangan dari istilah cosplay.', 'C1', NULL, NULL, NULL, NULL, 'B (costume play)', NULL, NULL, 'Cosplay adalah singkatan dari "costume" (kostum/pakaian) dan "play" (bermain/memerankan), yaitu kegiatan mengenakan kostum menyerupai karakter tertentu.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'color display', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'costume play', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'costume paper', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'creative play', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Dalam bahasa Indonesia, kata "kostum" memiliki arti …', 'mudah', 'pg', NULL, 3, 'Menggambar Sketsa (Kostum/Cosplay)', 'Siswa dapat mengartikan kata kostum dalam bahasa Indonesia.', 'C1', NULL, NULL, NULL, NULL, 'B (pakaian atau busana khusus untuk suatu acara atau peran)', NULL, NULL, 'Kostum berarti pakaian atau busana khusus yang dikenakan seseorang untuk memerankan tokoh, acara pentas, atau perayaan tertentu.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'alat lukis dan kuas', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'pakaian atau busana khusus untuk suatu acara atau peran', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'panggung tempat pertunjukan', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'topeng yang terbuat dari kayu', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Dalam rancangan sketsa busana, blazer dan rompi dikelompokkan ke dalam jenis pakaian …', 'sedang', 'pg', NULL, 4, 'Menggambar Sketsa (Kostum/Cosplay)', 'Siswa dapat mengelompokkan blazer dan rompi ke dalam jenis pakaian formal.', 'C2', NULL, NULL, NULL, NULL, 'C (pakaian formal (resmi))', NULL, NULL, 'Blazer dan rompi merupakan bagian dari setelan pakaian formal/resmi yang biasa digunakan dalam acara resmi atau seragam rapi.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'pakaian tidur', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'pakaian olahraga', false, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'pakaian formal (resmi)', true, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'pakaian renang', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Contoh ide rancangan kostum (cosplay) bertema hewan yang cocok digambar oleh siswa SD adalah …', 'mudah', 'pg', NULL, 5, 'Menggambar Sketsa (Kostum/Cosplay)', 'Siswa dapat menyebutkan salah satu contoh ide cosplay bertema hewan.', 'C1', NULL, NULL, NULL, NULL, 'B (kostum kelinci dengan telinga panjang atau kostum kupu-kupu bersayap)', NULL, NULL, 'Kostum kelinci atau kupu-kupu meniru ciri khas hewan (telinga panjang, sayap warna-warni) sehingga sesuai tema cosplay hewan.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'kostum robot luar angkasa', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'kostum kelinci dengan telinga panjang atau kostum kupu-kupu bersayap', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'kostum baju dokter bedah', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'kostum pembalap mobil', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Dalam pembuatan karya seni rupa, yang dimaksud dengan "alat" adalah …', 'mudah', 'pg', NULL, 6, 'Menelaah Karakteristik Alat dan Bahan', 'Siswa dapat menjelaskan pengertian alat dalam pembuatan karya seni rupa.', 'C1', NULL, NULL, NULL, NULL, 'B (benda atau perkakas yang digunakan untuk membantu mengolah bahan dan tidak habis sekali pakai)', NULL, NULL, 'Alat (seperti gunting, kuas, palet, penggaris) digunakan untuk membantu proses berkarya dan dapat dipakai berulang kali, sedangkan bahan adalah material pembentuk karya yang habis dipakai.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'zat dasar yang habis terpakai menjadi bagian karya', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'benda atau perkakas yang digunakan untuk membantu mengolah bahan dan tidak habis sekali pakai', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'karya seni yang sudah selesai dipajang di dinding', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'bingkai kayu untuk memajang foto', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Dari daftar benda berikut ini, manakah yang termasuk contoh ALAT dalam pembuatan karya seni rupa?', 'mudah', 'pg', NULL, 7, 'Menelaah Karakteristik Alat dan Bahan', 'Siswa dapat mengidentifikasi contoh alat/bahan dalam pembuatan karya seni (Catatan: opsi C adalah alat, opsi A/B/D adalah bahan).', 'C1', NULL, NULL, NULL, NULL, 'C (kuas lukis)', NULL, NULL, 'Sesuai catatan kisi-kisi: opsi A (kertas gambar), B (cat air), dan D (tanah liat) adalah bahan yang habis dipakai membentuk karya, sedangkan opsi C (kuas lukis) adalah alat bantu melukis.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'kertas gambar', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'cat air', false, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'kuas lukis', true, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'tanah liat', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Dalam menelaah alat dan bahan seni rupa, kata "karakteristik" atau "karakter" bahan berarti …', 'sedang', 'pg', NULL, 8, 'Menelaah Karakteristik Alat dan Bahan', 'Siswa dapat mengidentifikasi istilah karakter dalam karya seni rupa.', 'C1', NULL, NULL, NULL, NULL, 'B (sifat khas dan ciri permukaan atau hasil goresan yang dimiliki suatu alat/bahan)', NULL, NULL, 'Karakter alat dan bahan menunjukkan sifat khasnya, misalnya halus, kasar, tebal, transparan, lentur, atau mudah dibentuk.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'harga jual bahan di toko buku', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'sifat khas dan ciri permukaan atau hasil goresan yang dimiliki suatu alat/bahan', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'nama pembuat karya seni', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'ukuran bingkai gambar', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Karakter hasil pewarnaan gambar menggunakan pensil warna adalah …', 'sedang', 'pg', NULL, 9, 'Menelaah Karakteristik Alat dan Bahan', 'Siswa dapat mengenali karakter pewarnaan menggunakan pensil warna.', 'C2', NULL, NULL, NULL, NULL, 'B (goresannya halus, tipis, dan cocok untuk mewarnai detail kecil)', NULL, NULL, 'Pensil warna bersifat kering dengan ujung runcing sehingga menghasilkan arsiran halus dan rapi pada bagian gambar yang detail.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'sangat basah dan harus dicampur air', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'goresannya halus, tipis, dan cocok untuk mewarnai detail kecil', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'selalu menggumpal dan berbau tajam', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'tidak bisa dihapus dan hanya berwarna hitam', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Alat pewarna kering berbahan dasar lilin atau minyak yang memiliki karakter warna tebal, pekat, dan mampu menutup seluruh permukaan kertas adalah …', 'sedang', 'pg', NULL, 10, 'Menelaah Karakteristik Alat dan Bahan', 'Siswa dapat mengenali karakter pewarnaan menggunakan krayon yang tebal dan menutup permukaan.', 'C2', NULL, NULL, NULL, NULL, 'C (krayon (pastel minyak))', NULL, NULL, 'Krayon/oil pastel menghasilkan warna yang tebal, cerah, dan dapat menutup permukaan kertas secara penuh serta mudah dibuat gradasi.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'spidol tipis', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'pensil 2B', false, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'krayon (pastel minyak)', true, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'kapur tulis putih', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Berdasarkan dimensinya (ukurannya), karya seni rupa dibagi menjadi dua jenis, yaitu …', 'mudah', 'pg', NULL, 11, 'Kreasi Karya Seni Rupa 2 & 3 Dimensi', 'Siswa dapat menyebutkan pembagian karya seni rupa berdasarkan dimensinya.', 'C1', NULL, NULL, NULL, NULL, 'B (karya seni rupa dua dimensi (2D) dan tiga dimensi (3D))', NULL, NULL, 'Berdasarkan bentuk dan dimensinya, karya seni rupa dibedakan menjadi karya 2 dimensi (panjang × lebar) dan karya 3 dimensi (panjang × lebar × tinggi/volume).', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'seni rupa murni dan seni rupa terapan', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'karya seni rupa dua dimensi (2D) dan tiga dimensi (3D)', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'seni rupa tradisional dan seni rupa modern', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'seni rupa kasar dan seni rupa halus', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Fungsi utama palet dalam kegiatan melukis menggunakan cat air atau cat poster adalah untuk …', 'mudah', 'pg', NULL, 12, 'Menelaah Karakteristik Alat dan Bahan', 'Siswa dapat mengidentifikasi salah satu fungsi alat dalam berkarya seni.', 'C1', NULL, NULL, NULL, NULL, 'B (wadah untuk menuang dan mencampur berbagai warna cat)', NULL, NULL, 'Palet adalah tempat meletakkan dan mencampur cat sebelum disapukan ke media gambar memakai kuas.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'memotong kertas menjadi bentuk pola', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'wadah untuk menuang dan mencampur berbagai warna cat', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'mengukur garis lurus pada kanvas', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'menghapus kesalahan gambar pensil', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Bahan pewarna cair yang penggunaannya harus dicampur dengan air dan memiliki sifat warna tembus pandang (transparan) adalah …', 'mudah', 'pg', NULL, 13, 'Menelaah Karakteristik Alat dan Bahan', 'Siswa dapat mengidentifikasi karakteristik bahan pewarna cair yang bersifat transparan dan dicampur air.', 'C1', NULL, NULL, NULL, NULL, 'B (cat air)', NULL, NULL, 'Cat air (watercolor) menggunakan pelarut air dan menghasilkan sapuan warna yang tipis serta transparan.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'krayon lilin', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'cat air', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'pensil arang', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'spidol permanen', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Bahan alam berikut ini yang bersifat lunak dan sangat mudah dibentuk dengan tangan menjadi karya kerajinan gerabah adalah …', 'mudah', 'pg', NULL, 14, 'Menelaah Karakteristik Alat dan Bahan', 'Siswa dapat mengidentifikasi bahan alam bersifat lunak yang mudah dibentuk menjadi kerajinan.', 'C1', NULL, NULL, NULL, NULL, 'B (tanah liat)', NULL, NULL, 'Tanah liat merupakan bahan alam bersifat lunak/plastis saat basah sehingga mudah dibentuk menjadi kendi, vas, atau patung.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'batu granit', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'tanah liat', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'kayu ulin', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'besi baja', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Lima unsur utama dalam karya seni rupa meliputi titik, garis, bidang, warna, dan …', 'sedang', 'pg', NULL, 15, 'Kreasi Karya Seni Rupa 2 & 3 Dimensi', 'Siswa dapat melengkapi lima unsur utama dalam karya seni rupa.', 'C1', NULL, NULL, NULL, NULL, 'B (bentuk (atau tekstur/ruang))', NULL, NULL, 'Unsur-unsur utama seni rupa adalah titik, garis, bidang, bentuk, ruang, warna, tekstur, dan gelap terang.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'bingkai', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'bentuk (atau tekstur/ruang)', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'gunting', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'lem kertas', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Keseimbangan dalam karya seni rupa di mana susunan objek di sisi kiri dan sisi kanan sama persis seperti cermin disebut keseimbangan …', 'sedang', 'pg', NULL, 16, 'Kreasi Karya Seni Rupa 2 & 3 Dimensi', 'Siswa dapat mengidentifikasi jenis prinsip keseimbangan dalam seni rupa.', 'C2', NULL, NULL, NULL, NULL, 'B (simetris)', NULL, NULL, 'Prinsip keseimbangan terdiri atas keseimbangan simetris (sisi kiri dan kanan sama persis), asimetris, dan radial.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'asimetris', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'simetris', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'acak', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'miring', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Karya seni rupa yang memiliki ukuran panjang, lebar, dan tinggi (kedalaman/volume) serta dapat dilihat dari segala arah disebut karya …', 'mudah', 'pg', NULL, 17, 'Kreasi Karya Seni Rupa 2 & 3 Dimensi', 'Siswa dapat menentukan dimensi karya seni yang memiliki panjang, lebar, dan kedalaman.', 'C1', NULL, NULL, NULL, NULL, 'C (tiga dimensi)', NULL, NULL, 'Karya 3 dimensi memiliki tiga ukuran (panjang, lebar, tinggi/volume) sehingga dapat dinikmati dari depan, samping, maupun belakang.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'satu dimensi', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'dua dimensi', false, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'tiga dimensi', true, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'empat dimensi', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Burung endemik khas hutan Kalimantan yang memiliki paruh besar melengkung dan sering dijadikan motif karya seni rupa daerah adalah …', 'mudah', 'pg', NULL, 18, 'Kreasi Karya Seni Rupa 2 & 3 Dimensi', 'Siswa dapat menyebutkan burung endemik khas hutan Kalimantan.', 'C1', NULL, NULL, NULL, NULL, 'B (Burung Enggang (Rangkong))', NULL, NULL, 'Burung Enggang (Rangkong) merupakan satwa endemik kebanggaan hutan Kalimantan yang sering muncul pada ukiran, lukisan, dan tarian adat.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Burung Cenderawasih', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Burung Enggang (Rangkong)', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Burung Jalak Bali', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Burung Maleo', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Karya seni rupa 3 dimensi yang berupa tiruan pemandangan alam, hutan, atau suasana tertentu dalam ukuran mini di dalam kotak atau alas disebut …', 'sedang', 'pg', NULL, 19, 'Kreasi Karya Seni Rupa 2 & 3 Dimensi', 'Siswa dapat mengidentifikasi pengertian diorama sebagai tiruan pemandangan 3 dimensi mini.', 'C1', NULL, NULL, NULL, NULL, 'C (diorama)', NULL, NULL, 'Diorama adalah sajian pemandangan 3 dimensi dalam ukuran mini yang meniru keadaan alam atau kejadian nyata.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'sketsa', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'mozaik', false, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'diorama', true, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'poster', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Nama rumah adat masyarakat Dayak di Kalimantan yang dihuni banyak keluarga dan dipimpin oleh seorang kepala adat bernama Pembakas Lewu adalah …', 'sedang', 'pg', NULL, 20, 'Kreasi Karya Seni Rupa 2 & 3 Dimensi', 'Siswa dapat menyebutkan nama rumah adat Kalimantan yang dipimpin oleh Pembakas Lewu.', 'C1', NULL, NULL, NULL, NULL, 'B (Rumah Betang)', NULL, NULL, 'Rumah Betang (Huma Betang) adalah rumah panjang tradisional suku Dayak di Kalimantan yang dipimpin oleh Pembakas Lewu dalam menjaga ketertiban dan tradisi penghuni rumah.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  IF v_question_id IS NOT NULL THEN
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Rumah Gadang', false, 0, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Rumah Betang', true, 1, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Rumah Joglo', false, 2, NULL);
    INSERT INTO options (question_id, option_text, is_correct, position, explanation) VALUES (v_question_id, 'Rumah Honai', false, 3, NULL);
  END IF;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Fungsi utama dibuatnya sketsa sebelum menggambar atau melukis adalah sebagai … awal agar bentuk dan tata letak gambar lebih terarah.', 'mudah', 'isian', NULL, 21, 'Menggambar Sketsa', 'Siswa dapat menjelaskan fungsi utama pembuatan sketsa.', 'C2', NULL, NULL, NULL, NULL, 'rancangan (atau kerangka / pola dasar)', '["rancangan","rancangan awal","kerangka","pola","pedoman"]', NULL, 'Sketsa berfungsi sebagai rancangan atau kerangka awal untuk meminimalisir kesalahan sebelum gambar ditebalkan dan diwarnai.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Saat pertama kali membuat sketsa dengan pensil, ketebalan garis yang tepat adalah garis … agar mudah dihapus jika ada bagian yang salah.', 'mudah', 'isian', NULL, 22, 'Menggambar Sketsa', 'Siswa dapat menentukan ketebalan garis yang tepat saat membuat sketsa.', 'C2', NULL, NULL, NULL, NULL, 'tipis (atau tipis dan ringan)', '["tipis","garis tipis","tipis dan ringan","halus"]', NULL, 'Garis sketsa dibuat tipis dan ringan terlebih dahulu supaya mudah diperbaiki dengan penghapus tanpa merusak kertas.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Alat gambar utama yang paling umum digunakan untuk membuat garis sketsa di atas kertas adalah …', 'mudah', 'isian', NULL, 23, 'Menggambar Sketsa', 'Siswa dapat menyebutkan alat gambar utama untuk membuat sketsa.', 'C1', NULL, NULL, NULL, NULL, 'pensil', '["pensil","pensil gambar","pensil 2b","pensil hb"]', NULL, 'Pensil mudah dikendalikan ketebalan garisnya dan mudah dihapus saat menyusun sketsa.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Jenis cat yang penggunaannya harus diencerkan atau dicampur dengan air adalah …', 'mudah', 'isian', NULL, 24, 'Menelaah Karakteristik Alat dan Bahan', 'Siswa dapat mengidentifikasi jenis cat yang penggunaannya dicampur air.', 'C1', NULL, NULL, NULL, NULL, 'cat air (atau cat poster / cat akrilik)', '["cat air","cat poster","cat akrilik"]', NULL, 'Cat air menggunakan air sebagai pelarut untuk mengatur kepekatan dan ketransparanan warna.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Bahan alam lunak yang berasal dari tanah dan mudah dibentuk langsung dengan tangan menjadi patung atau gerabah adalah …', 'mudah', 'isian', NULL, 25, 'Menelaah Karakteristik Alat dan Bahan', 'Siswa dapat menyebutkan bahan alam lunak yang mudah dibentuk dengan tangan.', 'C1', NULL, NULL, NULL, NULL, 'tanah liat', '["tanah liat","lempung"]', NULL, 'Tanah liat (lempung) bersifat plastis dan lunak ketika basah sehingga mudah dipilin dan dibentuk.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Selain kertas, bahan tipis yang mudah dipotong menggunakan gunting untuk membuat karya seni atau kostum adalah …', 'sedang', 'isian', NULL, 26, 'Menelaah Karakteristik Alat dan Bahan', 'Siswa dapat menyebutkan bahan tipis selain kertas yang dapat dipotong dengan gunting.', 'C1', NULL, NULL, NULL, NULL, 'kain (atau plastik / daun kering / kain flanel)', '["kain","kain flanel","plastik","daun","daun kering","karton tipis"]', NULL, 'Kain flanel, plastik tipis, atau daun kering dapat dipotong dengan gunting untuk kolase maupun kostum.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Patung, gerabah, dan vas bunga termasuk ke dalam kelompok karya seni rupa … dimensi.', 'mudah', 'isian', NULL, 27, 'Kreasi Karya Seni Rupa 2 & 3 Dimensi', 'Siswa dapat mengklasifikasikan patung, gerabah, dan vas bunga ke dalam karya 3 dimensi.', 'C2', NULL, NULL, NULL, NULL, 'tiga (3)', '["3","tiga","3 dimensi","tiga dimensi"]', NULL, 'Patung, gerabah, dan vas bunga memiliki ruang/volume (panjang, lebar, tinggi) sehingga termasuk karya 3 dimensi.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Teknik memberi gelap terang atau bayangan pada gambar dengan cara menarik garis-garis sejajar maupun menyilang disebut teknik …', 'sedang', 'isian', NULL, 28, 'Menggambar Sketsa', 'Siswa dapat menyebutkan nama teknik memberi bayangan dengan garis sejajar/menyilang.', 'C1', NULL, NULL, NULL, NULL, 'arsir', '["arsir","mengarsir","teknik arsir","arsiran"]', NULL, 'Teknik arsir (hatching/cross-hatching) memakai goresan garis sejajar atau bersilangan untuk menciptakan kesan bayangan dan volume.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Contoh karya seni rupa dua dimensi yang dibuat menggunakan cat dan kuas di atas media kain kanvas adalah …', 'mudah', 'isian', NULL, 29, 'Kreasi Karya Seni Rupa 2 & 3 Dimensi', 'Siswa dapat menyebutkan contoh karya seni rupa 2 dimensi di atas kanvas.', 'C1', NULL, NULL, NULL, NULL, 'lukisan', '["lukisan","seni lukis"]', NULL, 'Lukisan di atas kanvas merupakan karya seni rupa dua dimensi karena hanya memiliki ukuran panjang dan lebar.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Teknik berkarya seni dengan menempelkan potongan kecil kertas warna-warni, keramik, atau biji-bijian pada pola gambar disebut …', 'sedang', 'isian', NULL, 30, 'Kreasi Karya Seni Rupa 2 & 3 Dimensi', 'Siswa dapat mengidentifikasi nama teknik menempel potongan kertas warna-warni pada pola.', 'C1', NULL, NULL, NULL, NULL, 'mozaik (atau kolase)', '["mozaik","mosaik","kolase","montase"]', NULL, 'Menempelkan kepingan atau potongan bahan sejenis/kertas warna-warni mengikuti pola gambar merupakan teknik mozaik (sering juga diajarkan berpasangan dengan kolase).', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Jelaskan perbedaan antara karya seni rupa 2 dimensi dan 3 dimensi, lalu berikan masing-masing 2 (dua) contohnya!', 'sedang', 'uraian', 'Uraian', 31, 'Kreasi Karya Seni Rupa 2 & 3 Dimensi', 'Siswa dapat menyebutkan contoh dan menjelaskan perbedaan karya seni rupa 2 dan 3 dimensi.', 'C2', NULL, NULL, NULL, NULL, '• Karya 2 dimensi hanya memiliki ukuran panjang dan lebar (datar) serta hanya dapat dilihat dari satu arah (depan). Contoh: lukisan, gambar, poster.
• Karya 3 dimensi memiliki panjang, lebar, dan tinggi/volume (ruang) serta dapat dilihat dari segala arah. Contoh: patung, vas bunga, gerabah, diorama.', NULL, 'Menjelaskan perbedaan ukuran/arah pandang 2D vs 3D + masing-masing 2 contoh yang tepat.', 'Perbedaan utamanya terletak pada ada tidaknya ukuran tinggi/volume serta sudut pandang penikmatnya.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Sebutkan minimal 3 (tiga) alat dan bahan untuk menggambar sketsa, kemudian jelaskan fungsi dari salah satu alat tersebut!', 'mudah', 'uraian', 'Uraian', 32, 'Menggambar Sketsa & Karakteristik Alat', 'Siswa dapat menyebutkan alat dan bahan menggambar sketsa beserta fungsi salah satu alatnya.', 'C2', NULL, NULL, NULL, NULL, 'Alat dan bahan: pensil, penghapus, penggaris, dan kertas gambar.
Fungsi salah satu alat: Penghapus berfungsi untuk menghilangkan garis sketsa yang keliru atau garis bantu yang sudah tidak diperlukan.', NULL, 'Menyebutkan minimal 3 alat/bahan sketsa + menjelaskan fungsi 1 alat dengan benar.', 'Mengenal alat dan bahan sketsa membantu siswa mempersiapkan perlengkapan yang tepat sebelum menggambar.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Mengapa kita perlu memilih alat dan bahan yang tepat sebelum mulai membuat karya seni rupa? Jelaskan 2 (dua) alasannya!', 'sulit', 'uraian', 'Uraian', 33, 'Menelaah Karakteristik Alat dan Bahan', 'Siswa dapat menganalisis alasan pentingnya memilih alat dan bahan yang tepat sebelum berkarya.', 'C4', NULL, NULL, NULL, NULL, '1) Agar hasil karya sesuai dengan yang diinginkan, rapi, dan tahan lama (misalnya memakai kertas tebal jika melukis dengan cat air supaya kertas tidak mudah sobek).
2) Agar proses berkarya menjadi lebih mudah, aman, dan tidak membuang bahan dengan sia-sia.', NULL, 'Menjelaskan hubungan kesesuaian alat/bahan dengan kualitas hasil karya dan kemudahan/keamanan proses.', 'Setiap bahan memiliki karakter berbeda, misalnya cat air membutuhkan kertas gambar tebal agar tidak berkerut atau robek.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Jelaskan manfaat menggunakan bentuk dasar geometris (seperti lingkaran, segitiga, persegi) saat membuat sketsa, dan berikan 1 (satu) contohnya!', 'sulit', 'uraian', 'Uraian', 34, 'Menggambar Sketsa', 'Siswa dapat menjelaskan manfaat bentuk dasar geometris dalam menggambar sketsa disertai contoh.', 'C3', NULL, NULL, NULL, NULL, 'Manfaatnya adalah mempermudah menentukan proporsi, ukuran, dan bentuk dasar objek sehingga gambar menjadi seimbang dan tidak melenceng.
Contoh: Menggambar badan Burung Enggang atau rumah adat dengan memulai dari bentuk dasar persegi panjang, segitiga untuk atap, dan lingkaran untuk kepala.', NULL, 'Menjelaskan manfaat mempermudah proporsi/bentuk dasar + 1 contoh penerapan bentuk geometris pada objek.', 'Hampir semua benda di sekitar kita dapat disederhanakan menjadi gabungan bentuk geometris terlebih dahulu saat membuat sketsa.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;
  v_question_id := NULL;
  INSERT INTO questions (subject_id, question_text, difficulty, question_type, type_label, question_number, topic, indicator, cognitive_level, stimulus_title, stimulus_text, visual_asset, visual_caption, expected_answer, accepted_answers, rubric_notes, explanation, is_active) VALUES (v_subject_id, 'Studi kasus: Andi langsung menekan pensil dengan sangat kuat dan tebal saat membuat sketsa awal di kertas tipis. Ketika gambarnya salah dan dihapus, kertasnya menjadi kotor, berbekas hitam, dan hampir sobek.
Analisislah kesalahan yang dilakukan Andi dan berikan solusi yang tepat!', 'sulit', 'uraian', 'Uraian', 35, 'Menggambar Sketsa', 'Siswa dapat menganalisis kesalahan dalam studi kasus pembuatan sketsa dan memberikan solusinya.', 'C4', NULL, NULL, NULL, NULL, 'Kesalahan Andi: Menekan pensil terlalu kuat dan tebal pada tahap sketsa awal di atas kertas tipis.
Solusi: Buatlah sketsa awal menggunakan garis tipis dan ringan dengan pensil agar mudah dihapus tanpa merusak kertas, serta gunakan kertas gambar yang agak tebal. Garis baru ditebalkan setelah bentuk sketsa sudah tepat.', NULL, 'Mengidentifikasi kesalahan (menekan pensil terlalu tebal/kuat saat sketsa) + solusi (menggaris tipis dulu baru ditebalkan).', 'Tahap awal sketsa selalu dibuat tipis-tipis untuk memudahkan perbaikan sebelum penebalan garis akhir.', true) ON CONFLICT DO NOTHING RETURNING id INTO v_question_id;

END $$;
