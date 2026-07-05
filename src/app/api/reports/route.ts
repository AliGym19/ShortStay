import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { reports } from "@/lib/schema";

// Field-report intake (cleaner) + queue read (ops). The report is the root
// of the pipeline's audit chain: report.submitted → bill.drafted →
// approval.decided.

const URGENCIES = new Set(["low", "normal", "urgent"]);

export async function GET() {
  const rows = await db.select().from(reports).orderBy(desc(reports.createdAt));
  return NextResponse.json({ reports: rows });
}

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "sign in first" }, { status: 401 });
  }

  let propertyId: string, description: string, urgency: string;
  try {
    const json = (await request.json()) as {
      propertyId?: unknown;
      description?: unknown;
      urgency?: unknown;
    };
    if (typeof json.propertyId !== "string" || !json.propertyId) {
      return NextResponse.json({ error: "propertyId required" }, { status: 400 });
    }
    if (typeof json.description !== "string" || !json.description.trim()) {
      return NextResponse.json({ error: "description required" }, { status: 400 });
    }
    propertyId = json.propertyId;
    description = json.description.trim();
    urgency = typeof json.urgency === "string" && URGENCIES.has(json.urgency) ? json.urgency : "normal";
  } catch {
    return NextResponse.json({ error: "body must be JSON" }, { status: 400 });
  }

  const [row] = await db
    .insert(reports)
    .values({ propertyId, description, urgency, submittedBy: user.name })
    .returning();

  const event = await audit.append({
    eventType: "report.submitted",
    actor: `user:${user.name} (${user.role})`,
    subjectType: "report",
    subjectId: row.id,
    parentEventId: null,
    payload: { propertyId, urgency, description: description.slice(0, 200) },
  });

  return NextResponse.json({ report: row, eventId: event.id });
}
