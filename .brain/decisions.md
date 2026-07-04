# Decisions

- **2026-07-04 — Write scope subsumes read (VERIFIED live).** Requested
  `accounting.invoices` only (dropped `.read`); the consent grant came back
  with BOTH `accounting.invoices` and `accounting.invoices.read` — Xero
  auto-adds the read form alongside the write scope. Invoice read-backs work,
  no 403. Requested set is now: `openid profile email offline_access
  accounting.settings.read accounting.contacts.read accounting.invoices
  accounting.banktransactions.read accounting.reports.profitandloss.read`.
  Why: one write scope for draft ACCPAY bills (never-moves-money invariant —
  drafts only, human approves in Xero; guard in lib/xero.ts enforces
  Type/Status by parsing the body). No payment scope exists on the token.

- **2026-07-04 — Read-only Xero access.** Scope string (exact):
  `openid profile email offline_access accounting.settings.read accounting.contacts.read accounting.invoices.read accounting.banktransactions.read accounting.reports.profitandloss.read`.
  No write scope of any kind. Second layer: `xeroFetch` hard-throws on non-GET.
  History: first attempt included blanket `accounting.reports.read` →
  `invalid_scope` at the live authorize endpoint. Misdiagnosed once as the
  granular invoice/banktxn scopes; the app's actual scope list (pasted from
  the developer portal) showed reports scopes are per-report only
  (`accounting.reports.profitandloss.read` etc.) and there is no
  `accounting.transactions.read` for this app. P&L chosen as the single
  report scope forecasting v1 needs; add more per-report scopes only when a
  feature pulls them.
- **2026-07-04 — Demo Company org only** for MVP; never a real/PEA org.
- **2026-07-04 — Next.js 16 App Router**, port 3000, raw `fetch` (no xero-node
  SDK — transparency over convenience).
- **2026-07-04 — Standard auth-code flow with client secret** (Web app type;
  NOT PKCE). Token exchange via HTTP Basic auth.
- **2026-07-04 — Token storage: `globalThis` singleton** behind a `TokenStore`
  interface. Survives HMR, dies on restart (acceptable). Fallback if HMR ever
  wipes it: `.tokens.json`-backed store (gitignored) — one-file swap.
- **2026-07-04 — Single-flight refresh lock.** Xero refresh tokens rotate and
  are single-use; concurrent refreshes would burn the token.
- **2026-07-04 — `xero_oauth_state` cookie is `sameSite: "lax"`** — the
  callback is a top-level cross-site redirect; `strict` would break the state
  check.
- **2026-07-04 — Official Sign In with Xero button** (edge.xero.com/platform/
  sso/xero-sso.js, standalone usage) pointing at `/api/auth/connect`; plain
  link fallback.
- **2026-07-04 — Scope-diff display covers `accounting.*` only** — identity
  scopes don't appear in the access token's scope claim, so diffing them would
  produce false mismatch warnings.
- **2026-07-04 — Supabase wired for future storage, no schema yet.**
  `lib/supabase.ts` exports `getSupabase()`: a lazy server-only singleton
  using `@supabase/supabase-js` + `SUPABASE_SECRET_KEY` (bypasses RLS — never
  import this file from a `"use client"` component). Not a Xero API proxy —
  Supabase has no such connector; this is ShortStay's own Postgres for state
  Xero doesn't hold (triage queue, forecast cache — both still "storage TBD").
  No tables/queries/callers exist yet; deferred to a follow-up conversation.
