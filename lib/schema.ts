import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// SQLite has no native uuid default — ids are generated app-side.
const uuid = () => crypto.randomUUID();

export const auditEvents = sqliteTable("audit_events", {
  id: text("id").primaryKey().$defaultFn(uuid),
  eventType: text("event_type").notNull(),
  actor: text("actor").notNull(),
  subjectType: text("subject_type").notNull(),
  subjectId: text("subject_id").notNull(),
  payload: text("payload", { mode: "json" }),
  parentEventId: text("parent_event_id"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const prompts = sqliteTable("prompts", {
  id: text("id").primaryKey().$defaultFn(uuid),
  name: text("name").notNull(),
  body: text("body").notNull(),
  modelTarget: text("model_target").notNull(),
  status: text("status").notNull(),
  version: integer("version").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const approvals = sqliteTable("approvals", {
  id: text("id").primaryKey().$defaultFn(uuid),
  kind: text("kind").notNull(),
  subjectId: text("subject_id").notNull(),
  summary: text("summary").notNull(),
  detail: text("detail", { mode: "json" }),
  stagedBy: text("staged_by").notNull(),
  status: text("status").notNull().default("pending"),
  decidedBy: text("decided_by"),
  auditEventId: text("audit_event_id"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  decidedAt: integer("decided_at", { mode: "timestamp_ms" }),
});
