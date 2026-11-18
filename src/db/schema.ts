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

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
};

export const difficultyEnum = pgEnum("difficulty", ["mudah", "sedang", "sulit"]);
export const questionTypeEnum = pgEnum("question_type", ["pg", "isian", "uraian"]);
export const sessionStatusEnum = pgEnum("session_status", ["berjalan", "selesai"]);
export const submitReasonEnum = pgEnum("submit_reason", ["manual", "timeout"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  phoneNumber: text("phone").unique(),
  phoneNumberVerified: boolean("phone_verified").notNull().default(false),
  image: text("image"),
  ...timestamps,
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const userSettings = pgTable(
  "user_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    defaultQuestionCount: integer("default_question_count").notNull().default(35),
    defaultDurationSeconds: integer("default_duration_seconds")
      .notNull()
      .default(60 * 60),
    reminderEnabled: boolean("reminder_enabled").notNull().default(true),
    reminderTime: text("reminder_time").notNull().default("19:00"),
    reminderTimezone: text("reminder_timezone").notNull().default("Asia/Jakarta"),
    lastReminderSentAt: timestamp("last_reminder_sent_at", { withTimezone: true }),
    ...timestamps,
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check("user_settings_question_count_range", sql`${table.defaultQuestionCount} BETWEEN 1 AND 50`),
    check("user_settings_duration_range", sql`${table.defaultDurationSeconds} BETWEEN 60 AND 10800`),
    check(
      "user_settings_reminder_time_format",
      sql`${table.reminderTime} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'`,
    ),
    index("user_settings_reminder_idx")
      .on(table.reminderTime)
      .where(sql`${table.reminderEnabled}`),
  ],
);

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

export const subjects = pgTable("subjects", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  position: smallint("position").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "restrict" }),
    questionText: text("question_text").notNull(),
    difficulty: difficultyEnum("difficulty").notNull(),
    questionType: questionTypeEnum("question_type").notNull().default("pg"),
    typeLabel: text("type_label"),
    questionNumber: integer("question_number"),
    topic: text("topic"),
    indicator: text("indicator"),
    cognitiveLevel: text("cognitive_level"),
    stimulusTitle: text("stimulus_title"),
    stimulusText: text("stimulus_text"),
    visualAsset: text("visual_asset"),
    visualCaption: text("visual_caption"),
    expectedAnswer: text("expected_answer"),
    acceptedAnswers: text("accepted_answers"),
    rubricNotes: text("rubric_notes"),
    explanation: text("explanation").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("questions_active_pick_idx")
      .on(table.subjectId, table.difficulty)
      .where(sql`${table.isActive}`),
    index("questions_subject_number_idx").on(table.subjectId, table.questionNumber),
    uniqueIndex("questions_subject_text_uq").on(
      table.subjectId,
      sql`md5(lower(btrim(${table.questionText})))`,
    ),
    check("questions_text_not_blank", sql`length(btrim(${table.questionText})) > 0`),
    check("questions_explanation_not_blank", sql`length(btrim(${table.explanation})) > 0`),
  ],
);

export const options = pgTable(
  "options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    optionText: text("option_text").notNull(),
    isCorrect: boolean("is_correct").notNull().default(false),
    position: smallint("position").notNull(),
    explanation: text("explanation"),
  },
  (table) => [
    index("options_question_idx").on(table.questionId),
    uniqueIndex("options_question_position_uq").on(table.questionId, table.position),
    uniqueIndex("options_one_correct_per_question_uq")
      .on(table.questionId)
      .where(sql`${table.isCorrect}`),
    check("options_position_range", sql`${table.position} BETWEEN 0 AND 4`),
  ],
);

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
    mode: text("mode").notNull().default("kisi-kisi"),
    totalQuestions: integer("total_questions").notNull(),
    requestedQuestions: integer("requested_questions").notNull(),
    durationSeconds: integer("duration_seconds").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    deadlineAt: timestamp("deadline_at", { withTimezone: true }).notNull(),
    pausedRemainingSeconds: integer("paused_remaining_seconds"),
    lastOrderNumber: integer("last_order_number").notNull().default(1),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    status: sessionStatusEnum("status").notNull().default("berjalan"),
    submitReason: submitReasonEnum("submit_reason"),
    score: integer("score"),
    correctCount: integer("correct_count"),
    wrongCount: integer("wrong_count"),
    unansweredCount: integer("unanswered_count"),
    usedSeconds: integer("used_seconds"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("tryout_sessions_user_idx").on(table.userId),
    index("tryout_sessions_user_status_idx").on(table.userId, table.status),
    index("tryout_sessions_user_finished_idx").on(table.userId, table.finishedAt),
    index("tryout_sessions_user_history_idx")
      .on(table.userId, table.startedAt.desc())
      .where(sql`${table.deletedAt} IS NULL`),
    index("tryout_sessions_deleted_idx")
      .on(table.deletedAt)
      .where(sql`${table.deletedAt} IS NOT NULL`),
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

export const sessionQuestions = pgTable(
  "session_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => tryoutSessions.id, { onDelete: "cascade" }),
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
    selectedOptionId: uuid("selected_option_id").references(() => options.id, { onDelete: "restrict" }),
    answerText: text("answer_text"),
    isFlagged: boolean("is_flagged").notNull().default(false),
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
