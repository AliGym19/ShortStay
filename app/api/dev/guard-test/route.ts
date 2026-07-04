import { NextResponse } from "next/server";
import { ReadOnlyViolation, xeroFetch } from "@/lib/xero";

// Proves the read-only guard: attempts a synthetic POST through the single
// egress point and reports whether it was blocked. Works while disconnected.
export async function GET() {
  try {
    await xeroFetch("Invoices", { method: "POST" });
    return NextResponse.json(
      { threw: false, message: "GUARD FAILED: synthetic POST was not blocked" },
      { status: 500 }
    );
  } catch (err) {
    return NextResponse.json({
      threw: true,
      guard: err instanceof ReadOnlyViolation,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
