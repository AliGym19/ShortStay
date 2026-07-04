import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/oauth";
import { setSession, type SessionUser } from "@/lib/session";
import type { XeroSession } from "@/lib/tokenStore";

// Connecting Xero IS the ShortStay login — there is no separate app-native
// signup. This builds the SessionUser cookie session/lib/session.ts expects
// from the identity claims Xero's id_token already gave us.
function sessionUserFromXero(session: XeroSession): SessionUser {
  const claims = session.idClaims ?? {};
  const name =
    (claims.name as string | undefined) ??
    (claims.given_name as string | undefined) ??
    session.tenantName;
  const email = (claims.email as string | undefined) ?? "";
  return {
    id: (claims.sub as string | undefined) ?? session.tenantId,
    name,
    email,
    agency: session.tenantName,
    role: "Operations",
    xero: {
      connected: true,
      tenantId: session.tenantId,
      tenantName: session.tenantName,
      expiresAt: new Date(session.expiresAt).toISOString(),
    },
  };
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const login = (query = "") =>
    clearStateCookie(NextResponse.redirect(new URL(`/login${query}`, request.url)));

  // Xero reports authorize-time failures (e.g. invalid_scope, user cancel)
  // via error params — render them readably instead of 500ing.
  const oauthError = params.get("error");
  if (oauthError) {
    const detail = params.get("error_description") ?? oauthError;
    return login(`?error=${encodeURIComponent(detail)}`);
  }

  const code = params.get("code");
  const state = params.get("state");
  const expectedState = request.cookies.get("xero_oauth_state")?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    return login("?error=state_mismatch");
  }

  try {
    const session = await exchangeCode(code);
    await setSession(sessionUserFromXero(session));
    return clearStateCookie(
      NextResponse.redirect(new URL("/dashboard", request.url))
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Token exchange failed";
    return login(`?error=${encodeURIComponent(message)}`);
  }
}

function clearStateCookie(res: NextResponse): NextResponse {
  res.cookies.delete("xero_oauth_state");
  return res;
}
