import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { can, normaliseRole } from "@/lib/permissions";
import { getSession } from "@/lib/session";
import { approvals, reports } from "@/lib/schema";

// The accountant's decision. Approve records authorisation — the Xero bill
// stays DRAFT for a human to pay from Xero (never-moves-money). Deny records
// the reason and flags the draft for manual discard: ShortStay cannot void
// or delete Xero documents by design.

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "sign in first" }, { status: 401 });
  const role = normaliseRole(user.role);
  if (!can(role, "approve-bills")) {
    return NextResponse.json(
      {
        error: `role "${user.role}" cannot decide bill approvals — accountant authority required`,
        decision: "escalate",
      },
      { status: 403 }
    );
  }

  const { id } = await params;
  const [approval] = await db.select().from(approvals).where(eq(approvals.id, id)).limit(1);
  if (!approval) return NextResponse.json({ error: "approval not found" }, { status: 404 });
  if (approval.status !== "pending") {
    return NextResponse.json({ error: `already ${approval.status}` }, { status: 409 });
  }

  let decision: "approved" | "denied";
  let reason = "";
  try {
    const json = (await request.json()) as { decision?: unknown; reason?: unknown };
    if (json.decision !== "approved" && json.decision !== "denied") {
      return NextResponse.json({ error: 'decision must be "approved" or "denied"' }, { status: 400 });
    }
    decision = json.decision;
    reason = typeof json.reason === "string" ? json.reason.trim() : "";
    if (decision === "denied" && !reason) {
      return NextResponse.json({ error: "a reason is required to deny" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "body must be JSON" }, { status: 400 });
  }

  const detail = (approval.detail ?? {}) as { billDraftedEventId?: string; invoiceId?: string };

  const event = await audit.append({
    eventType: "approval.decided",
    actor: `user:${user.name} (${user.role})`,
    subjectType: "approval",
    subjectId: approval.id,
    parentEventId: detail.billDraftedEventId ?? null,
    payload: {
      decision,
      ...(reason ? { reason } : {}),
      invoiceId: detail.invoiceId,
      note:
        decision === "approved"
          ? "authorises the human to pay from Xero — no Payment issued"
          : "Xero draft flagged for manual discard — ShortStay cannot void documents",
    },
  });

  const decidedAt = new Date();
  await db
    .update(approvals)
    .set({ status: decision, decidedBy: user.name, decidedAt, auditEventId: event.id })
    .where(eq(approvals.id, approval.id));
  await db
    .update(reports)
    .set({ status: decision })
    .where(eq(reports.approvalId, approval.id));

  return NextResponse.json({
    ok: true,
    decision,
    moved: false,
    decidedEventId: event.id,
  });
}
