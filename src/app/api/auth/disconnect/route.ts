import { NextResponse } from "next/server";
import { clearSession } from "@/lib/session";
import { tokenStore } from "@/lib/tokenStore";

export async function POST(request: Request) {
  tokenStore.clear();
  await clearSession();
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
