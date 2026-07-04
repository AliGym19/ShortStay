import "server-only";
import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import type {
  AuditEvent,
  AuditEventInput,
  AuditLog,
  AuditQuery,
} from "@/lib/audit-types";
import { db } from "@/lib/db";
import { auditEvents } from "@/lib/schema";

// Ported from paragon-hil apps/paragon-app/src/lib/audit.ts. Forced changes
// only: pg driver → drizzle-orm/better-sqlite3, substrate type import →
// local copy, chain() raw rows marshalled from SQLite's integer-ms/JSON-text
// storage. Method behaviour and the append-on-every-mutation discipline are
// unchanged.

type Row = typeof auditEvents.$inferSelect;

function rowToEvent(row: Row): AuditEvent {
  return {
    id: row.id,
    eventType: row.eventType,
    actor: row.actor,
    subjectType: row.subjectType,
    subjectId: row.subjectId,
    payload: row.payload as unknown,
    parentEventId: row.parentEventId,
    createdAt: row.createdAt,
  };
}

class SqliteAuditLog implements AuditLog {
  async append(input: AuditEventInput): Promise<AuditEvent> {
    const [row] = await db
      .insert(auditEvents)
      .values({
        eventType: input.eventType,
        actor: input.actor,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        payload: input.payload as object,
        parentEventId: input.parentEventId,
      })
      .returning();
    if (!row) throw new Error("audit.append: insert returned no row");
    return rowToEvent(row);
  }

  async query(filter: AuditQuery): Promise<readonly AuditEvent[]> {
    const conditions = [
      filter.eventType !== undefined ? eq(auditEvents.eventType, filter.eventType) : undefined,
      filter.actor !== undefined ? eq(auditEvents.actor, filter.actor) : undefined,
      filter.subjectType !== undefined ? eq(auditEvents.subjectType, filter.subjectType) : undefined,
      filter.subjectId !== undefined ? eq(auditEvents.subjectId, filter.subjectId) : undefined,
      filter.since !== undefined ? gte(auditEvents.createdAt, filter.since) : undefined,
      filter.until !== undefined ? lte(auditEvents.createdAt, filter.until) : undefined,
    ].filter((c): c is NonNullable<typeof c> => c !== undefined);

    const rows = await db
      .select()
      .from(auditEvents)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(auditEvents.createdAt))
      .limit(filter.limit ?? 200);

    return rows.map(rowToEvent);
  }

  async chain(eventId: string): Promise<readonly AuditEvent[]> {
    // Recursive CTE: walk parent_event_id from the supplied event back to
    // the root, then return oldest-first (root → ... → eventId). Single
    // round-trip; scales to arbitrary chain depth. SQLite supports
    // WITH RECURSIVE; raw rows come back unmarshalled (integer ms, JSON
    // text), hence the explicit conversions below.
    const rows = db.all<Record<string, unknown>>(sql`
      WITH RECURSIVE walk AS (
        SELECT *, 0 AS depth
          FROM ${auditEvents}
         WHERE ${auditEvents.id} = ${eventId}
        UNION ALL
        SELECT a.*, w.depth + 1
          FROM ${auditEvents} a
          JOIN walk w ON a.id = w.parent_event_id
      )
      SELECT id, event_type, actor, subject_type, subject_id,
             payload, parent_event_id, created_at
        FROM walk
       ORDER BY depth DESC
    `);

    return rows.map((r) => ({
      id: r.id as string,
      eventType: r.event_type as string,
      actor: r.actor as string,
      subjectType: r.subject_type as string,
      subjectId: r.subject_id as string,
      payload: typeof r.payload === "string" ? JSON.parse(r.payload) : r.payload,
      parentEventId: r.parent_event_id as string | null,
      createdAt: new Date(r.created_at as number),
    }));
  }
}

export const audit: AuditLog = new SqliteAuditLog();
