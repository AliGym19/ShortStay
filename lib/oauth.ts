import { xeroCredentials } from "./env";
import { decodeJwtPayload } from "./jwt";
import {
  getRefreshLock,
  setRefreshLock,
  tokenStore,
  type XeroSession,
} from "./tokenStore";

export const AUTHORIZE_URL = "https://login.xero.com/identity/connect/authorize";
export const TOKEN_URL = "https://identity.xero.com/connect/token";
export const CONNECTIONS_URL = "https://api.xero.com/connections";
export const REDIRECT_URI = "http://localhost:3000/api/auth/callback";

// Granular read-only scope set. ShortStay requests NO write scope of any kind.
export const REQUESTED_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "accounting.settings.read",
  "accounting.contacts.read",
  "accounting.invoices.read",
  "accounting.banktransactions.read",
  // Reports scopes are granular per-report for this app — there is no
  // blanket accounting.reports.read (requesting it → invalid_scope).
  // P&L is the one report forecasting v1 needs.
  "accounting.reports.profitandloss.read",
];

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  id_token?: string;
  token_type: string;
}

interface XeroConnection {
  tenantId: string;
  tenantName: string;
  tenantType: string;
}

export class TokenEndpointError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

export function buildAuthorizeUrl(state: string): string {
  const { clientId } = xeroCredentials();
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("scope", REQUESTED_SCOPES.join(" "));
  url.searchParams.set("state", state);
  return url.toString();
}

// These POSTs target identity.xero.com (the OAuth token endpoint), not the
// accounting API — they are intentionally outside the read-only guard in
// lib/xero.ts, which covers api.xro traffic only.
async function tokenRequest(body: URLSearchParams): Promise<TokenResponse> {
  const { clientId, clientSecret } = xeroCredentials();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new TokenEndpointError(
      `Xero token endpoint returned ${res.status}: ${detail.slice(0, 300)}`,
      res.status
    );
  }
  return res.json();
}

async function fetchConnections(accessToken: string): Promise<XeroConnection[]> {
  const res = await fetch(CONNECTIONS_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`GET /connections failed with ${res.status}`);
  }
  return res.json();
}

export async function exchangeCode(code: string): Promise<XeroSession> {
  const tokens = await tokenRequest(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
    })
  );
  const connections = await fetchConnections(tokens.access_token);
  if (connections.length === 0) {
    throw new Error("No Xero organisation was authorised on the consent screen.");
  }
  const tenant =
    connections.find((c) => /demo company/i.test(c.tenantName)) ?? connections[0];
  const session: XeroSession = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
    tenantId: tenant.tenantId,
    tenantName: tenant.tenantName,
    idClaims: tokens.id_token ? decodeJwtPayload(tokens.id_token) : undefined,
  };
  tokenStore.set(session);
  return session;
}

// Xero refresh tokens rotate and are single-use: two concurrent refreshes burn
// the token and force a full re-auth. Single-flight lock — all concurrent
// callers await the same in-flight promise.
export async function refreshSession(): Promise<XeroSession> {
  const inFlight = getRefreshLock();
  if (inFlight) return inFlight;

  const session = tokenStore.get();
  if (!session) throw new Error("Not connected to Xero.");

  const flight = (async () => {
    try {
      const tokens = await tokenRequest(
        new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: session.refreshToken,
        })
      );
      const next: XeroSession = {
        ...session,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: Date.now() + tokens.expires_in * 1000,
      };
      tokenStore.set(next);
      return next;
    } catch (err) {
      // invalid_grant means the refresh token is dead — force reconnect.
      // Transient errors (network, 5xx) keep the session for a later retry.
      if (err instanceof TokenEndpointError && err.status < 500) {
        tokenStore.clear();
      }
      throw err;
    } finally {
      setRefreshLock(null);
    }
  })();

  setRefreshLock(flight);
  return flight;
}
