# ShortStay — Plan

## What this is
STR forecasting system + agentic issue triage + agency dashboard signing in
with Xero (read-only). Full session plan archived at
`~/.claude/plans/https-developer-xero-com-documentation-effervescent-castle.md`.

## Shipped (MVP, 2026-07-04)
- Next.js 16 App Router + TS + Tailwind, port 3000
- Xero OAuth2 auth-code flow (client secret, state cookie, official
  Sign In with Xero button) → Demo Company org
- Dashboard: connection card (tenant, expiry, granted-scope chips with
  requested-vs-granted diff), four read-only data sections
  (Organisation, Contacts, ACCREC Invoices, Bank Transactions)
- Read-only guard: `xeroFetch` throws on any non-GET (`/api/dev/guard-test`)
- Single-flight rotating-refresh-token handling on `globalThis` store
- Forecast/Triage placeholder pages + `docs/forecasting-v1.md`, `docs/triage-v1.md`

## Done-point (this MVP)
OAuth sign-in works + dashboard shows live Demo Company data. Verified per
README "Verification" section.

## Kill condition
If Xero denies granular read scopes to the app or Demo Company access proves
unusable, revisit before building forecasting on top.
