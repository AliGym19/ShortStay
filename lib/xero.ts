import { refreshSession } from "./oauth";
import { tokenStore, type XeroSession } from "./tokenStore";

// Single egress point for ALL Xero accounting API traffic. Every data read in
// the app goes through xeroFetch — which is what makes the read-only guard
// below airtight.
const XERO_API_BASE = "https://api.xero.com/api.xro/2.0/";
const EXPIRY_MARGIN_MS = 60_000;

export class ReadOnlyViolation extends Error {}
export class NotConnectedError extends Error {}

export async function xeroFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  // Guard runs before any token logic so it is enforceable (and testable)
  // even while disconnected. ShortStay holds no write scopes either — this is
  // the second, in-process layer of that guarantee.
  const method = (init.method ?? "GET").toUpperCase();
  if (method !== "GET") {
    throw new ReadOnlyViolation(
      `ShortStay is READ-ONLY: refusing ${method} ${path}. Only GET requests to the Xero API are permitted.`
    );
  }

  let session = tokenStore.get();
  if (!session) throw new NotConnectedError("Not connected to Xero.");
  if (session.expiresAt - Date.now() < EXPIRY_MARGIN_MS) {
    session = await refreshSession();
  }

  let res = await apiGet(path, session);
  if (res.status === 401) {
    session = await refreshSession();
    res = await apiGet(path, session);
  }
  if (res.status === 429) {
    const retryAfter = res.headers.get("Retry-After");
    throw new Error(
      `Xero rate limit hit (429). Retry after ${retryAfter ?? "unknown"}s.`
    );
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Xero GET ${path} failed: ${res.status} ${detail.slice(0, 300)}`);
  }
  return res.json();
}

function apiGet(path: string, session: XeroSession): Promise<Response> {
  return fetch(new URL(path, XERO_API_BASE), {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "Xero-tenant-id": session.tenantId,
      Accept: "application/json",
    },
    cache: "no-store",
  });
}

// ---- Typed data helpers (the four dashboard reads) ----

export interface XeroOrganisation {
  Name: string;
  LegalName?: string;
  BaseCurrency?: string;
  CountryCode?: string;
  OrganisationType?: string;
}

export interface XeroContact {
  ContactID: string;
  Name: string;
  EmailAddress?: string;
  IsCustomer?: boolean;
  IsSupplier?: boolean;
}

export interface XeroInvoice {
  InvoiceID: string;
  InvoiceNumber?: string;
  Contact?: { Name?: string };
  DateString?: string;
  DueDateString?: string;
  Status?: string;
  Total?: number;
  AmountPaid?: number;
}

export interface XeroBankTransaction {
  BankTransactionID: string;
  Type: string;
  Contact?: { Name?: string };
  BankAccount?: { Name?: string };
  DateString?: string;
  Total?: number;
  Status?: string;
}

export async function getOrganisation(): Promise<XeroOrganisation> {
  const data = await xeroFetch<{ Organisations: XeroOrganisation[] }>("Organisation");
  return data.Organisations[0];
}

export async function getContacts(): Promise<XeroContact[]> {
  const data = await xeroFetch<{ Contacts: XeroContact[] }>(
    `Contacts?${new URLSearchParams({ page: "1" })}`
  );
  return data.Contacts;
}

// ACCREC (sales) invoices are the STR revenue signal — future forecast input.
export async function getAccRecInvoices(): Promise<XeroInvoice[]> {
  const data = await xeroFetch<{ Invoices: XeroInvoice[] }>(
    `Invoices?${new URLSearchParams({
      where: 'Type=="ACCREC"',
      order: "Date DESC",
      page: "1",
    })}`
  );
  return data.Invoices;
}

export async function getBankTransactions(): Promise<XeroBankTransaction[]> {
  const data = await xeroFetch<{ BankTransactions: XeroBankTransaction[] }>(
    `BankTransactions?${new URLSearchParams({ order: "Date DESC", page: "1" })}`
  );
  return data.BankTransactions;
}
