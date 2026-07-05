import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookings, messages, properties, prompts, threads } from "@/lib/schema";
import { promptRegistry } from "@/lib/prompt-registry";

// Dev-only idempotent seed: the receipt-coder prompt, the property registry,
// and booking-level detail (Booking.com has no API — bookings are seed data
// by design, spec §7). Re-running skips anything already present.
//
// landlordContactId starts as a local placeholder; swap in real Demo Company
// ContactIDs (via /api/xero/contacts once connected) before statement
// assembly needs to resolve real Xero contacts.

const RECEIPT_CODER_BODY = `You are ShortStay's receipt coder for a short-let agency's Xero back office.
Given the raw text of a supplier receipt, extract fields for a DRAFT purchase bill.
Return ONLY minified JSON, no prose, no markdown fences. Shape:
{"supplier":string,"date":"YYYY-MM-DD","grossInclVat":number,"vatRate":0.2,"accountCode":"408"|"473"|"445"|"429","propertyId":string,"confidence":0..1,"note":string}
Account codes: 408 Cleaning · 473 Repairs & Maintenance · 445 Light/Power/Heating · 429 General Expenses.
Properties: {{PROPERTY_LIST}}
grossInclVat is the VAT-inclusive GBP total. Never invent a payment or transfer.
If the property cannot be identified, use propertyId "" and confidence ≤ 0.4.`;

const PROPERTY_ROWS = [
  { id: "P1", name: "Dockside Loft", area: "Wapping", landlordContactId: "local:L1", landlordName: "Amara Okafor", trackingOptionId: null, commissionRate: "0.15", agencyFeeRate: "0.12" },
  { id: "P2", name: "Gasholder Studio", area: "King's Cross", landlordContactId: "local:L1", landlordName: "Amara Okafor", trackingOptionId: null, commissionRate: "0.15", agencyFeeRate: "0.12" },
  { id: "P3", name: "Tin Quarter Mews", area: "Digbeth", landlordContactId: "local:L2", landlordName: "The Whitfield Trust", trackingOptionId: null, commissionRate: "0.15", agencyFeeRate: "0.12" },
];

const BOOKING_ROWS = [
  { id: "bk-201", propertyId: "P1", guest: "M. Ellery", nights: 3, grossPence: 98000, checkIn: "2026-06-02" },
  { id: "bk-207", propertyId: "P1", guest: "R. Nkemdirim", nights: 4, grossPence: 124000, checkIn: "2026-06-08" },
  { id: "bk-214", propertyId: "P1", guest: "S. Prakash", nights: 2, grossPence: 76000, checkIn: "2026-06-15" },
  { id: "bk-219", propertyId: "P1", guest: "J. Alvarsson", nights: 2, grossPence: 62000, checkIn: "2026-06-21" },
  { id: "bk-226", propertyId: "P1", guest: "K. Duval", nights: 4, grossPence: 122000, checkIn: "2026-06-26" },
  { id: "bk-231", propertyId: "P2", guest: "T. Oyelaran", nights: 2, grossPence: 64000, checkIn: "2026-06-05" },
  { id: "bk-238", propertyId: "P2", guest: "L. Behrens", nights: 3, grossPence: 88000, checkIn: "2026-06-11" },
  { id: "bk-244", propertyId: "P2", guest: "H. Costa", nights: 2, grossPence: 72000, checkIn: "2026-06-18" },
  { id: "bk-250", propertyId: "P2", guest: "F. Marchetti", nights: 3, grossPence: 91000, checkIn: "2026-06-24" },
  { id: "bk-261", propertyId: "P3", guest: "D. Whitcombe", nights: 2, grossPence: 56000, checkIn: "2026-06-07" },
  { id: "bk-268", propertyId: "P3", guest: "A. Serrano", nights: 3, grossPence: 74000, checkIn: "2026-06-14" },
  { id: "bk-274", propertyId: "P3", guest: "V. Ilić", nights: 2, grossPence: 70000, checkIn: "2026-06-20" },
  { id: "bk-280", propertyId: "P3", guest: "N. Palmer", nights: 2, grossPence: 48000, checkIn: "2026-06-25" },
];

export async function POST() {
  const done: string[] = [];
  const skipped: string[] = [];

  const existingPrompt = await db
    .select({ id: prompts.id })
    .from(prompts)
    .where(eq(prompts.name, "receipt-coder"))
    .limit(1);
  if (existingPrompt.length === 0) {
    await promptRegistry.create({
      name: "receipt-coder",
      body: RECEIPT_CODER_BODY,
      modelTarget: "tier:everyday",
      status: "active",
    });
    done.push("prompt:receipt-coder@v1");
  } else {
    skipped.push("prompt:receipt-coder");
  }

  for (const p of PROPERTY_ROWS) {
    const existing = await db
      .select({ id: properties.id })
      .from(properties)
      .where(eq(properties.id, p.id))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(properties).values(p);
      done.push(`property:${p.id}`);
    } else {
      skipped.push(`property:${p.id}`);
    }
  }

  for (const b of BOOKING_ROWS) {
    const existing = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(eq(bookings.id, b.id))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(bookings).values(b);
      done.push(`booking:${b.id}`);
    } else {
      skipped.push(`booking:${b.id}`);
    }
  }

  // Messenger threads — inbound messages left unread so the launcher pip
  // shows on first load. Skip wholesale if any thread exists.
  const existingThreads = await db.select({ id: threads.id }).from(threads).limit(1);
  if (existingThreads.length === 0) {
    const now = Date.now();
    const seedThreads = [
      {
        contactName: "Amara Okafor",
        contactKind: "landlord",
        subject: "June payout timing",
        msgs: [
          { body: "Hi — quick one, when does the June statement land? I've got a mortgage payment on the 8th.", offsetMin: -180 },
          { body: "Also is the Dockside plumbing invoice in there?", offsetMin: -175 },
        ],
      },
      {
        contactName: "Priya Raman",
        contactKind: "lead",
        subject: "Gasholder Studio — late August?",
        msgs: [{ body: "Hello! Is Gasholder Studio free 21–25 August for 2 guests? And is there a desk — I'll be working.", offsetMin: -60 * 26 }],
      },
      {
        contactName: "Tom Whitfield",
        contactKind: "teammate",
        subject: "Bill amount check",
        msgs: [{ body: "Before you approve — that plumber bill looks doubled vs the receipt. Can you check the capture?", offsetMin: -60 * 40 }],
      },
    ];
    for (const t of seedThreads) {
      const lastOffset = t.msgs[t.msgs.length - 1].offsetMin;
      const [thread] = await db
        .insert(threads)
        .values({
          contactName: t.contactName,
          contactKind: t.contactKind,
          subject: t.subject,
          lastMessageAt: new Date(now + lastOffset * 60_000),
        })
        .returning();
      for (const m of t.msgs) {
        await db.insert(messages).values({
          threadId: thread.id,
          direction: "in",
          sender: t.contactName,
          body: m.body,
          createdAt: new Date(now + m.offsetMin * 60_000),
        });
      }
      done.push(`thread:${t.contactName}`);
    }
  } else {
    skipped.push("threads");
  }

  return NextResponse.json({ seeded: done, skipped });
}
