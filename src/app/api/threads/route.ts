import { NextResponse } from "next/server";
import { desc, eq, isNull, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { messages, threads } from "@/lib/schema";

// Thread list for the messenger dock: unread counts + last-message preview.

export async function GET() {
  const rows = await db.select().from(threads).orderBy(desc(threads.lastMessageAt));

  const result = await Promise.all(
    rows.map(async (t) => {
      const [last] = await db
        .select()
        .from(messages)
        .where(eq(messages.threadId, t.id))
        .orderBy(desc(messages.createdAt))
        .limit(1);
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(and(eq(messages.threadId, t.id), eq(messages.direction, "in"), isNull(messages.readAt)));
      return {
        id: t.id,
        subject: t.subject,
        contactName: t.contactName,
        contactKind: t.contactKind,
        lastMessage: last?.body ?? "",
        lastMessageAt: t.lastMessageAt.getTime(),
        unread: Number(count),
      };
    })
  );

  return NextResponse.json({ threads: result });
}
