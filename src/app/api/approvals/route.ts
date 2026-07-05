import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { approvals } from "@/lib/schema";

// The accountant's queue. ?status=pending|approved|denied filters.

export async function GET(request: Request) {
  const status = new URL(request.url).searchParams.get("status");
  const rows = await db
    .select()
    .from(approvals)
    .where(status ? eq(approvals.status, status) : undefined)
    .orderBy(desc(approvals.createdAt));
  return NextResponse.json({ approvals: rows });
}
