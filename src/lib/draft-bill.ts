import "server-only";
import { eq } from "drizzle-orm";
import { audit } from "@/lib/audit";
import type { CodedReceipt } from "@/lib/coded-receipt";
import { db } from "@/lib/db";
import { properties } from "@/lib/schema";
import { getAccounts, getContacts, getInvoiceById, xeroFetch } from "@/lib/xero";

// The ONE Xero write path. Every draft bill — from the capture flow or the
// legacy add-records form — goes through draftCodedBill so validation, the
// read-back DRAFT assertion, and the audit chain can't be skipped. The
// never-moves-money guard in xeroFetch enforces ACCPAY+DRAFT again below
// this layer; this module's job is correctness, not the boundary.

export interface DraftBillResult {
  readonly ok: boolean;
  readonly invoiceId?: string;
  readonly needsContact?: boolean;
  readonly warning?: string;
  readonly error?: string;
  readonly auditEventId?: string;
}

async function resolveContactId(supplier: string): Promise<string | undefined> {
  const contacts = await getContacts();
  return contacts.find((c) => c.Name.toLowerCase() === supplier.toLowerCase())
    ?.ContactID;
}

function plusDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface SalesInvoiceResult {
  readonly ok: boolean;
  readonly invoiceId?: string;
  readonly needsContact?: boolean;
  readonly error?: string;
  readonly auditEventId?: string;
}

// The booking flow's write: an ACCREC sales invoice at Status SUBMITTED —
// Xero's designed "pending approval" state (no journals, not payable).
// A human authorises and takes payment in Xero; ShortStay only reads that
// back. Same discipline as bills: contact must exist, read-back must match.
export async function draftSalesInvoice(params: {
  contactName: string;
  description: string;
  amountGBP: number;
  reference: string;
  parentEventId: string | null;
  actor: string;
}): Promise<SalesInvoiceResult> {
  const contactId = await resolveContactId(params.contactName);
  if (!contactId) {
    return {
      ok: false,
      needsContact: true,
      error: `No Xero contact matches "${params.contactName}" — create the contact in Xero first; ShortStay never creates contacts`,
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  const body = JSON.stringify({
    Type: "ACCREC",
    Status: "SUBMITTED",
    Contact: { ContactID: contactId },
    Date: today,
    DueDate: plusDays(today, 14),
    LineAmountTypes: "Inclusive",
    Reference: params.reference,
    LineItems: [
      {
        Description: params.description.slice(0, 250),
        Quantity: 1.0,
        UnitAmount: params.amountGBP,
        AccountCode: "200",
      },
    ],
  });

  const data = await xeroFetch<{ Invoices: { InvoiceID: string; Status?: string }[] }>(
    "Invoices",
    { method: "POST", body }
  );
  const invoice = data.Invoices?.[0];
  if (!invoice?.InvoiceID) {
    return { ok: false, error: "Xero returned no invoice from the create POST" };
  }

  const readBack = await getInvoiceById(invoice.InvoiceID);
  if (readBack.Status !== "SUBMITTED" && readBack.Status !== "DRAFT") {
    const escalation = await audit.append({
      eventType: "guard.evaluated",
      actor: "guardrails",
      subjectType: "xero.invoice",
      subjectId: invoice.InvoiceID,
      parentEventId: params.parentEventId,
      payload: {
        decision: "escalate",
        reason: `sales invoice read-back status is ${readBack.Status ?? "unknown"}, expected SUBMITTED`,
      },
    });
    return {
      ok: false,
      invoiceId: invoice.InvoiceID,
      error: `Xero read-back returned ${readBack.Status ?? "unknown"} instead of SUBMITTED — escalated`,
      auditEventId: escalation.id,
    };
  }

  const raised = await audit.append({
    eventType: "invoice.raised",
    actor: params.actor,
    subjectType: "xero.invoice",
    subjectId: invoice.InvoiceID,
    parentEventId: params.parentEventId,
    payload: {
      type: "ACCREC",
      contact: params.contactName,
      amountGBP: params.amountGBP,
      reference: params.reference,
      xeroStatus: readBack.Status,
    },
  });

  return { ok: true, invoiceId: invoice.InvoiceID, auditEventId: raised.id };
}

export async function draftCodedBill(params: {
  coded: CodedReceipt;
  receiptId: string;
  parentEventId: string | null;
  actor: string;
}): Promise<DraftBillResult> {
  const { coded, receiptId, parentEventId, actor } = params;

  // Validate the account code against the live chart before writing.
  const accounts = await getAccounts();
  const account = accounts.find((a) => a.Code === coded.accountCode);
  if (!account) {
    return {
      ok: false,
      error: `AccountCode ${coded.accountCode} does not exist in the org's chart of accounts`,
    };
  }

  // Resolve the supplier to a ContactID. Never auto-create contacts —
  // contact creation is outside the minimal write surface.
  const contactId = await resolveContactId(coded.supplier);
  if (!contactId) {
    return {
      ok: false,
      needsContact: true,
      error: `No Xero contact matches "${coded.supplier}" — create the contact in Xero first; ShortStay never creates contacts`,
    };
  }

  let warning: string | undefined;
  let tracking: { TrackingCategoryID?: string; TrackingOptionID?: string } | null = null;
  const [property] = coded.propertyId
    ? await db
        .select()
        .from(properties)
        .where(eq(properties.id, coded.propertyId))
        .limit(1)
    : [];
  if (property?.trackingOptionId) {
    tracking = { TrackingOptionID: property.trackingOptionId };
  } else {
    warning =
      "No Property tracking option linked — attribution falls back to the Reference field and the local properties table";
  }

  const reference = `SS-${receiptId} / ${coded.propertyId || "unassigned"}`;
  const body = JSON.stringify({
    Type: "ACCPAY",
    Status: "DRAFT",
    Contact: { ContactID: contactId },
    Date: coded.date,
    DueDate: plusDays(coded.date, 30),
    LineAmountTypes: "Inclusive",
    Reference: reference,
    LineItems: [
      {
        Description: `${coded.supplier} — ${property?.name ?? coded.propertyId ?? "unassigned property"}`.slice(0, 250),
        Quantity: 1.0,
        UnitAmount: coded.grossInclVat,
        AccountCode: coded.accountCode,
        ...(tracking ? { Tracking: [tracking] } : {}),
      },
    ],
  });

  const data = await xeroFetch<{ Invoices: { InvoiceID: string; Status?: string }[] }>(
    "Invoices",
    { method: "POST", body }
  );
  const invoice = data.Invoices?.[0];
  if (!invoice?.InvoiceID) {
    return { ok: false, error: "Xero returned no invoice from the draft POST" };
  }

  // Read the bill back and assert DRAFT. Anything else is a boundary
  // escalation — recorded, surfaced, never silent.
  const readBack = await getInvoiceById(invoice.InvoiceID);
  if (readBack.Status !== "DRAFT") {
    const escalation = await audit.append({
      eventType: "guard.evaluated",
      actor: "guardrails",
      subjectType: "xero.invoice",
      subjectId: invoice.InvoiceID,
      parentEventId,
      payload: {
        decision: "escalate",
        reason: `read-back status is ${readBack.Status ?? "unknown"}, expected DRAFT`,
      },
    });
    return {
      ok: false,
      invoiceId: invoice.InvoiceID,
      error: `Xero read-back returned status ${readBack.Status ?? "unknown"} instead of DRAFT — escalated`,
      auditEventId: escalation.id,
    };
  }

  const drafted = await audit.append({
    eventType: "bill.drafted",
    actor,
    subjectType: "xero.invoice",
    subjectId: invoice.InvoiceID,
    parentEventId,
    payload: {
      supplier: coded.supplier,
      grossInclVat: coded.grossInclVat,
      accountCode: coded.accountCode,
      propertyId: coded.propertyId,
      reference,
      xeroStatus: readBack.Status,
      ...(warning ? { warning } : {}),
    },
  });

  return {
    ok: true,
    invoiceId: invoice.InvoiceID,
    ...(warning ? { warning } : {}),
    auditEventId: drafted.id,
  };
}
