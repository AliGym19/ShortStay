# ShortStay — Full Plan & Handoff (2026-07-05, pre-freeze)

State of every planned workstream: what shipped, what's half-built, exactly
how to finish each. Written for whoever picks this up (human or agent).

## Shipped and verified

| Feature | Where | Verified how |
|---|---|---|
| Xero OAuth (auth-code), token refresh single-flight | `lib/oauth.ts`, `api/auth/*` | live against Demo Company (UK) |
| Never-moves-money guard (GET whitelist + ACCPAY/DRAFT-only write) | `lib/xero.ts` | `curl /api/dev/guard-test` 9/9 |
| Closed audit vocabulary + append-only chain | `lib/audit.ts`, `lib/audit-types.ts` | chain walked via `/api/audit?chain=` |
| Receipt → LLM coding → real DRAFT bill in Xero | `api/code-receipt`, `lib/draft-bill.ts` | live bills 80a36616…, b683a5d1…, e8cc4bce… |
| Statement assembly (pence-exact) + gated approval | `lib/statement*.ts`, `api/statements/*` | penny test, 409 held path, escalate path |
| Payout reconcile (deterministic) | `lib/match.ts`, `api/reconcile` | 6/6 match at 428400p |
| 3-persona pipeline: cleaner report → ops invoice → accountant approve/deny | `lib/permissions.ts`, `api/reports*`, `api/approvals*` | typecheck + route smoke; UI wired |
| Contacts tab (live Xero), messenger dock POC, /book site → ops queue | `ShortStayApp.tsx`, `app/book`, `api/bookings` | renders; bookings persist |
| Legal set at /legal + criteria map | `legal/*`, `app/legal`, `JUDGING.md` | all 5 docs render |
| Vercel build fixes | `.gitignore` anchor + committed `mock.ts` + db :memory: fallback | fresh-clone no-env build green |

## Vercel deploy — do now

1. `git push` (7 commits ahead). Vercel auto-builds; expect green.
2. Hosted behaviour without further work: login, /legal, /book, dashboard
   shell render; data is ephemeral (in-memory SQLite per lambda) and Xero is
   disconnected (no env vars, in-memory tokens). Good enough as the
   production-URL checkbox; the demo runs on localhost.
3. To make hosted functional later: set env vars in Vercel (XERO_CLIENT_ID/
   SECRET, OPENROUTER_API_KEY, STATEMENT_MONTH) + finish Migration B below.

## Not executed — the remaining plan, in priority order

### Migration B: Supabase Postgres (for a truly functional hosted app)
- `postgres` driver installed. Needs `SUPABASE_DB_URL` (Transaction pooler
  URI, port 6543) in `.env` + Vercel env.
- Port `lib/schema.ts` to `drizzle-orm/pg-core` (uuid pk `defaultRandom()`,
  `jsonb`, `timestamptz`); `lib/db.ts` to `drizzle-orm/postgres-js`.
- `lib/audit.ts` chain(): the recursive CTE is standard SQL — swap `db.all`
  for `db.execute`, adjust row marshalling (pg returns Date/objects, not
  integer-ms/JSON-text).
- Token persistence: implement `TokenStore` (the seam in `lib/tokenStore.ts`)
  against a single-row `xero_sessions` table so lambdas share the session.
- Re-run seeds (`POST /api/dev/seed`).

### Migration A: xero-node SDK as the single Xero surface
- `xero-node@18` installed. Rewrite `lib/xero.ts` as a wrapper exposing ONLY:
  getOrganisation, getContacts, getAccounts, getInvoices(+byId),
  getBankTransactions(+byId), getTrackingCategories, getReportProfitAndLoss,
  createPermittedInvoice.
- Guard moves to payload level: `assertPermittedInvoiceWrite(type, status)`
  allowing Type ∈ {ACCPAY, ACCREC} × Status ∈ {DRAFT, SUBMITTED} only —
  this folds in the booking-flow widening. Rewrite guard-test around it.
- Keep existing helper signatures + PascalCase return shapes (map from the
  SDK's camelCase models) so no caller changes.
- Client per request: `new XeroClient({clientId, clientSecret})` +
  `setTokenSet()` from tokenStore; keep `oauth.ts` for the consent dance and
  single-flight refresh.

### Booking → ACCREC invoice (finish Phase 1b)
- Ops Bookings queue (built) gains Confirm/Decline. Confirm →
  `draftSalesInvoice()` in `lib/draft-bill.ts`: Type ACCREC, Status
  SUBMITTED, contact "Booking.com" (create the contact in Xero first),
  Reference `SS-BK-<id> / <propertyId>`, read-back asserts SUBMITTED.
- Requires the guard widening above (or a temporary ACCREC branch in the
  current body-parsing guard).
- State chips on the queue: `GET /Invoices?IDs=` → pending (DRAFT/SUBMITTED)
  / authorised / paid (AmountPaid ≥ Total). Human pays in Xero; app reads it.

### Messenger: persist (finish Phase 4)
- POC dock is client-side (`SEED_THREADS` in `ShortStayApp.tsx`). To persist:
  `threads` + `messages` tables (design in
  `~/.claude/plans/now-were-getting-complext-snoopy-barto.md` §Phase 4),
  `GET /api/threads`, `GET/POST /api/messages`, swap the Dock's state for
  fetches. Compose window with `<datalist>` autocomplete is designed there
  too. Est 60-90 min.

### Un-AI restyle (Phase 2)
- Single Inter typeface, kill remaining eyebrows/marketing copy, hairline
  card borders, pill buttons, initial-avatars everywhere. Revolut Business
  as reference. Est 40 min, demo-path screens only.

### Smaller parked items
- Offline fallback acceptance test (unset OPENROUTER_API_KEY + restart).
- `docs/` refresh (data-schema.md, file-structure.md lag the code — repo
  rule says fix before calling any of the above done).
- Xero supplier contacts for the inbox receipts (Rapid Flow / Sparkle /
  Linen Rooms) — created in the org already; Demo Company resets ~28 days.
- Regenerate the Xero client secret post-hackathon (was pasted in a chat).
- y2k design direction — parked by Ali for later.

## Demo script pointers

Roles: log in as Dana (cleaner) → submit report; Jo (ops) → Field reports →
price → Send to Xero as pending; Priya (accountant) → Approvals → approve
(or deny with reason). Alt-tab to Xero Drafts for the bill. Ledger tab for
scope exhibit + audit chain. `/book` on a phone for the booking intake.
Escalate beat: as Jo, hit the statement gate — approver-authority escalates.
