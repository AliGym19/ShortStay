// The contract between receipt coding (LLM or fallback) and bill drafting.
// Validation is hand-rolled — the shape is small and the project avoids
// pulling in a schema library for one type (AGENTS.md: no unnecessary deps).

export const RECEIPT_ACCOUNT_CODES = ["408", "473", "445", "429"] as const;
export type ReceiptAccountCode = (typeof RECEIPT_ACCOUNT_CODES)[number];

export interface CodedReceipt {
  readonly supplier: string;
  readonly date: string; // YYYY-MM-DD
  readonly grossInclVat: number; // VAT-inclusive GBP
  readonly vatRate: number; // 0..0.25
  readonly accountCode: ReceiptAccountCode;
  readonly propertyId: string; // "" when unidentified (confidence ≤ 0.4)
  readonly confidence: number; // 0..1
  readonly note?: string;
}

export class CodedReceiptParseError extends Error {}

export function parseCodedReceipt(raw: unknown): CodedReceipt {
  if (typeof raw !== "object" || raw === null) {
    throw new CodedReceiptParseError("coded receipt must be an object");
  }
  const r = raw as Record<string, unknown>;

  const fail = (why: string): never => {
    throw new CodedReceiptParseError(`coded receipt invalid: ${why}`);
  };

  if (typeof r.supplier !== "string" || r.supplier.length < 1) {
    fail("supplier must be a non-empty string");
  }
  if (typeof r.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) {
    fail("date must be YYYY-MM-DD");
  }
  if (typeof r.grossInclVat !== "number" || !(r.grossInclVat > 0)) {
    fail("grossInclVat must be a positive number");
  }
  const vatRate = typeof r.vatRate === "number" ? r.vatRate : 0.2;
  if (vatRate < 0 || vatRate > 0.25) fail("vatRate must be between 0 and 0.25");
  if (
    typeof r.accountCode !== "string" ||
    !(RECEIPT_ACCOUNT_CODES as readonly string[]).includes(r.accountCode)
  ) {
    fail(`accountCode must be one of ${RECEIPT_ACCOUNT_CODES.join(", ")}`);
  }
  if (typeof r.propertyId !== "string") fail("propertyId must be a string");
  if (typeof r.confidence !== "number" || r.confidence < 0 || r.confidence > 1) {
    fail("confidence must be 0..1");
  }

  return {
    supplier: r.supplier as string,
    date: r.date as string,
    grossInclVat: r.grossInclVat as number,
    vatRate,
    accountCode: r.accountCode as ReceiptAccountCode,
    propertyId: r.propertyId as string,
    confidence: r.confidence as number,
    ...(typeof r.note === "string" ? { note: r.note } : {}),
  };
}
