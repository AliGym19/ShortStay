import { NextResponse } from "next/server";
import { buildAuthorizeUrl } from "@/lib/oauth";

export async function GET(request: Request) {
  const state = crypto.randomUUID();
  try {
    const res = NextResponse.redirect(buildAuthorizeUrl(state));
    // sameSite must be "lax", not "strict": the callback arrives as a
    // top-level cross-site redirect from login.xero.com, and strict would
    // drop the cookie — the state check would then always fail.
    res.cookies.set("xero_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start Xero sign-in";
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(message)}`, request.url)
    );
  }
}
