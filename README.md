# ShortStay

## What This Is

ShortStay is a short-term rental (STR) portfolio management tool for agencies. It
gives property managers a **revenue forecasting dashboard** and an **agentic
issue-triage system** — all authenticated through their existing Xero accounting
account.

<<<<<<< Updated upstream
## Never-moves-money guarantee

ShortStay **never moves money**. It holds exactly one write scope
(`accounting.invoices`) used for one thing: creating **draft** ACCPAY bills
that a human approves inside Xero. No payment scope exists on the token:
=======
The product has three pillars, built in order:

1. **Agency Dashboard** (MVP — shipped): live read-only Xero data with token
   management, scope verification, and four data views (Organisation, Contacts,
   ACCREC Invoices, Bank Transactions).

2. **Revenue Forecasting** (v1 — designed, not yet built): monthly revenue trend
   with a 3-month moving-average projection, comparing accrual (ACCREC invoices)
   against cash (RECEIVE bank transactions).

3. **Agentic Issue Triage** (v1 — designed, not yet built): manual property-issue
   intake form, LLM classification (Claude API) into P1–P4 severity with
   suggested actions, and a human-in-the-loop review queue.

Forecasting and triage are fully designed (`docs/forecasting-v1.md`,
`docs/triage-v1.md`); the MVP ships only the dashboard and placeholder pages.

## Core Features

### Shipped (MVP)
- Xero OAuth2 sign-in with the official "Sign In with Xero" branded button
- Live read-only dashboard with four data sections
- Scope verification — requested vs granted `accounting.*` scopes compared on
  every page load with mismatch warnings
- Token management: expiry countdown, refresh, disconnect
- Read-only guard: every non-GET call to the Xero accounting API is rejected
  at the application layer, on top of the token's scope boundary

### Planned (v1)
- Monthly revenue trend + 3-month projection (see `docs/forecasting-v1.md`)
- Issue intake → LLM classification → review queue (see `docs/triage-v1.md`)

## Tech Stack

**Application (`app/`, `lib/`, `components/`):**
- **Language**: TypeScript 5 (strict mode)
- **Framework**: Next.js 16.2 App Router with React 19.2
- **Styling**: Tailwind CSS v4 via `@tailwindcss/postcss`
- **Auth**: Xero OAuth2 (standard auth-code flow with client secret — no PKCE)
- **Database**: Supabase client wired (`@supabase/supabase-js`), no schema yet
- **Package manager**: pnpm

No Xero SDK — all API traffic uses raw `fetch` through a single egress point
(`lib/xero.ts`) for transparency and guard enforcement.

## Key Design Decisions

### Why read-only? (and how it's enforced)

ShortStay requests **no Xero write scope of any kind**. The nine granular scopes
are all `*.read`. Two layers guarantee this:

1. The token Xero issues is scope-bound — it cannot write.
2. `lib/xero.ts` — the single egress for all accounting API traffic — hard-throws
   `ReadOnlyViolation` on any non-GET request. This is testable at
   `GET /api/dev/guard-test` and runs *before* any token logic.

### Why Demo Company only?

The MVP targets the Xero Demo Company org exclusively. Demo Company auto-resets
roughly every 28 days (harmless — data just changes). Tenant resolution in
`lib/oauth.ts` picks the Demo Company (or the first available org as fallback).
Multi-org support is deferred.

### Why raw fetch (no xero-node SDK)?

Transparency over convenience. A single `xeroFetch` function gives full control
over the read-only guard, token auto-refresh, rate-limit handling, and error
reporting. An SDK would complicate the guard and obscure the request path.

### Why in-memory tokens (no persistence)?

Sessions live on `globalThis` — they survive HMR but die on server restart.
This is intentional for a localhost MVP: restart = re-auth, no token-at-rest
surface to secure. A `TokenStore` interface wraps the store so a
`.tokens.json` fallback is a one-file swap if needed.

### Why single-flight refresh?

Xero refresh tokens rotate and are *single-use*. Two concurrent requests that
both see an expired access token would burn the new refresh token if both tried
to rotate it. The single-flight lock (`lib/tokenStore.ts`) makes all concurrent
callers await the same in-flight refresh promise.

### Why Supabase is wired but unused?

`lib/supabase.ts` exports a lazy server-only Supabase client pre-configured with
the secret key (bypassing RLS). No tables or queries exist yet — it's the
single egress point for future ShortStay state: the triage queue, forecast
cache, and any data Xero doesn't hold. This file must never be imported from
a `"use client"` component.

## Read-Only Guarantee

ShortStay requests exactly these scopes:
>>>>>>> Stashed changes

```
openid profile email offline_access
accounting.settings.read accounting.contacts.read
accounting.invoices accounting.banktransactions.read
accounting.reports.profitandloss.read
```

Reports scopes are granular per-report for this app — there is no blanket
`accounting.reports.read`; requesting it returns `invalid_scope`. P&L is the
one report forecasting v1 needs.

<<<<<<< Updated upstream
Two layers enforce this: the token cannot touch `/Payments`,
`/BankTransfers`, or any bank-transaction write (scope boundary), and
`lib/xero.ts` — the single egress point for all accounting API traffic —
hard-throws on anything except GET or `POST /Invoices` whose parsed body has
`Type: "ACCPAY"` and `Status: "DRAFT"` (`/api/dev/guard-test` proves all four
boundary cases).
=======
## Quick Start
>>>>>>> Stashed changes

**Prerequisites:**
- Node.js 20 LTS or later
- pnpm

**Setup:**

1. **Xero developer app** — at [developer.xero.com/myapps](https://developer.xero.com/myapps)
   create (or reuse) an app of type **Web app** (Mobile/PWA apps are PKCE-only
   and won't work with this flow). Add this redirect URI, character-exact:

   ```
   http://localhost:3000/api/auth/callback
   ```

   The flow 400s without it.

2. **Demo Company** — make sure "Demo Company" is active in your Xero account
   (my.xero.com org switcher). It must exist before it appears in the OAuth
   org picker. It auto-resets roughly every 28 days; harmless here.

3. **Credentials** — copy `.env.example` to `.env` and fill in
   `XERO_CLIENT_ID` and `XERO_CLIENT_SECRET` (generate a client secret on the
   app's configuration page). `.env` is gitignored; never commit it.

4. **Run:**

   ```bash
   pnpm install
   pnpm dev       # http://localhost:3000
   ```

Always check `package.json` for the exact, current scripts — it is the source
of truth for commands.

## Deployment

Deferred. The MVP runs locally at `http://localhost:3000`. Production hosting,
environment-based configuration, and any move from in-memory to persistent
token storage are out of scope for now.

## Verification Checklist

1. `pnpm dev` → `http://localhost:3000` shows the disconnected dashboard with
   the official Sign In with Xero button; no env errors.
2. Guard test (works pre-auth):
   `curl http://localhost:3000/api/dev/guard-test` →
   `{"threw":true,"guard":true,"message":"ShortStay is READ-ONLY: refusing POST …"}`
3. Sign In with Xero → log in → pick **Demo Company** → consent screen lists
   exactly the 9 read-only scopes → redirected back to the dashboard.
4. Dashboard shows tenant "Demo Company", scope chips with **no mismatch
   warning**, and all four data sections populated.
5. Hot-reload persistence: save any file, reload the page → still connected.
6. **Refresh token** button → expiry resets to ~30 min, data still loads.
7. Restart `pnpm dev` → disconnected (expected; tokens are in-memory only) →
   reconnect works.
8. `git check-ignore .env` succeeds; `git status` never shows `.env`.

## Architecture Summary

- `lib/oauth.ts` — authorize URL, code exchange, single-flight refresh
  (Xero refresh tokens rotate and are single-use), `/connections` tenant
  resolution. OAuth POSTs target `identity.xero.com` and are intentionally
  outside the read-only guard (different host, not the accounting API).
- `lib/tokenStore.ts` — session on `globalThis` (survives HMR; restart =
  re-auth by design), behind a `TokenStore` interface.
- `lib/xero.ts` — `xeroFetch` guard + auto-refresh + the four typed reads.
- `app/api/auth/*` — connect / callback (state check) / refresh / disconnect.
- Tokens are never rendered or logged; the dashboard decodes the access-token
  JWT locally only to display the granted `scope` claim.

Full architecture and data model details are in `docs/`.
