/**
 * Copied verbatim from @physical-substrate/audit-log (types only) —
 * ShortStay doesn't consume the substrate packages, so the interface lives
 * locally. Keep in sync manually if the substrate evolves.
 *
 * Append-only event log with explicit causality chains. Every mutating
 * action in the system writes an AuditEvent before returning.
 *
 * Three properties this interface enforces at the type layer:
 *   1. Append-only: no update or delete methods exist. Mistakes are
 *      corrected by appending compensating events, never by mutation.
 *   2. Explicit causality: callers pass parentEventId at append time.
 *      The substrate does not manage ambient context.
 *   3. Opaque subject identity: subjectType/subjectId are strings.
 */

export interface AuditEvent {
  readonly id: string;
  readonly eventType: string;
  readonly actor: string;
  readonly subjectType: string;
  readonly subjectId: string;
  readonly payload: unknown;
  readonly parentEventId: string | null;
  readonly createdAt: Date;
}

export type AuditEventInput = Omit<AuditEvent, "id" | "createdAt">;

export interface AuditQuery {
  readonly eventType?: string;
  readonly actor?: string;
  readonly subjectType?: string;
  readonly subjectId?: string;
  readonly since?: Date;
  readonly until?: Date;
  readonly limit?: number;
}

export interface AuditLog {
  append(input: AuditEventInput): Promise<AuditEvent>;
  query(filter: AuditQuery): Promise<readonly AuditEvent[]>;
  /**
   * Walk the parent chain from a given event back to its root.
   * Returns events oldest-first (root → ... → eventId). Includes the
   * supplied event itself as the last element. Empty array if the event
   * does not exist.
   */
  chain(eventId: string): Promise<readonly AuditEvent[]>;
}
