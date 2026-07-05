import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { matchPayout } from "@/lib/match";
import { bookings } from "@/lib/schema";
import { xeroFetch, NotConnectedError, type XeroBankTransaction } from "@/lib/xero";

// Reconcile a Booking.com payout against seeded bookings. Two entry modes:
// { bankTransactionId } reads the live RECEIVE transaction from Xero;
// { payoutPence, bookingIds? } takes the amount directly (demo mode, since
// the Demo Company org has no seeded channel payouts). Matching itself is
// pure arithmetic in lib/match.ts — no LLM anywhere near money.

const COMMISSION_RATE = Number(process.env.BOOKING_COMMISSION_RATE ?? "0.15");

export async function POST(request: Request) {
  let payoutPence: number;
  let source: { type: string; id: string };
  let bookingIds: string[] | null = null;

  try {
    const json = (await request.json()) as {
      bankTransactionId?: unknown;
      payoutPence?: unknown;
      bookingIds?: unknown;
    };

    if (typeof json.bankTransactionId === "string") {
      const data = await xeroFetch<{ BankTransactions: XeroBankTransaction[] }>(
        `BankTransactions/${encodeURIComponent(json.bankTransactionId)}`
      );
      const txn = data.BankTransactions?.[0];
      if (!txn) {
        return NextResponse.json({ error: "bank transaction not found" }, { status: 404 });
      }
      if (txn.Type !== "RECEIVE") {
        return NextResponse.json(
          { error: `transaction is ${txn.Type}, only RECEIVE payouts reconcile` },
          { status: 422 }
        );
      }
      payoutPence = Math.round((txn.Total ?? 0) * 100);
      source = { type: "xero.banktransaction", id: txn.BankTransactionID };
    } else if (typeof json.payoutPence === "number" && json.payoutPence > 0) {
      payoutPence = Math.round(json.payoutPence);
      source = { type: "seed.payout", id: `payout-${payoutPence}` };
      if (Array.isArray(json.bookingIds) && json.bookingIds.every((x) => typeof x === "string")) {
        bookingIds = json.bookingIds as string[];
      }
    } else {
      return NextResponse.json(
        { error: "provide bankTransactionId or payoutPence" },
        { status: 400 }
      );
    }
  } catch (err) {
    if (err instanceof NotConnectedError) {
      return NextResponse.json(
        { error: "Not connected to Xero — use payoutPence demo mode or sign in" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "body must be JSON" }, { status: 400 });
  }

  const candidates = bookingIds
    ? await db.select().from(bookings).where(inArray(bookings.id, bookingIds))
    : await db.select().from(bookings);

  const result = matchPayout(
    payoutPence,
    candidates.map((b) => ({ id: b.id, propertyId: b.propertyId, grossPence: b.grossPence })),
    COMMISSION_RATE
  );

  if (!result.matched) {
    return NextResponse.json(
      {
        matched: false,
        escalate: true,
        reason: result.reason,
        candidates: candidates.map((b) => ({
          id: b.id,
          propertyId: b.propertyId,
          grossPence: b.grossPence,
          checkIn: b.checkIn,
        })),
      },
      { status: 422 }
    );
  }

  const event = await audit.append({
    eventType: "payout.matched",
    actor: "system:reconciler",
    subjectType: "bank.receive",
    subjectId: source.id,
    parentEventId: null,
    payload: {
      payoutPence,
      source,
      bookingIds: result.bookingIds,
      perPropertySplitPence: result.perPropertySplitPence,
      rule: `payout = Σ(gross × ${1 - COMMISSION_RATE}) ±1p`,
      reason: result.reason,
    },
  });

  return NextResponse.json({
    matched: true,
    payoutPence,
    bookingIds: result.bookingIds,
    perPropertySplitPence: result.perPropertySplitPence,
    reason: result.reason,
    matchedEventId: event.id,
  });
}
