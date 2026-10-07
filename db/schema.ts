import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  index,
} from "drizzle-orm/sqlite-core";
export const participants = sqliteTable("participants", {
  id: text("id").primaryKey(),
  canCluster: integer("can_cluster").notNull().default(0),
  createdAt: integer("created_at").notNull(),
});
export const questions = sqliteTable(
  "questions",
  {
    id: text("id").primaryKey(),
    body: text("body").notNull(),
    authorId: text("author_id")
      .notNull()
      .references(() => participants.id),
    name: text("name"),
    ministry: text("ministry"),
    anonymous: integer("anonymous").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("idx_questions_created").on(t.createdAt)],
);
export const comments = sqliteTable(
  "comments",
  {
    isAgent: integer("is_agent").notNull().default(0),
    sources: text("sources").notNull().default("[]"),
    id: text("id").primaryKey(),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    authorId: text("author_id")
      .notNull()
      .references(() => participants.id),
    name: text("name"),
    ministry: text("ministry"),
    anonymous: integer("anonymous").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("idx_comments_question_created").on(t.questionId, t.createdAt)],
);
export const votes = sqliteTable(
  "votes",
  {
    count: integer("count").notNull().default(1),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    participantId: text("participant_id")
      .notNull()
      .references(() => participants.id),
  },
  (t) => [primaryKey({ columns: [t.questionId, t.participantId] })],
);
export const clustering = sqliteTable("clustering", {
  runId: text("run_id"),
  responseId: text("response_id"),
  attempts: integer("attempts").notNull().default(0),
  jobStartedAt: integer("job_started_at"),
  attemptStartedAt: integer("attempt_started_at"),
  workLeaseUntil: integer("work_lease_until").notNull().default(0),
  questionIds: text("question_ids").notNull().default("[]"),
  jobInputHash: text("job_input_hash").notNull().default(""),
  durationMs: integer("duration_ms"),
  id: integer("id").primaryKey(),
  snapshot: text("snapshot").notNull().default("[]"),
  inputHash: text("input_hash").notNull().default(""),
  updatedAt: integer("updated_at"),
  lastChecked: integer("last_checked"),
  nextRun: integer("next_run").notNull().default(0),
  lockUntil: integer("lock_until").notNull().default(0),
  status: text("status").notNull().default("waiting"),
  error: text("error"),
});
export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  expiresAt: integer("expires_at").notNull(),
});

export const agentJobs = sqliteTable(
  "agent_jobs",
  {
    questionId: text("question_id")
      .primaryKey()
      .references(() => questions.id, { onDelete: "cascade" }),
    responseId: text("response_id"),
    status: text("status").notNull().default("queued"),
    leaseUntil: integer("lease_until").notNull().default(0),
    attempts: integer("attempts").notNull().default(0),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("idx_agent_jobs_status_lease").on(t.status, t.leaseUntil)],
);

export const themeAssignmentJobs = sqliteTable(
  "theme_assignment_jobs",
  {
    questionId: text("question_id")
      .primaryKey()
      .references(() => questions.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    leaseUntil: integer("lease_until").notNull().default(0),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [
    index("idx_theme_assignment_status_lease").on(t.status, t.leaseUntil),
  ],
);
