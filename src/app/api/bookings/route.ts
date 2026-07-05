import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { bookingRequests } from "@/lib/schema";

// Public booking intake (no auth — the /book site is guest-facing) + queue
// read for the ops view. booking.recorded is already in the audit vocabulary.

export async function GET() {
  const rows = await db
    .select()
    .from(bookingRequests)
    .orderBy(desc(bookingRequests.createdAt));
  return NextResponse.json({ bookings: rows });
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
