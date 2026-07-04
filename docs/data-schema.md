# Data Schema

Data model, interfaces, and storage layout for **ShortStay**.

## In-Memory Token Store

The Xero session is held in process memory on `globalThis`. No database row
represents it; the only persistence mechanism is the Node.js process itself.

### `XeroSession` (lib/tokenStore.ts)

```typescript
interface XeroSession {
  accessToken: string;       // JWT — expired/refreshed by xeroFetch
  refreshToken: string;      // rotates on every refresh (single-use)
  expiresAt: number;         // epoch ms — checked with 60s margin
  tenantId: string;          // Xero tenant GUID (Demo Company)
  tenantName: string;        // display name ("Demo Company")
  idClaims?: Record<string, unknown>; // decoded id_token payload (openid claims)
}
```

**Lifecycle:**
```
null (startup / disconnect)
  → exchangeCode() → session stored
  → xeroFetch() reads session, refreshes as needed
  → disconnect / restart → null
```

### `TokenStore` Interface (lib/tokenStore.ts)

```typescript
interface TokenStore {
  get(): XeroSession | null;
  set(session: XeroSession): void;
  clear(): void;
}
```

The current implementation stores the session under `globalThis.__shortstayXero`.
The interface is the seam — swapping in a `.tokens.json`-backed or Supabase-backed
store is a one-file change.

### Single-Flight Refresh Lock

```typescript
function getRefreshLock(): Promise<XeroSession> | null;
function setRefreshLock(p: Promise<XeroSession> | null): void;
```

Co-located with the token store on the same `globalThis` cache. Concurrent
callers await the same in-flight promise; the lock is cleared on resolution or
rejection.

## Xero API Data Types (lib/xero.ts)

These are the response shapes returned by the Xero Accounting API. They are
subsets of Xero's full object model — only the fields the dashboard displays
are typed.

### `XeroOrganisation`

```typescript
interface XeroOrganisation {
  Name: string;
  LegalName?: string;
  BaseCurrency?: string;
  CountryCode?: string;
  OrganisationType?: string;
}
```

Single-row result from `GET /Organisation`.

### `XeroContact`

```typescript
interface XeroContact {
  ContactID: string;
  Name: string;
  EmailAddress?: string;
  IsCustomer?: boolean;
  IsSupplier?: boolean;
}
```

Array result from `GET /Contacts` (paginated, first page only in dashboard).

### `XeroInvoice`

```typescript
interface XeroInvoice {
  InvoiceID: string;
  InvoiceNumber?: string;
  Contact?: { Name?: string };
  DateString?: string;
  DueDateString?: string;
  Status?: string;
  Total?: number;
  AmountPaid?: number;
}
```

Array result from `GET /Invoices?where=Type=="ACCREC"` (paginated, first page
only in dashboard). ACCREC = sales invoices — the STR revenue signal.

### `XeroBankTransaction`

```typescript
interface XeroBankTransaction {
  BankTransactionID: string;
  Type: string;                   // "RECEIVE" for inbound payments
  Contact?: { Name?: string };
  BankAccount?: { Name?: string };
  DateString?: string;
  Total?: number;
  Status?: string;
}
```

Array result from `GET /BankTransactions` (paginated, first page only in
dashboard). RECEIVE rows are the cash-side forecast input.

## Future: Supabase (Postgres)

`lib/supabase.ts` exports a lazy server-only client configured with the secret
key (bypasses RLS). No tables or queries exist yet.

### Triage Queue (planned for `docs/triage-v1.md`)

A local SQLite table is the design intent for v1 (matching the localhost
deployment). If Supabase is chosen instead, the schema would be:

```sql
CREATE TABLE issue (
  id              UUID PRIMARY KEY,
  description     TEXT NOT NULL,
  property        TEXT NOT NULL,
  reporter        TEXT NOT NULL,
  severity        TEXT,         -- P1 | P2 | P3 | P4
  category        TEXT,         -- maintenance | guest | billing | listing
  suggested_action TEXT,
  confidence      REAL,         -- 0.0 - 1.0
  status          TEXT NOT NULL DEFAULT 'pending', -- pending | reviewed | dismissed
  created_at      TIMESTAMPTZ NOT NULL,
  reviewed_at     TIMESTAMPTZ
);
```

### Forecast Cache (planned for `docs/forecasting-v1.md`)

Storage TBD. May cache monthly buckets to avoid recomputing on every load.

## Filesystem Storage

None currently. No data is written to disk by the application.
`appdata/`-style local storage is deferred until triage v1 (SQLite).

## OAuth Scopes

The exact scope string ShortStay requests (lib/oauth.ts):

```
openid profile email offline_access
accounting.settings.read accounting.contacts.read
accounting.invoices.read accounting.banktransactions.read
accounting.reports.profitandloss.read
```

No write scopes are requested. Reports scopes are granular per-report —
`accounting.reports.read` is not a valid scope for this app.
