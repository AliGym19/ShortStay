// Display-only decode — no signature verification. The token arrived over TLS
// directly from Xero's token endpoint; we decode purely to show granted claims.
export function decodeJwtPayload(token: string): Record<string, unknown> {
  const segments = token.split(".");
  if (segments.length !== 3) {
    throw new Error("Not a JWT: expected three dot-separated segments");
  }
  const json = Buffer.from(segments[1], "base64url").toString("utf8");
  return JSON.parse(json);
}
