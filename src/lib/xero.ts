import { refreshSession } from "./oauth";
import { tokenStore, type XeroSession } from "./tokenStore";

// Single egress point for ALL Xero accounting API traffic. Every call in the
// app goes through xeroFetch — which is what makes the never-moves-money
// guard below airtight.
const XERO_API_BASE = "https://api.xero.com/api.xro/2.0/";
const EXPIRY_MARGIN_MS = 60_000;

export class NeverMovesMoneyViolation extends Error {}
export class NotConnectedError extends Error {}

// Every call ShortStay is allowed to make, by first path segment. GETs off
// this list are refused too — the guard whitelists the entire API surface,
// not just writes. Deviations from the spec's six-entry list, both needed
// by live features: Organisation (ConnectionCard) and Reports/ProfitAndLoss
// (forecast; the only permitted report).
const ALLOWED_GET_SEGMENTS = new Set([
  "contacts",
  "accounts",
  "trackingcategories",
  "invoices",
  "banktransactions",
  "organisation",
  "reports",
]);

// Never-moves-money invariant. The ONLY permitted write, ever, is
// POST /Invoices with body Type "ACCPAY" and Status "DRAFT". The body is
// parsed here — the guard does not trust the caller's claims about it.
// Exported so guard-test can assert every case with zero network traffic.
export function assertPermittedXeroRequest(
  method: string,
  path: string,
  body: unknown
): void {
  const m = method.toUpperCase();
  const cleanPath = path.split("?")[0].replace(/^\/+|\/+$/g, "");
  const segments = cleanPath.toLowerCase().split("/");

  const refuse = (why: string): never => {
    throw new NeverMovesMoneyViolation(
      `Never-moves-money invariant: refusing ${m} ${path} — ${why}. ` +
        `The only permitted Xero write is POST /Invoices with Type "ACCPAY" and Status "DRAFT".`
    );
  };

  if (m === "GET") {
    if (!ALLOWED_GET_SEGMENTS.has(segments[0])) {
      return refuse("GET is permitted to whitelisted resources only");
    }
    if (segments[0] === "reports" && segments[1] !== "profitandloss") {
      return refuse("the only permitted report is Reports/ProfitAndLoss");
    }
    return;
  }

  if (m !== "POST") refuse("only GET and the single draft-bill POST exist");
  if (segments.join("/") !== "invoices") {
    refuse("POST is permitted to /Invoices only");
  }
  if (typeof body !== "string") {
    return refuse("write body must be a JSON string the guard can inspect");
  }
  let parsed: { Type?: unknown; Status?: unknown };
  try {
    parsed = JSON.parse(body);
  } catch {
    return refuse("write body is not valid JSON");
  }
  if (parsed.Type !== "ACCPAY") refuse('invoice Type must be "ACCPAY"');
  if (parsed.Status !== "DRAFT") refuse('invoice Status must be "DRAFT"');
}

export async function xeroFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  // Guard runs before any token or network logic so it is enforceable (and
  // testable) even while disconnected.
  const method = (init.method ?? "GET").toUpperCase();
  assertPermittedXeroRequest(method, path, init.body);

  let session = tokenStore.get();
  if (!session) throw new NotConnectedError("Not connected to Xero.");
  if (session.expiresAt - Date.now() < EXPIRY_MARGIN_MS) {
    session = await refreshSession();
  }

  let res = await apiRequest(method, path, init.body, session);
  if (res.status === 401) {
    // Safe to retry the POST too: a 401 means Xero rejected auth before
    // processing the request.
    session = await refreshSession();
    res = await apiRequest(method, path, init.body, session);
  }
  if (res.status === 429) {
    const retryAfter = res.headers.get("Retry-After");
    throw new Error(
      `Xero rate limit hit (429). Retry after ${retryAfter ?? "unknown"}s.`
    );
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Xero ${method} ${path} failed: ${res.status} ${detail.slice(0, 300)}`
    );
  }
  return res.json();
}

function apiRequest(
  method: string,
  path: string,
  body: BodyInit | null | undefined,
  session: XeroSession
): Promise<Response> {
  return fetch(new URL(path, XERO_API_BASE), {
    method,
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "Xero-tenant-id": session.tenantId,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body } : {}),
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

export interface XeroAccount {
  AccountID: string;
  Code?: string;
  Name: string;
  Status?: string;
  Type?: string;
}

// Chart of accounts changes rarely — cache for 5 minutes (Xero rate limit:
// 60 calls/min/tenant; the coding flow validates an AccountCode per receipt).
let accountsCache: { at: number; accounts: XeroAccount[] } | null = null;
const ACCOUNTS_TTL_MS = 5 * 60_000;

export async function getAccounts(): Promise<XeroAccount[]> {
  if (accountsCache && Date.now() - accountsCache.at < ACCOUNTS_TTL_MS) {
    return accountsCache.accounts;
  }
  const data = await xeroFetch<{ Accounts: XeroAccount[] }>("Accounts");
  accountsCache = { at: Date.now(), accounts: data.Accounts };
  return data.Accounts;
}

export interface XeroInvoiceDetail extends XeroInvoice {
  Type?: string;
  Reference?: string;
  LineItems?: {
    Description?: string;
    UnitAmount?: number;
    AccountCode?: string;
  }[];
}

export async function getInvoiceById(id: string): Promise<XeroInvoiceDetail> {
  const data = await xeroFetch<{ Invoices: XeroInvoiceDetail[] }>(
    `Invoices/${encodeURIComponent(id)}`
  );
  const invoice = data.Invoices?.[0];
  if (!invoice) throw new Error(`Xero returned no invoice for id ${id}`);
  return invoice;
}

// ACCPAY (purchase) bills — statement cost lines. Xero's `where` needs an
// ISO DateTime range; month is "2026-06".
export async function getAccPayInvoices(month: string): Promise<XeroInvoiceDetail[]> {
  const [y, m] = month.split("-").map(Number);
  const nextY = m === 12 ? y + 1 : y;
  const nextM = m === 12 ? 1 : m + 1;
  const where =
    `Type=="ACCPAY" AND Date >= DateTime(${y},${m},1) AND Date < DateTime(${nextY},${nextM},1)`;
  const data = await xeroFetch<{ Invoices: XeroInvoiceDetail[] }>(
    `Invoices?${new URLSearchParams({ where, order: "Date ASC", page: "1" })}`
  );
  return data.Invoices;
}
