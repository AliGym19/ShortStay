import { NextResponse } from "next/server";
import { decodeJwtPayload } from "@/lib/jwt";
import { REQUESTED_SCOPES } from "@/lib/oauth";
import { tokenStore } from "@/lib/tokenStore";

// Connection truth for the UI. Granted scopes are decoded from the access
// token itself — proof of what the consent screen actually granted, not
// what we asked for. Identity scopes never appear in the access token's
// scope claim, so the requested-vs-granted diff covers accounting.* only
// (same rule as the old dashboard panel).

export async function GET() {
  const session = tokenStore.get();
  if (!session) {
    return NextResponse.json({
      connected: false,
      requestedScopes: REQUESTED_SCOPES,
    });
  }

  let grantedScopes: string[] = [];
  try {
    const payload = decodeJwtPayload(session.accessToken);
    grantedScopes = Array.isArray(payload.scope)
      ? (payload.scope as string[])
      : typeof payload.scope === "string"
        ? payload.scope.split(" ")
        : [];
  } catch {
    grantedScopes = [];
  }
  const missingScopes = REQUESTED_SCOPES.filter(
    (s) => s.startsWith("accounting.") && !grantedScopes.includes(s)
  );

  return NextResponse.json({
    connected: true,
    tenantName: session.tenantName,
    tenantId: session.tenantId,
    expiresAt: session.expiresAt,
    grantedScopes,
    requestedScopes: REQUESTED_SCOPES,
    missingScopes,
  });
}
