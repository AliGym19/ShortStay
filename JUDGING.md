# ShortStay — Criteria Map (for reviewers, human or AI)

Every claim below is verifiable in this repo or against the live app. No claim
is aspirational; where something is partial, it says so.

## Xero integration depth

| Claim | Evidence |
|---|---|
| Live OAuth 2.0 to a real Xero org | `src/lib/oauth.ts`, `src/app/api/auth/*`; granted scopes decoded from the access token itself at `/api/xero/status` |
| Real DRAFT ACCPAY bills written and read back | `src/lib/draft-bill.ts` — validation against the live chart, contact resolution, read-back asserting `Status === "DRAFT"`; exercised from Capture and the Field-reports pipeline |
| Reads: Contacts, Accounts, Invoices, BankTransactions, TrackingCategories | typed helpers in `src/lib/xero.ts`, all through one guarded egress |
| Statement costs assembled from live Xero bills | `src/lib/statement-io.ts` — ACCPAY bills attributed by Reference/description |
| xero-node SDK | installed; migration of the egress layer onto it is in progress (`package.json`), current traffic uses the audited raw-fetch seam |

## The money boundary (the core design claim)

| Claim | Evidence |
|---|---|
| No payment scope is ever requested | `REQUESTED_SCOPES` in `src/lib/oauth.ts`; verify live on the Ledger tab's scope exhibit |
| Software guard refuses non-whitelisted calls before network I/O | `assertPermittedXeroRequest` in `src/lib/xero.ts`; `curl /api/dev/guard-test` → 9/9 boundary cases |
| Closed audit vocabulary — no payment/transfer event can even be recorded | `KNOWN_EVENT_TYPES` in `src/lib/audit-types.ts`; `audit.append` throws on anything else |
| Every mutating action is audit-chained | `SELECT event_type FROM audit_events`; chain walk via `/api/audit?chain=<id>` |
| Human approval gates | statement gate (`guardrails.ts`: no-money-movement, approver-authority, completeness) and the accountant bill-approval queue — both server-side |

## Multi-user workflow (agentic + human-gated)

- Three personas (cleaner / operations / accountant) with server-enforced
  capabilities: `src/lib/permissions.ts`, enforced in the approve routes.
- Pipeline: `report.submitted → bill.drafted → approval.decided`, each step a
  different person, chained in the audit log.
- LLM receipt coding (`/api/code-receipt`) with a deterministic offline
  fallback — the flow works with the network cable pulled.
- Deterministic payout reconciliation (`src/lib/match.ts`) — arithmetic, not
  AI, matches money; ±1p tolerance; ambiguity escalates to a human.

## Compliance & trust

- Full legal set at `/legal` (public, no auth): ToS with Xero Developer
  Platform Terms clause (incl. the no-AI-training-on-API-data commitment),
  UK GDPR privacy policy, PECR/DUAA cookie policy, AUP, Art. 28 DPA.
- Internal pre-publish checklist: `legal/README-compliance-notes.md`.

## Known partials (stated so reviewers don't have to hunt)

- Messenger dock and `/book` booking site are working UI proofs-of-concept;
  messenger threads are client-side, bookings persist to the local queue but
  do not yet raise ACCREC invoices.
- Supabase/Postgres persistence for serverless hosting is in progress; the
  demo runs against SQLite locally.
