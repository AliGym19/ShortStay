import { NextResponse } from "next/server";
import { asc, and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { messages, threads } from "@/lib/schema";

// GET ?threadId= — thread history ascending. Side effect: marks that
// thread's inbound messages read (saves a third route; opening a thread IS
// reading it). POST — send: appends locally, no external delivery.

export async function GET(request: Request) {
  const threadId = new URL(request.url).searchParams.get("threadId");
  if (!threadId) return NextResponse.json({ error: "threadId required" }, { status: 400 });

  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.threadId, threadId))
    .orderBy(asc(messages.createdAt));

  await db
    .update(messages)
    .set({ readAt: new Date() })
    .where(and(eq(messages.threadId, threadId), eq(messages.direction, "in"), isNull(messages.readAt)));

  return NextResponse.json({
    messages: rows.map((m) => ({
      id: m.id,
      threadId: m.threadId,
      direction: m.direction,
      sender: m.sender,
      body: m.body,
      createdAt: m.createdAt.getTime(),
    })),
  });
}

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "sign in first" }, { status: 401 });

  let body: { threadId?: unknown; to?: unknown; subject?: unknown; body?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "body must be JSON" }, { status: 400 });
  }
  if (typeof body.body !== "string" || !body.body.trim()) {
    return NextResponse.json({ error: "message body required" }, { status: 400 });
  }

  let threadId: string;
  if (typeof body.threadId === "string" && body.threadId) {
    threadId = body.threadId;
  } else if (typeof body.to === "string" && body.to.trim()) {
    const to = body.to.trim();
    const [existing] = await db.select().from(threads).where(eq(threads.contactName, to)).limit(1);
    if (existing) {
      threadId = existing.id;
    } else {
      const [created] = await db
        .insert(threads)
        .values({
          contactName: to,
          contactKind: "contact",
          subject: typeof body.subject === "string" ? body.subject : null,
          lastMessageAt: new Date(),
        })
        .returning();
      threadId = created.id;
    }
  } else {
    return NextResponse.json({ error: "threadId or to required" }, { status: 400 });
  }

  const [message] = await db
    .insert(messages)
    .values({
      threadId,
      direction: "out",
      sender: user.name,
      body: body.body.trim(),
      readAt: new Date(),
    })
    .returning();
  await db.update(threads).set({ lastMessageAt: new Date() }).where(eq(threads.id, threadId));

  return NextResponse.json({ threadId, messageId: message.id });
}
