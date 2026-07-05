import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { bookingRequests } from "@/lib/schema";
import { getInvoiceById, NotConnectedError } from "@/lib/xero";

// Public booking intake (no auth — the /book site is guest-facing) + queue
// read for the ops view. booking.recorded is already in the audit vocabulary.

// pending (DRAFT/SUBMITTED) → authorised → paid. Read live from Xero — a
// human authorising/paying there flips the chip here; ShortStay never
// causes those transitions.
function invoiceState(status?: string, amountDue?: number, amountPaid?: number): string {
  if (status === "PAID" || (typeof amountPaid === "number" && amountPaid > 0 && amountDue === 0)) return "paid";
  if (status === "AUTHORISED") return "authorised";
  if (status === "VOIDED" || status === "DELETED") return "voided";
  return "pending";
}

export async function GET() {
  const rows = await db
    .select()
    .from(bookingRequests)
    .orderBy(desc(bookingRequests.createdAt));

  const enriched = await Promise.all(
    rows.map(async (b) => {
      if (!b.invoiceId) return { ...b, invoiceState: null as string | null };
      try {
        const inv = await getInvoiceById(b.invoiceId);
        return {
          ...b,
          invoiceState: invoiceState(
            inv.Status,
            (inv as { AmountDue?: number }).AmountDue,
            inv.AmountPaid
          ),
        };
      } catch (err) {
        if (err instanceof NotConnectedError) return { ...b, invoiceState: null };
        return { ...b, invoiceState: null };
      }
    })
  );
  return NextResponse.json({ bookings: enriched });
}

export async function POST(request: Request) {
  let body: {
    propertyId?: unknown;
    guestName?: unknown;
    guestEmail?: unknown;
    checkIn?: unknown;
    nights?: unknown;
    totalPence?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "body must be JSON" }, { status: 400 });
  }
  if (typeof body.propertyId !== "string" || !body.propertyId) {
    return NextResponse.json({ error: "propertyId required" }, { status: 400 });
  }
  if (typeof body.guestName !== "string" || !body.guestName.trim()) {
    return NextResponse.json({ error: "guestName required" }, { status: 400 });
  }
  const nights = Number(body.nights);
  const totalPence = Math.round(Number(body.totalPence));
  if (!(nights >= 1) || !(totalPence > 0)) {
    return NextResponse.json({ error: "nights and totalPence must be positive" }, { status: 400 });
  }

  const [row] = await db
    .insert(bookingRequests)
    .values({
      propertyId: body.propertyId,
      guestName: body.guestName.trim(),
      guestEmail: typeof body.guestEmail === "string" ? body.guestEmail : null,
      checkIn: typeof body.checkIn === "string" ? body.checkIn : null,
      nights,
      totalPence,
    })
    .returning();

  await audit.append({
    eventType: "booking.recorded",
    actor: "guest:booking-site",
    subjectType: "booking.request",
    subjectId: row.id,
    parentEventId: null,
    payload: { propertyId: row.propertyId, guestName: row.guestName, nights, totalPence },
  });

  return NextResponse.json({ booking: row });
}
