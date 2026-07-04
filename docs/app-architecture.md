# Application Architecture

Internal logic, component responsibilities, auth flow, and data flows for
**ShortStay**.

## 1. Component Responsibilities

### Next.js App Router (full-stack)

ShortStay is a single Next.js app — there is no separate backend service.

- **Pages (`app/`)** — server components (rendered at request time) + a root
  layout. The dashboard (`app/page.tsx`) is a server component marked
  `force-dynamic` because it reads per-request from the in-process token store.
- **API routes (`app/api/`)** — stateless request handlers. Auth routes
  (`auth/connect`, `auth/callback`, `auth/refresh`, `auth/disconnect`) manage
  the OAuth2 lifecycle. The guard-test route (`dev/guard-test`) is a
  verification endpoint.
- **UI components (`components/`)** — client-safe React components (no server
  imports). `ConnectionCard` and `DataSection` are pure presentation;
  `XeroSignInButton` loads an external script. Auth actions (refresh,
  disconnect) use `<form>` POSTs to API routes.
- **Application state** — there is no client-side store of record. The Xero
  session lives on `globalThis` in the server process. The dashboard reads it
  per-request; auth routes write to it.

### Data Access (`lib/xero.ts`)

- All Xero accounting API traffic goes through `xeroFetch<T>(path, init)` —
  the single egress point.
- Four typed helper functions wrap common reads: `getOrganisation()`,
  `getContacts()`, `getAccRecInvoices()`, `getBankTransactions()`.
- Pages call these helpers directly — never construct a URL to the Xero API
  themselves.
- Future: any new Xero API read should be added as a typed helper in this file.

### Auth & Token Management (`lib/oauth.ts`, `lib/tokenStore.ts`)

- **`lib/oauth.ts`** — OAuth2 logic: authorize URL, code-for-token exchange,
  single-flight token refresh, tenant resolution.
- **`lib/tokenStore.ts`** — in-memory session store behind a `TokenStore`
  interface, with single-flight refresh lock primitives.
- Auth POSTs (token exchange, refresh) target `identity.xero.com` and are
  intentionally outside the never-moves-money guard (which covers
  `api.xero.com` only).

### Service Stubs — the seam

Not yet present. Forecasting and triage will each have their own processing
logic behind named interfaces, similar to the mackads template pattern.

### Supabase (`lib/supabase.ts`)

- Lazy server-only singleton using the secret key (bypasses RLS).
- Pre-wired for future storage: triage queue, forecast cache, and any data
  Xero doesn't hold.
- No tables, queries, or callers exist yet — it's a readiness seam.

## 2. Auth Flow (Xero OAuth2)

ShortStay uses the standard authorization-code flow with client secret
(not PKCE — the Xero app is type "Web app").

### Authorize

```
User clicks "Sign In with Xero"
  → GET /api/auth/connect
    → generates random state string
    → sets httpOnly cookie `xero_oauth_state` (sameSite: "lax", maxAge: 600s)
    → redirects to Xero authorize URL with: response_type=code, client_id,
      redirect_uri, scope (9 granular read scopes), state
```

### Callback

```
Xero redirects to GET /api/auth/callback?code=...&state=...
  → validates state against `xero_oauth_state` cookie
  → POSTs code + redirect_uri to identity.xero.com/connect/token (HTTP Basic auth)
  → receives access_token, refresh_token, expires_in, id_token
  → GET /connections → resolves tenant (picks Demo Company)
  → stores XeroSession in tokenStore
  → redirects to / (dashboard)
```

### Refresh

```
xeroFetch detects expired access_token (within 60s margin)
  → calls refreshSession()
    → checks single-flight lock (getRefreshLock)
    → POSTs refresh_token to identity.xero.com/connect/token
    → Xero returns NEW access + refresh tokens (old refresh token consumed)
    → stores updated session
    → clears lock
  → retries original request with new access_token
```

Refresh tokens rotate and are single-use — `setRefreshLock` / `getRefreshLock`
ensure all concurrent callers await the same in-flight promise. On `invalid_grant`
(dead refresh token), the session is cleared to force re-auth.

### Disconnect

```
User clicks "Disconnect"
  → POST /api/auth/disconnect
    → calls tokenStore.clear() (resets session + refresh lock)
    → redirects to / (shows connect card)
```

## 3. The Never-Moves-Money Guard

The guard lives in `assertPermittedXeroRequest` / `xeroFetch` at `lib/xero.ts`:

```
assertPermittedXeroRequest(method, path, body):
  1. If method is GET → allow
  2. If method is not POST → throw NeverMovesMoneyViolation
  3. If path (stripped of query) is not "Invoices" → throw
  4. Parse body as JSON (the guard does not trust the caller's claims about it)
  5. If Type !== "ACCPAY" → throw
  6. If Status !== "DRAFT" → throw
  7. Otherwise allow

xeroFetch(path, init):
  1. assertPermittedXeroRequest(method, path, init.body) — before any network call
  2. If no session → throw NotConnectedError
  3. If access_token near expiry → refreshSession()
  4. Request to api.xero.com/api.xro/2.0/{path} (GET or the one permitted POST)
  5. If 401 → refreshSession() + retry (safe to retry a POST too — 401 means
     Xero rejected auth before processing the request)
  6. If 429 → throw with Retry-After info
  7. If !ok → throw with status + detail
  8. Return JSON body
```

Key properties:
- Guard runs **before** any token or network logic — testable even while
  disconnected (`GET /api/dev/guard-test`, four boundary cases: draft ACCPAY
  passes; `/Payments`, ACCREC, and non-DRAFT status all throw).
- Applies to all `api.xero.com` traffic only. OAuth POSTs to `identity.xero.com`
  are a different host — they bypass the guard by design.
- Combined with the scope-limited token (one write scope, `accounting.invoices`,
  no payment scope), this gives two-layer enforcement. The write path was
  proven live: a draft ACCPAY bill created via `xeroFetch` and visually
  confirmed in Xero's Bills to pay → Draft tab.

## 4. Data Flows

### Dashboard page load (connected)

```
1. Browser requests GET /
2. app/page.tsx (server component, force-dynamic):
   a. Calls tokenStore.get() → XeroSession or null
   b. If session exists:
      i.  Decodes JWT to extract granted scopes
      ii. Computes accounting.* scope mismatch
      iii. Fires 4 parallel xeroFetch calls:
           Promise.all([getOrganisation(), getContacts(),
                        getAccRecInvoices(), getBankTransactions()])
      iv. Each call goes through the guard + auto-refresh in xeroFetch
      v.  Renders ConnectionCard + 4 DataSections
   c. If no session:
      Renders disconnect card with XeroSignInButton
```

### Token lifecycle

```
No session (startup / disconnect)
  → User signs in → exchangeCode → session stored → dashboard loaded
  → Subsequent requests: xeroFetch reads session, refreshes as needed
  → Restart: globalThis cleared → back to no session
```

## 5. Authentication & Security

- **Xero auth only.** No ShortStay-native users or sessions. Authentication
  delegates entirely to Xero OAuth2.
- **No persistence.** Tokens live in process memory only. Restart = re-auth
  by design — no token-at-rest surface to secure.
- **No token exposure.** Tokens are never logged, never rendered in the UI, and
  never sent to the browser (the dashboard decodes the JWT server-side only,
  and only extracts the `scope` claim for display).
- **One write scope, human-gated.** `accounting.invoices` permits exactly one
  write shape (draft ACCPAY bills); no payment scope exists. See §3.
- **Server-only separation.** `lib/env.ts`, `lib/tokenStore.ts`,
  `lib/oauth.ts`, `lib/xero.ts`, and `lib/supabase.ts` are server-only modules.
  They must never be imported from a `"use client"` component.

## 6. Background Processing

None. All work is synchronous within request handling. Future forecasting
computation or LLM triage classification will run within API routes or server
components — no job queues planned for v1.

## 7. Storage Strategy

- **Session / tokens:** in-memory on `globalThis` (no disk). Restart clears it.
- **Xero data:** not stored locally — fetched live per dashboard load.
  Page-level caching is disabled (`force-dynamic`, `cache: "no-store"`).
- **App state (SQLite):** `lib/db.ts` (better-sqlite3 + Drizzle,
  `data/shortstay.db`, gitignored) holds `audit_events`, `prompts`, and
  `approvals` (`lib/schema.ts`). `lib/audit.ts` and `lib/prompt-registry.ts`
  are ported from paragon-hil — every prompt mutation appends an audit event;
  `audit.chain()` walks `parentEventId` back to the root via a recursive CTE.
- **Future (Supabase):** wired (`lib/supabase.ts`) but unused — no tables,
  no callers. Reach for it only if a real need for hosted/shared Postgres
  shows up; SQLite is what the app actually runs on today.
