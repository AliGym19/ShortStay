# Tracker

Task list and priorities for **ShortStay**.

## High Priority — v1 (forecasting + triage)

- [ ] **Forecasting v1** per `docs/forecasting-v1.md` — monthly revenue buckets
  from ACCREC invoices + RECEIVE bank transactions, 3-month moving average,
  table view (chart library deferred).
- [ ] **Reports endpoint spike** — `accounting.reports.profitandloss.read` is
  already granted; evaluate P&L report as an aggregation shortcut vs hand-rolled
  bucketing.
- [ ] **Triage v1** per `docs/triage-v1.md` — manual intake form, LLM
  classification (Claude API) into P1–P4 severity, human-in-the-loop review
  queue. SQLite storage, local-first.
- [ ] **Xero MCP server** — run in bearer-token mode fed ShortStay's access
  token. Enables tool-calling for the agentic layer; read-only scopes travel
  with the token so write tools fail safely.

## Medium Priority — Post-v1

- [ ] Add remaining Supabase tables (triage queue, forecast cache) and wire
  `lib/supabase.ts` to them.
- [ ] Per-property segmentation — mapping contacts/tracking categories to
  properties.
- [ ] Supabase RLS policies (currently bypassed with secret key).
- [ ] Xero MCP server integration with triage (billing-category issues
  context-linked to invoices).

## Backlog — Future

- [ ] Occupancy/ADR-based forecasting — needs channel/PMS data (bookings,
  nights); Xero holds revenue only.
- [ ] Triage v2: email intake, auto-drafted guest replies, contractor dispatch
  suggestions.
- [ ] Multi-org support — pick from multiple Xero tenants at login.
- [ ] Persistent token storage (Supabase-backed TokenStore or encrypted cookie).
- [ ] Deployment to production hosting.
- [ ] Authentication layer beyond Xero OAuth (if needed for non-Xero users).
- [ ] Charting library integration for forecast visualization (v1 ships table-only).

## Completed

- [x] Xero OAuth2 auth-code flow with client secret, official Sign In with Xero
  button, Demo Company org resolution.
- [x] Live read-only dashboard with four data sections (Organisation, Contacts,
  ACCREC Invoices, Bank Transactions).
- [x] Read-only guard (`xeroFetch` throws on non-GET; `/api/dev/guard-test`
  proves it).
- [x] Single-flight rotating-refresh-token handling on `globalThis` store.
- [x] Scope verification — requested vs granted `accounting.*` scope mismatch
  detection with amber warning.
- [x] Token management: expiry countdown, manual refresh, disconnect.
- [x] Forecast and Triage placeholder pages with feature design descriptions.
- [x] Supabase client pre-wired (no schema yet).
- [x] Project documentation set (`README.md`, `AGENTS.md`, `CLAUDE.md`,
  `docs/file-structure.md`, `docs/app-architecture.md`, `docs/data-schema.md`,
  `docs/forecasting-v1.md`, `docs/triage-v1.md`, `docs/tracker.md`).
