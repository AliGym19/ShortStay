# Session end 2026-07-05 ~11:45 — demo at 15:00

Everything buildable is built. 4 commits UNPUSHED (fcda0bf head) — push
before demo so Vercel is current. Fresh-clone no-env build verified green
at fcda0bf.

## Pre-demo checklist (human, in order)

1. `git push` (4 commits: field-reports UX fix, booking→ACCREC, restyle,
   messenger persistence).
2. Xero: create contact **Booking.com** (booking Confirm needs it) — the
   3 supplier contacts already exist.
3. Vercel env vars if hosted sign-in matters: XERO_CLIENT_ID/SECRET,
   XERO_REDIRECT_URI=https://<domain>/api/auth/callback, OPENROUTER_API_KEY,
   STATEMENT_MONTH=2026-06; register the same callback URL on the Xero app.
   Hosted tokens are per-lambda (unreliable) — demo Xero flows on localhost.
4. Rehearse: Dana submits report → Jo prices + "Send to Xero as pending" →
   Priya approves in Approvals tab → alt-tab to Xero Drafts. Then /book →
   Jo confirms → ACCREC SUBMITTED → mark paid in Xero → chip flips.
5. Guard-test on camera if judges ask: /api/dev/guard-test → 11/11.

## Session summary (2026-07-05, ~08:20–11:45)

20 commits, +4995/−539 across 53 files:
- 3-persona pipeline (cleaner/ops/accountant) with server-enforced
  permissions + approverAuthority guard.
- Booking site /book → ops queue → ACCREC SUBMITTED (guard deliberately
  widened: ACCPAY|ACCREC × DRAFT|SUBMITTED — decisions.md) + live
  pending/authorised/paid chips read from Xero.
- Messenger dock persisted to SQLite (threads/messages, unread counts).
- Contacts tab (live Xero), un-AI Inter restyle, /legal compliance set,
  JUDGING.md criteria map, docs/ROADMAP.md full handoff.
- Vercel unblocked: gitignore data/ anchor bug (mock.ts was never
  committed), db :memory: fallback (build-worker race + read-only FS),
  XERO_REDIRECT_URI env override.

## Parked (docs/ROADMAP.md has full instructions)

- Migration A: xero-node wrapper (installed, not wired) — ~2h, touches the
  proven write path; deliberately not done pre-demo.
- Migration B: Supabase Postgres — blocked on SUPABASE_DB_URL from Ali.
- y2k design direction — Ali wants to discuss later.
- Post-hackathon: regenerate Xero client secret; Demo Company resets ~28d.
