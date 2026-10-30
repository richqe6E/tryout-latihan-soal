import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Skema database Tryout Yuk (PRD bagian 6) dengan penyesuaian PostgreSQL:
 * id `uuid` (gen_random_uuid), waktu `timestamptz`, foreign key sungguhan,
 * ON DELETE CASCADE untuk data turunan sesi, dan index untuk kueri yang sering dipakai.
 */

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
};

export const difficultyEnum = pgEnum("difficulty", ["mudah", "sedang", "sulit"]);
export const sessionStatusEnum = pgEnum("session_status", ["berjalan", "selesai"]);
export const submitReasonEnum = pgEnum("submit_reason", ["manual", "timeout"]);

/**
 * Akun pengguna. Kolom mengikuti model `user` Better Auth (+ plugin nomor HP) dan PRD.
 * Password TIDAK disimpan di sini: Better Auth menyimpan hash-nya di `auth_accounts.password`
 * (akun bertipe "credential") — itulah `password_hash` pada PRD.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  /** Email untuk masuk. Pengguna yang daftar dengan nomor HP saja mendapat email pengganti internal. */
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  /** Nomor HP (opsional) untuk daftar, masuk, dan lupa password. Nama kunci mengikuti plugin `phoneNumber`. */
  phoneNumber: text("phone").unique(),
  phoneNumberVerified: boolean("phone_verified").notNull().default(false),
  image: text("image"),
  ...timestamps,
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/**
 * Pengaturan pribadi pengguna (satu baris per pengguna). Baris dibuat saat pertama kali disimpan;
 * sebelum itu berlaku pengaturan bawaan (10 soal, 30 menit, pengingat 19:00 WIB).
 */
export const userSettings = pgTable(
  "user_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    defaultQuestionCount: integer("default_question_count").notNull().default(10),
    defaultDurationSeconds: integer("default_duration_seconds")
      .notNull()
      .default(30 * 60),
    reminderEnabled: boolean("reminder_enabled").notNull().default(true),
    /** Jam pengingat "HH:MM" menurut `reminder_timezone`. */
    reminderTime: text("reminder_time").notNull().default("19:00"),
    reminderTimezone: text("reminder_timezone").notNull().default("Asia/Jakarta"),
    /** Kapan pengingat terakhir dikirim — mencegah pengingat ganda di hari yang sama. */
    lastReminderSentAt: timestamp("last_reminder_sent_at", { withTimezone: true }),
    ...timestamps,
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // Batas sama dengan SESSION_LIMITS di src/lib/tryout/limits.ts.
    check("user_settings_question_count_range", sql`${table.defaultQuestionCount} BETWEEN 1 AND 50`),
    check("user_settings_duration_range", sql`${table.defaultDurationSeconds} BETWEEN 60 AND 10800`),
    check(
      "user_settings_reminder_time_format",
      sql`${table.reminderTime} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'`,
    ),
    // Job pengingat: cari pengguna yang mengaktifkan pengingat pada jam tertentu.
    index("user_settings_reminder_idx")
      .on(table.reminderTime)
      .where(sql`${table.reminderEnabled}`),
  ],
);

/** Sesi masuk Better Auth (token cookie). Berbeda dengan `tryout_sessions`. */
export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    ...timestamps,
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("auth_sessions_user_idx").on(table.userId)],
);

/** Cara masuk pengguna. Akun "credential" menyimpan hash password (scrypt) di kolom `password`. */
export const authAccounts = pgTable(
  "auth_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    idToken: text("id_token"),
    password: text("password"),
    ...timestamps,
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("auth_accounts_user_idx").on(table.userId),
    uniqueIndex("auth_accounts_provider_account_uq").on(table.providerId, table.accountId),
  ],
);

/** Kode/token sementara: verifikasi email, OTP nomor HP, dan reset password. */
export const authVerifications = pgTable(
  "auth_verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("auth_verifications_identifier_idx").on(table.identifier)],
);

/** Mata pelajaran / topik. */
export const subjects = pgTable("subjects", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Pengenal ramah-URL, mis. "matematika". */
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  /** Urutan tampil di halaman pilih mapel (kecil dulu). */
  position: smallint("position").notNull().default(0),
  /** Mapel nonaktif disembunyikan dari pilihan, tetapi riwayatnya tetap ada. */
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

/** Bank soal. */
export const questions = pgTable(
  "questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // RESTRICT: mapel yang sudah punya soal tidak boleh terhapus diam-diam.
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "restrict" }),
    questionText: text("question_text").notNull(),
    difficulty: difficultyEnum("difficulty").notNull(),
    /** Pembahasan: alasan kunci jawaban dengan bahasa sederhana. Wajib diisi. */
    explanation: text("explanation").notNull(),
    /**
     * Soal nonaktif tidak lagi diundi ke sesi baru, tetapi tetap utuh untuk riwayat & pembahasan
     * sesi lama. Pensiunkan soal dengan ini, bukan dengan DELETE.
     */
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // Pengundian soal: hanya soal aktif per mapel & tingkat.
    index("questions_active_pick_idx")
      .on(table.subjectId, table.difficulty)
      .where(sql`${table.isActive}`),
    // Bank soal terus bertambah: cegah soal kembar (teks sama, abaikan besar-kecil & spasi tepi).
    uniqueIndex("questions_subject_text_uq").on(
      table.subjectId,
      sql`md5(lower(btrim(${table.questionText})))`,
    ),
    check("questions_text_not_blank", sql`length(btrim(${table.questionText})) > 0`),
    check("questions_explanation_not_blank", sql`length(btrim(${table.explanation})) > 0`),
  ],
);

/** Pilihan jawaban; tepat satu `is_correct` per soal. */
export const options = pgTable(
  "options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    optionText: text("option_text").notNull(),
    isCorrect: boolean("is_correct").notNull().default(false),
    /** Urutan tampil (0 = A). */
    position: smallint("position").notNull(),
    /** Catatan pembahasan untuk pilihan ini (mis. kenapa pengecoh ini keliru). Opsional. */
    explanation: text("explanation"),
  },
  (table) => [
    index("options_question_idx").on(table.questionId),
    uniqueIndex("options_question_position_uq").on(table.questionId, table.position),
    // Kunci jawaban tunggal: paling banyak satu pilihan benar per soal.
    uniqueIndex("options_one_correct_per_question_uq")
      .on(table.questionId)
      .where(sql`${table.isCorrect}`),
    check("options_position_range", sql`${table.position} BETWEEN 0 AND 4`),
  ],
);

/** Sesi tryout yang dikerjakan pengguna. */
export const tryoutSessions = pgTable(
  "tryout_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id),
    difficulty: difficultyEnum("difficulty").notNull(),
    totalQuestions: integer("total_questions").notNull(),
    /** Jumlah soal yang diminta saat memulai; lebih besar dari total bila bank soal kurang. */
    requestedQuestions: integer("requested_questions").notNull(),
    durationSeconds: integer("duration_seconds").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    /** Batas waktu berjalan; digeser saat sesi dilanjutkan setelah dijeda. */
    deadlineAt: timestamp("deadline_at", { withTimezone: true }).notNull(),
    /** Sisa waktu saat dijeda (detik); null jika sedang berjalan atau selesai. */
    pausedRemainingSeconds: integer("paused_remaining_seconds"),
    /** Nomor soal terakhir yang dibuka (untuk "lanjutkan dari soal terakhir"). */
    lastOrderNumber: integer("last_order_number").notNull().default(1),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    status: sessionStatusEnum("status").notNull().default("berjalan"),
    submitReason: submitReasonEnum("submit_reason"),
    /** Hasil penilaian; diisi bersamaan saat sesi dikumpulkan, null selama berjalan. */
    score: integer("score"),
    correctCount: integer("correct_count"),
    wrongCount: integer("wrong_count"),
    unansweredCount: integer("unanswered_count"),
    /** Lama pengerjaan bersih (detik): durasi dikurangi sisa waktu, tanpa waktu jeda. */
    usedSeconds: integer("used_seconds"),
    /**
     * Dihapus dari riwayat oleh pengguna (soft delete, bisa diurungkan). Baris dibersihkan
     * permanen oleh job setelah masa simpan habis.
     */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("tryout_sessions_user_idx").on(table.userId),
    index("tryout_sessions_user_status_idx").on(table.userId, table.status),
    // Riwayat nilai: sesi selesai milik pengguna, terbaru dulu.
    index("tryout_sessions_user_finished_idx").on(table.userId, table.finishedAt),
    // Riwayat latihan: sesi pengguna yang belum dihapus, terbaru dulu.
    index("tryout_sessions_user_history_idx")
      .on(table.userId, table.startedAt.desc())
      .where(sql`${table.deletedAt} IS NULL`),
    // Pembersihan permanen sesi yang sudah lama dihapus.
    index("tryout_sessions_deleted_idx")
      .on(table.deletedAt)
      .where(sql`${table.deletedAt} IS NOT NULL`),
    // Aturan timer & status dijaga juga di level database.
    check("tryout_sessions_duration_positive", sql`${table.durationSeconds} > 0`),
    check("tryout_sessions_total_positive", sql`${table.totalQuestions} > 0`),
    check(
      "tryout_sessions_requested_covers_total",
      sql`${table.requestedQuestions} >= ${table.totalQuestions}`,
    ),
    check("tryout_sessions_deadline_after_start", sql`${table.deadlineAt} >= ${table.startedAt}`),
    check(
      "tryout_sessions_paused_remaining_valid",
      sql`${table.pausedRemainingSeconds} IS NULL OR ${table.pausedRemainingSeconds} BETWEEN 0 AND ${table.durationSeconds}`,
    ),
    check("tryout_sessions_score_range", sql`${table.score} IS NULL OR ${table.score} BETWEEN 0 AND 100`),
    check(
      "tryout_sessions_finished_consistent",
      sql`(${table.status} = 'selesai') = (${table.finishedAt} IS NOT NULL)`,
    ),
    // Hasil lengkap hanya ada pada sesi selesai, dan rinciannya selalu menjumlah ke total soal.
    check(
      "tryout_sessions_result_consistent",
      sql`(${table.status} = 'selesai') = (${table.score} IS NOT NULL AND ${table.correctCount} IS NOT NULL AND ${table.wrongCount} IS NOT NULL AND ${table.unansweredCount} IS NOT NULL AND ${table.usedSeconds} IS NOT NULL)`,
    ),
    check(
      "tryout_sessions_used_seconds_valid",
      sql`${table.usedSeconds} IS NULL OR ${table.usedSeconds} BETWEEN 0 AND ${table.durationSeconds}`,
    ),
    check(
      "tryout_sessions_result_counts_valid",
      sql`${table.correctCount} IS NULL OR (${table.correctCount} >= 0 AND ${table.wrongCount} >= 0 AND ${table.unansweredCount} >= 0 AND ${table.correctCount} + ${table.wrongCount} + ${table.unansweredCount} = ${table.totalQuestions})`,
    ),
  ],
);

/** Daftar soal yang muncul dalam satu sesi beserta urutannya. */
export const sessionQuestions = pgTable(
  "session_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => tryoutSessions.id, { onDelete: "cascade" }),
    // RESTRICT: soal yang pernah dipakai sesi tidak boleh dihapus (pakai `is_active`).
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "restrict" }),
    orderNumber: integer("order_number").notNull(),
  },
  (table) => [
    index("session_questions_session_idx").on(table.sessionId),
    uniqueIndex("session_questions_session_order_uq").on(table.sessionId, table.orderNumber),
    uniqueIndex("session_questions_session_question_uq").on(table.sessionId, table.questionId),
  ],
);

/** Jawaban pengguna per soal dalam satu sesi (disimpan otomatis setiap berubah). */
export const answers = pgTable(
  "answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => tryoutSessions.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "restrict" }),
    // RESTRICT: menghapus pilihan yang pernah dipilih akan mengubah riwayat jawaban.
    selectedOptionId: uuid("selected_option_id").references(() => options.id, { onDelete: "restrict" }),
    isFlagged: boolean("is_flagged").notNull().default(false),
    /** Diisi saat sesi dinilai. */
    isCorrect: boolean("is_correct"),
    answeredAt: timestamp("answered_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("answers_session_idx").on(table.sessionId),
    uniqueIndex("answers_session_question_uq").on(table.sessionId, table.questionId),
  ],
);

export const usersRelations = relations(users, ({ one, many }) => ({
  settings: one(userSettings, { fields: [users.id], references: [userSettings.userId] }),
  sessions: many(tryoutSessions),
  authSessions: many(authSessions),
  authAccounts: many(authAccounts),
}));

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
  user: one(users, { fields: [authSessions.userId], references: [users.id] }),
}));

export const authAccountsRelations = relations(authAccounts, ({ one }) => ({
  user: one(users, { fields: [authAccounts.userId], references: [users.id] }),
}));

export const subjectsRelations = relations(subjects, ({ many }) => ({
  questions: many(questions),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  subject: one(subjects, { fields: [questions.subjectId], references: [subjects.id] }),
  options: many(options),
}));

export const optionsRelations = relations(options, ({ one }) => ({
  question: one(questions, { fields: [options.questionId], references: [questions.id] }),
}));

export const tryoutSessionsRelations = relations(tryoutSessions, ({ one, many }) => ({
  user: one(users, { fields: [tryoutSessions.userId], references: [users.id] }),
  subject: one(subjects, { fields: [tryoutSessions.subjectId], references: [subjects.id] }),
  sessionQuestions: many(sessionQuestions),
  answers: many(answers),
}));

export const sessionQuestionsRelations = relations(sessionQuestions, ({ one }) => ({
  session: one(tryoutSessions, { fields: [sessionQuestions.sessionId], references: [tryoutSessions.id] }),
  question: one(questions, { fields: [sessionQuestions.questionId], references: [questions.id] }),
}));

export const answersRelations = relations(answers, ({ one }) => ({
  session: one(tryoutSessions, { fields: [answers.sessionId], references: [tryoutSessions.id] }),
  question: one(questions, { fields: [answers.questionId], references: [questions.id] }),
  selectedOption: one(options, { fields: [answers.selectedOptionId], references: [options.id] }),
}));
