import { NextResponse } from "next/server";
import { refreshSession } from "@/lib/oauth";

export async function POST(request: Request) {
  try {
    await refreshSession();
    return NextResponse.redirect(new URL("/", request.url), 303);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Refresh failed";
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(message)}`, request.url),
      303
    );
  }
}
