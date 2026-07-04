import { NextResponse } from "next/server";
import { tokenStore } from "@/lib/tokenStore";

export async function POST(request: Request) {
  tokenStore.clear();
  return NextResponse.redirect(new URL("/", request.url), 303);
}
