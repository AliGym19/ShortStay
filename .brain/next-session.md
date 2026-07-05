# Demo day (2026-07-05) — state as of ~08:25

All build phases shipped on `frontend-merge` (6 commits tonight, NOT pushed).
The pasted v1.0 spec's features are live on the kept architecture — see
decisions.md "v1.0 spec reconciled" for what was deliberately not migrated.

## What's proven (server-side, against live Xero Demo Company)

- Bill test: POST /api/draft-bill wrote a real DRAFT ACCPAY bill
  (InvoiceID 80a36616-025e-4f00-8d95-950800ce65ea, supplier "Basket Shop"),
  read back DRAFT, audit-chained. Tracking warning surfaced (org has no
  Property category yet — §9 seeding is optional polish).
- LLM coding live via OpenRouter: plumbing receipt → 473/P1 @ 0.95.
- Statements: L1 £5,818.10 / L2 £2,395.30 owed (no Xero costs matched yet —
  bills drafted tonight are dated June so they WILL appear as cost lines
  on reassembly if statuses stay DRAFT/SUBMITTED/AUTHORISED).
- Gate: blanked sourceId → 409 held (completeness pause); send-payment →
  escalate; approve → assembled → guard.evaluated → statement.approved chain.
- Reconcile: 6/6 bookings, 428400p exact, payout.matched audited.
- Guard-test 9/9 (GET whitelist + POST cases). Vocabulary enforced.

## Human TODO before demo (in order)

1. Log in (demo mode or real OAuth) and click through all five tabs —
   the UI was wired at ~00:30 and NEVER eyeballed (screenshots blocked by
   a Chrome-extension/dev-server quirk; only network/console verified).
2. Offline test (acceptance §2): unset OPENROUTER_API_KEY, restart dev,
   code a receipt → must fall back with "offline matcher" tag.
3. Verify the "View in Xero" deep link URL shape on the drafted bill
   (spec flags it unverified — falls back to Bills list if wrong).
4. Merge frontend-merge → main and push (Ali only).
5. Optional Xero seeding (spec §9): Property tracking category + Booking.com
   contact + RECEIVE payouts — makes statements/reconcile fully live-sourced.
6. Demo script: spec §12 order. The escalate path (actionKind send-payment
   → 409) is a strong judges' moment; curl it live.

## Known rough edges (deliberate, not bugs)

- Reconcile tab's booking table is the local mirror of the seeds; the match
  itself is server-side. Fine for demo.
- properties.landlordContactId is "local:L1/L2" — swap for real ContactIDs
  only if statement-by-contact matters live.
- Session cookie expired once mid-session; demo-mode login is one click.
- LLM receipt coding of "RAPID FLOW PLUMBING LTD" → supplier won't match a
  Demo Company contact → needsContact 422 (correct behaviour). For the
  live bill moment, edit the receipt's first line to a real contact name
  (e.g. "Basket Shop") before drafting, or create the supplier in Xero.
