import { NextResponse } from "next/server";
import { CodedReceiptParseError, parseCodedReceipt } from "@/lib/coded-receipt";
import { draftCodedBill } from "@/lib/draft-bill";
import { NotConnectedError } from "@/lib/xero";

// The ONE Xero write, as a route: coded receipt in, DRAFT ACCPAY bill out.
// All validation, the read-back assertion, and the audit chain live in
// lib/draft-bill.ts (shared with the add-records flow).

export async function POST(request: Request) {
  let coded, receiptId: string, codedEventId: string | null;
  try {
    const json = (await request.json()) as {
      coded?: unknown;
      receiptId?: unknown;
      codedEventId?: unknown;
    };
    coded = parseCodedReceipt(json.coded);
    receiptId = typeof json.receiptId === "string" ? json.receiptId : crypto.randomUUID().slice(0, 8);
    codedEventId = typeof json.codedEventId === "string" ? json.codedEventId : null;
  } catch (err) {
    const message =
      err instanceof CodedReceiptParseError ? err.message : "body must be JSON with a valid coded receipt";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const result = await draftCodedBill({
      coded,
      receiptId,
      parentEventId: codedEventId,
      actor: "agent:receipt-coder",
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  } catch (err) {
    if (err instanceof NotConnectedError) {
      return NextResponse.json(
        { ok: false, error: "Not connected to Xero — sign in first" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
