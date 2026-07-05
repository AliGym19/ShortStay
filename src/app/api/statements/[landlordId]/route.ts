import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { statements } from "@/lib/schema";
import { assembleStatement } from "@/lib/statement";
import { loadStatementInputs, STATEMENT_MONTH } from "@/lib/statement-io";

// Assemble the per-landlord statement for STATEMENT_MONTH and persist the
// snapshot the approval gate will judge.

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ landlordId: string }> }
) {
  const { landlordId } = await params;
  const inputs = await loadStatementInputs(landlordId);
  if (!inputs) {
    return NextResponse.json(
      { error: `no properties registered for landlord "${landlordId}"` },
      { status: 404 }
    );
  }

  const assembled = assembleStatement(
    inputs.landlordContactId,
    STATEMENT_MONTH,
    inputs.statementProps,
    inputs.revenue,
    inputs.costs
  );

  // One snapshot per landlord+month — refresh in place. Approval survives a
  // reassembly only if the totals are unchanged; new numbers demand a new
  // human decision.
  const [existing] = await db
    .select()
    .from(statements)
    .where(eq(statements.landlordContactId, inputs.landlordContactId))
    .orderBy(desc(statements.createdAt))
    .limit(1);

  let statementId: string;
  let status = "assembled";
  if (existing && existing.month === STATEMENT_MONTH) {
    const sameTotals =
      JSON.stringify(existing.totals) === JSON.stringify(assembled.totals);
    status = sameTotals ? existing.status : "assembled";
    await db
      .update(statements)
      .set({ lines: assembled.lines, totals: assembled.totals, status })
      .where(eq(statements.id, existing.id));
    statementId = existing.id;
  } else {
    const [row] = await db
      .insert(statements)
      .values({
        landlordContactId: inputs.landlordContactId,
        month: STATEMENT_MONTH,
        lines: assembled.lines,
        totals: assembled.totals,
        status: "assembled",
      })
      .returning();
    statementId = row.id;
  }

  const assembledEvent = await audit.append({
    eventType: "statement.assembled",
    actor: "system:statement-assembler",
    subjectType: "statement",
    subjectId: statementId,
    parentEventId: null,
    payload: {
      landlordId,
      month: STATEMENT_MONTH,
      totals: assembled.totals,
      lineCount: assembled.lines.length,
      xeroConnected: inputs.xeroConnected,
    },
  });

  return NextResponse.json({
    statementId,
    landlordId,
    landlordName: inputs.landlordName,
    month: STATEMENT_MONTH,
    status,
    lines: assembled.lines,
    totals: assembled.totals,
    xeroConnected: inputs.xeroConnected,
    assembledEventId: assembledEvent.id,
  });
}
