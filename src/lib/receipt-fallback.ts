import "server-only";
import type { CodedReceipt, ReceiptAccountCode } from "@/lib/coded-receipt";

// Deterministic offline receipt coder — the fallback when the LLM is
// unreachable or returns an unparseable shape, and the demo's insurance
// policy (acceptance test 2: coding must succeed with the network cable
// pulled). Keyword → account, largest £ amount, property-name match,
// month-name date parse. Confidence is fixed below the LLM's typical range
// so the UI can badge the source honestly.

export interface PropertyMatcher {
  readonly id: string;
  readonly name: string;
  readonly area?: string | null;
}

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

export function codeReceiptFallback(
  receiptText: string,
  properties: readonly PropertyMatcher[]
): CodedReceipt {
  const t = receiptText.toLowerCase();

  const supplier = (receiptText.trim().split("\n")[0] || "Supplier")
    .replace(/\s+/g, " ")
    .trim();

  const amounts = (receiptText.match(/£\s?([\d,]+(?:\.\d{2})?)/g) || []).map(
    (x) => parseFloat(x.replace(/[£,\s]/g, ""))
  );
  const grossInclVat = amounts.length ? Math.max(...amounts) : 0;

  let accountCode: ReceiptAccountCode = "429";
  if (/(clean|changeover|turnaround|linen)/.test(t)) accountCode = "408";
  else if (/(plumb|repair|leak|boiler|locksmith|callout|maintenance)/.test(t))
    accountCode = "473";
  else if (/(power|heating|energy|gas bill|electricity)/.test(t))
    accountCode = "445";

  let propertyId = "";
  for (const p of properties) {
    const needles = [p.name, p.area ?? ""]
      .filter(Boolean)
      .map((s) => s.toLowerCase());
    if (needles.some((n) => n && t.includes(n))) {
      propertyId = p.id;
      break;
    }
  }

  const dm = receiptText.match(
    /(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s*(\d{4})/i
  );
  const iso = receiptText.match(/(\d{4})-(\d{2})-(\d{2})/);
  const date = iso
    ? iso[0]
    : dm
      ? `${dm[3]}-${MONTHS[dm[2].toLowerCase()]}-${dm[1].padStart(2, "0")}`
      : new Date().toISOString().slice(0, 10);

  return {
    supplier,
    date,
    grossInclVat,
    vatRate: 0.2,
    accountCode,
    propertyId,
    confidence: propertyId ? 0.72 : 0.4,
    note: "matched offline (deterministic fallback)",
  };
}
