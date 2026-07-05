import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { draftSalesInvoice } from "@/lib/draft-bill";
import { can, normaliseRole } from "@/lib/permissions";
import { getSession } from "@/lib/session";
import { bookingRequests } from "@/lib/schema";
import { NotConnectedError } from "@/lib/xero";

// Ops decision on a booking request. Confirm → ACCREC sales invoice at
// SUBMITTED (Xero's pending state) to the channel contact; a human
// authorises and takes payment in Xero — ShortStay reads that back and
// never touches it. Decline → recorded, nothing written to Xero.

const CHANNEL_CONTACT = "Booking.com";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "sign in first" }, { status: 401 });
  if (!can(normaliseRole(user.role), "review-bookings")) {
    return NextResponse.json(
      { error: `role "${user.role}" cannot decide bookings` },
      { status: 403 }
    );
  }

  const { id } = await params;
  const [booking] = await db
    .select()
    .from(bookingRequests)
    .where(eq(bookingRequests.id, id))
    .limit(1);
  if (!booking) return NextResponse.json({ error: "booking not found" }, { status: 404 });
  if (booking.status !== "requested") {
    return NextResponse.json({ error: `already ${booking.status}` }, { status: 409 });
  }

  let decision: "confirmed" | "declined";
  try {
    const json = (await request.json()) as { decision?: unknown };
    if (json.decision !== "confirmed" && json.decision !== "declined") {
      return NextResponse.json({ error: 'decision must be "confirmed" or "declined"' }, { status: 400 });
    }
    decision = json.decision;
  } catch {
    return NextResponse.json({ error: "body must be JSON" }, { status: 400 });
  }

  const actor = `user:${user.name} (${user.role})`;

  if (decision === "declined") {
    await db.update(bookingRequests).set({ status: "declined" }).where(eq(bookingRequests.id, id));
    return NextResponse.json({ ok: true, decision });
  }

  const recordedEvents = await audit.query({
    eventType: "booking.recorded",
    subjectId: booking.id,
    limit: 1,
  });

  try {
    const result = await draftSalesInvoice({
      contactName: CHANNEL_CONTACT,
      description: `Booking · ${booking.guestName} · ${booking.nights} night(s) at property ${booking.propertyId}${booking.checkIn ? ` from ${booking.checkIn}` : ""}`,
      amountGBP: booking.totalPence / 100,
      reference: `SS-BK-${booking.id.slice(0, 8)} / ${booking.propertyId}`,
      parentEventId: recordedEvents[0]?.id ?? null,
      actor,
    });
    if (!result.ok) {
      return NextResponse.json(result, { status: 422 });
    }
    await db
      .update(bookingRequests)
      .set({ status: "confirmed", invoiceId: result.invoiceId })
      .where(eq(bookingRequests.id, id));
    return NextResponse.json({ ok: true, decision, invoiceId: result.invoiceId });
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
