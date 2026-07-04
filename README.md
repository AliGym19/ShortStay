# ShortStay

STR (short-term rental) forecasting system with agentic issue-triage
automations and an agency dashboard that signs in with Xero.

**This MVP**: Xero OAuth sign-in + live read-only data dashboard against the
Xero **Demo Company** org. Forecasting and triage are designed
(`docs/forecasting-v1.md`, `docs/triage-v1.md`) but not yet built.

## Never-moves-money guarantee

ShortStay **never moves money**. It holds exactly one write scope
(`accounting.invoices`) used for one thing: creating **draft** ACCPAY bills
that a human approves inside Xero. No payment scope exists on the token:

```
openid profile email offline_access
accounting.settings.read accounting.contacts.read
accounting.invoices accounting.banktransactions.read
accounting.reports.profitandloss.read
```

(Reports scopes are granular per-report for this app — there is no blanket
`accounting.reports.read`; requesting it returns `invalid_scope`. P&L is the
one report forecasting v1 needs.)

Two layers enforce this: the token cannot touch `/Payments`,
`/BankTransfers`, or any bank-transaction write (scope boundary), and
`lib/xero.ts` — the single egress point for all accounting API traffic —
hard-throws on anything except GET or `POST /Invoices` whose parsed body has
`Type: "ACCPAY"` and `Status: "DRAFT"` (`/api/dev/guard-test` proves all four
boundary cases).

## Setup

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

4. **Run**:

   ```bash
   pnpm install   # already done if node_modules exists
   pnpm dev       # http://localhost:3000
   ```

## Verification checklist

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

## Architecture notes

- `lib/oauth.ts` — authorize URL, code exchange, single-flight refresh
  (Xero refresh tokens rotate and are single-use), `/connections` tenant
  resolution. OAuth POSTs target `identity.xero.com` and are intentionally
  outside the read-only guard (different host, not the accounting API).
- `lib/tokenStore.ts` — session on `globalThis` (survives HMR; restart =
  re-auth by design), behind a `TokenStore` interface for a `.tokens.json`
  fallback if ever needed.
- `lib/xero.ts` — `xeroFetch` guard + auto-refresh + the four typed reads.
- `app/api/auth/*` — connect / callback (state check) / refresh / disconnect.
- Tokens are never rendered or logged; the dashboard decodes the access-token
  JWT locally only to display the granted `scope` claim.
