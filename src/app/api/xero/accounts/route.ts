import { NextResponse } from "next/server";
import { getAccounts, NotConnectedError } from "@/lib/xero";

// Live chart of accounts (read-only, cached 5 min in lib/xero.ts). ?code=
// returns the single account the draft-bill path would validate against.

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  try {
    const accounts = await getAccounts();
    if (code) {
      const match = accounts.find((a) => a.Code === code);
      return NextResponse.json({
        connected: true,
        match: match ? { code: match.Code, name: match.Name, type: match.Type } : null,
      });
    }
    return NextResponse.json({
      connected: true,
      accounts: accounts
        .filter((a) => a.Code)
        .map((a) => ({ code: a.Code, name: a.Name, type: a.Type })),
    });
  } catch (err) {
    if (err instanceof NotConnectedError) {
      return NextResponse.json({ connected: false }, { status: 409 });
    }
    throw err;
  }
}
