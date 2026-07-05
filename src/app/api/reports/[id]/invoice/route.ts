import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { audit } from "@/lib/audit";
import { parseCodedReceipt, CodedReceiptParseError } from "@/lib/coded-receipt";
import { db } from "@/lib/db";
import { draftCodedBill } from "@/lib/draft-bill";
import { can, normaliseRole } from "@/lib/permissions";
import { getSession } from "@/lib/session";
import { approvals, reports } from "@/lib/schema";
import { NotConnectedError } from "@/lib/xero";

// Ops manager stages a bill from a field report: DRAFT ACCPAY lands in Xero
// ("pending" there), an approvals row lands in the accountant's queue here.
// The bill write reuses the ONE write path — validation, DRAFT read-back,
// bill.drafted audit — with the report's submission event as chain parent.

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "sign in first" }, { status: 401 });
  if (!can(normaliseRole(user.role), "review-reports")) {
    return NextResponse.json(
      { error: `role "${user.role}" cannot stage invoices from reports` },
      { status: 403 }
    );
  }

  const { id } = await params;
  const [report] = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
  if (!report) return NextResponse.json({ error: "report not found" }, { status: 404 });
  if (report.status !== "open") {
    return NextResponse.json({ error: `report is ${report.status}, not open` }, { status: 409 });
  }

  let coded;
  try {
    const json = (await request.json()) as { coded?: unknown };
    coded = parseCodedReceipt(json.coded);
  } catch (err) {
    const message = err instanceof CodedReceiptParseError ? err.message : "body must be JSON with a coded bill";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Root of this chain: the report's submission event.
  const submittedEvents = await audit.query({
    eventType: "report.submitted",
    subjectId: report.id,
    limit: 1,
  });

  try {
    const result = await draftCodedBill({
      coded,
      receiptId: `RPT-${report.id.slice(0, 8)}`,
      parentEventId: submittedEvents[0]?.id ?? null,
      actor: `user:${user.name} (${user.role})`,
    });
    if (!result.ok) {
      return NextResponse.json(result, { status: 422 });
    }

    const [approval] = await db
      .insert(approvals)
      .values({
        kind: "field-report-bill",
        subjectId: report.id,
        summary: `${coded.supplier} · £${coded.grossInclVat.toFixed(2)} · ${report.description.slice(0, 80)}`,
        detail: {
          invoiceId: result.invoiceId,
          reportDescription: report.description,
          propertyId: report.propertyId,
          supplier: coded.supplier,
          grossInclVat: coded.grossInclVat,
          accountCode: coded.accountCode,
          billDraftedEventId: result.auditEventId,
        },
        stagedBy: user.name,
      })
      .returning();

    await db
      .update(reports)
      .set({ status: "invoiced", approvalId: approval.id })
      .where(eq(reports.id, report.id));

    return NextResponse.json({ ok: true, invoiceId: result.invoiceId, approvalId: approval.id });
  } catch (err) {
    if (err instanceof NotConnectedError) {
      return NextResponse.json({ error: "Not connected to Xero — sign in first" }, { status: 409 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
