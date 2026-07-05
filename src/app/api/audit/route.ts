import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";

// Read the append-only log. ?eventType= filters; ?chain=<eventId> walks the
// causality chain root-first instead.

export async function GET(request: Request) {
  const url = new URL(request.url);
  const chainId = url.searchParams.get("chain");

  if (chainId) {
    const events = await audit.chain(chainId);
    return NextResponse.json({ events });
  }

  const eventType = url.searchParams.get("eventType") ?? undefined;
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw ? Math.min(Number(limitRaw) || 200, 500) : 200;
  const events = await audit.query({ eventType, limit });
  return NextResponse.json({ events });
}
