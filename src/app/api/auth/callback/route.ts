import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/oauth";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const home = (query = "") =>
    clearStateCookie(NextResponse.redirect(new URL(`/${query}`, request.url)));

  // Xero reports authorize-time failures (e.g. invalid_scope, user cancel)
  // via error params — render them readably instead of 500ing.
  const oauthError = params.get("error");
  if (oauthError) {
    const detail = params.get("error_description") ?? oauthError;
    return home(`?error=${encodeURIComponent(detail)}`);
  }

  const code = params.get("code");
  const state = params.get("state");
  const expectedState = request.cookies.get("xero_oauth_state")?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    return home("?error=state_mismatch");
  }

  try {
    await exchangeCode(code);
    return home();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Token exchange failed";
    return home(`?error=${encodeURIComponent(message)}`);
  }
}

function clearStateCookie(res: NextResponse): NextResponse {
  res.cookies.delete("xero_oauth_state");
  return res;
}
