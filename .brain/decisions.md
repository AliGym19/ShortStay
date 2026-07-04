# Decisions

- **2026-07-04 — Read-only Xero access.** Scope string (granular, exact):
  `openid profile email offline_access accounting.settings.read accounting.contacts.read accounting.invoices.read accounting.banktransactions.read accounting.reports.read`.
  No write scope of any kind. Second layer: `xeroFetch` hard-throws on non-GET.
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
