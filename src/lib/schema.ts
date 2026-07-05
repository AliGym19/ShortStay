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

// Local registry joining a Xero landlord contact to the properties ShortStay
// manages for them. Rates are stored as decimal strings ("0.15"); all money
// math happens in integer pence (lib/statement.ts).
export const properties = sqliteTable("properties", {
  id: text("id").primaryKey(), // "P1"
  name: text("name").notNull(),
  area: text("area"),
  landlordContactId: text("landlord_contact_id").notNull(), // Xero ContactID
  landlordName: text("landlord_name").notNull(),
  trackingOptionId: text("tracking_option_id"), // Xero TrackingOptionID, if org has a Property category
  commissionRate: text("commission_rate").notNull(), // "0.15"
  agencyFeeRate: text("agency_fee_rate").notNull(), // "0.12"
});

// Assembled statement snapshots + approval state. Every line in `lines`
// carries { sourceType, sourceId } — a Xero id or "computed". Totals are
// integer pence.
export const statements = sqliteTable("statements", {
  id: text("id").primaryKey().$defaultFn(uuid),
  landlordContactId: text("landlord_contact_id").notNull(),
  month: text("month").notNull(), // "2026-06"
  lines: text("lines", { mode: "json" }).notNull(),
  totals: text("totals", { mode: "json" }).notNull(),
  status: text("status").notNull().default("assembled"), // "assembled" | "held" | "approved"
  approvedBy: text("approved_by"),
  approvedAt: integer("approved_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Seeded booking-level detail (Booking.com has no API here). grossPence is
// integer pence; payout matching (lib/match.ts) computes net as
// gross × (1 − commission) per booking.
export const bookings = sqliteTable("bookings", {
  id: text("id").primaryKey(), // "bk-201"
  propertyId: text("property_id").notNull(),
  guest: text("guest"),
  nights: integer("nights"),
  grossPence: integer("gross_pence").notNull(),
  checkIn: text("check_in").notNull(), // "2026-06-02"
});

// Field reports submitted by cleaners/staff — the intake end of the
// report → invoice → approval pipeline. approvalId links to the approvals
// row once the ops manager has staged a bill from the report.
export const reports = sqliteTable("reports", {
  id: text("id").primaryKey().$defaultFn(uuid),
  propertyId: text("property_id").notNull(),
  description: text("description").notNull(),
  urgency: text("urgency").notNull().default("normal"), // "low" | "normal" | "urgent"
  category: text("category"),
  submittedBy: text("submitted_by").notNull(),
  status: text("status").notNull().default("open"), // "open" | "invoiced" | "approved" | "denied"
  approvalId: text("approval_id"),
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
