import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  combine,
  noMoneyMovement,
  statementCompleteness,
  type GuardResult,
} from "@/lib/guardrails";
import { statements } from "@/lib/schema";
import type { StatementLine, StatementTotals } from "@/lib/statement";
import { landlordMatches, STATEMENT_MONTH } from "@/lib/statement-io";

// The human approval gate. Guards run server-side against the persisted
// snapshot — never against numbers the client sent. Approval records a
// decision and STOPS: no email, no Xero write, no payment. The response
// says so explicitly.

export async function POST(
  request: Request,
  { params }: { params: Promise<{ landlordId: string }> }
) {
  const { landlordId } = await params;

  // The action kind is part of the request so guard 1 has something real to
  // judge; anything but "approve-statement" escalates.
  let actionKind = "approve-statement";
  try {
    const json = (await request.json()) as { actionKind?: unknown };
    if (typeof json.actionKind === "string") actionKind = json.actionKind;
  } catch {
    // empty body is fine — defaults to approve-statement
  }

  const rows = await db
    .select()
    .from(statements)
    .where(eq(statements.month, STATEMENT_MONTH))
    .orderBy(desc(statements.createdAt));
  const snapshot = rows.find((r) =>
    landlordMatches(landlordId, r.landlordContactId)
  );
  if (!snapshot) {
    return NextResponse.json(
      { error: `no assembled statement for landlord "${landlordId}" — GET /api/statements/${landlordId} first` },
      { status: 404 }
    );
  }

  const lines = snapshot.lines as StatementLine[];
  const totals = snapshot.totals as StatementTotals;

  // Chain the decision to the assembly that produced these numbers, so
  // audit.chain(approval) walks back through assembled → (bill/receipt
  // events referenced in the lines).
  const assembledEvents = await audit.query({
    eventType: "statement.assembled",
    subjectId: snapshot.id,
    limit: 200,
  });
  const assembledEventId = assembledEvents.at(-1)?.id ?? null;

  const results: GuardResult[] = [
    noMoneyMovement(actionKind),
    statementCompleteness(
      lines.map((l) => ({
        sourceType: l.sourceType,
        sourceId: l.sourceId,
        amountPence: l.amountPence,
        billStatus: l.billStatus,
      })),
      totals
    ),
  ];
  const decision = combine(results);

  if (decision !== "allow") {
    await db
      .update(statements)
      .set({ status: "held" })
      .where(eq(statements.id, snapshot.id));
    const heldEvent = await audit.append({
      eventType: "statement.held",
      actor: "guardrails",
      subjectType: "statement",
      subjectId: snapshot.id,
      parentEventId: assembledEventId,
      payload: { decision, results, landlordId, month: STATEMENT_MONTH },
    });
    return NextResponse.json(
      {
        approved: false,
        moved: false,
        status: "held",
        decision,
        guards: results,
        heldEventId: heldEvent.id,
      },
      { status: 409 }
    );
  }

  const guardEvent = await audit.append({
    eventType: "guard.evaluated",
    actor: "guardrails",
    subjectType: "statement",
    subjectId: snapshot.id,
    parentEventId: assembledEventId,
    payload: { decision, results, landlordId, month: STATEMENT_MONTH },
  });

  const approvedAt = new Date();
  await db
    .update(statements)
    .set({ status: "approved", approvedBy: "user:demo", approvedAt })
    .where(eq(statements.id, snapshot.id));

  const approvedEvent = await audit.append({
    eventType: "statement.approved",
    actor: "user:demo",
    subjectType: "statement",
    subjectId: snapshot.id,
    parentEventId: guardEvent.id,
    payload: {
      landlordId,
      month: STATEMENT_MONTH,
      totals,
      note: "authorised for release · no funds moved",
    },
  });

  return NextResponse.json({
    approved: true,
    moved: false,
    status: "approved",
    guards: results,
    approvedEventId: approvedEvent.id,
    note: "Approval authorises the human to pay from Xero. ShortStay issued no Payment and no transfer.",
  });
}
