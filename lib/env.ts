export function xeroCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing XERO_CLIENT_ID / XERO_CLIENT_SECRET. Copy .env.example to .env and fill in the credentials from developer.xero.com/myapps (Web app type)."
    );
  }
  return { clientId, clientSecret };
}
