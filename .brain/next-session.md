# Next session — Sunday demo day, 08:00 start, features freeze 15:00

Order matters — each item depends on the one before it being live.

## 1. FinanceChart
`GET /Reports/ProfitAndLoss?periods=11&timeframe=MONTH` through `xeroFetch`
(scope already granted: `accounting.reports.profitandloss.read`). Recharts
`AreaChart`. **Month | Year** toggles only — **no Day toggle**: P&L has no
daily periods, don't build a control for data that can't exist. If step 5's
optional P&L capture ran, start from `.brain/pnl-shape.json` instead of
re-discovering the response shape live.

## 2. Triage: intake → classify → stage → approvals queue
Uses tonight's seeded prompts (`issue-classifier` tier:everyday,
`action-stager` tier:judgment — `lib/prompt-registry.ts`,
`lib/llm.ts`/`router`) and tonight's `approvals` table (`lib/schema.ts`).
Flow per `docs/triage-v1.md`: manual intake form → `router.completeStructured`
classify → `router.completeStructured` stage → insert into `approvals`
(status `pending`) → queue UI sorted by severity. Every step appends an
`audit.append` (classify and stage already do, via `lib/llm.ts`'s
`llm.completed`; the approvals insert itself should too, parented to the
staging `llm.completed` event id — this is the chain `lib/audit.ts:chain()`
exists to prove).

## 3. Approve → draft-bill wiring
Wires the write path proved in tonight's step 2 (`xeroFetch` POST /Invoices,
guard in `lib/xero.ts`) to an "Approve" action on an `approvals` row where
`kind` implies a bill (e.g. `contact-contractor`/`draft-bill` stager output
with a non-null `accountCode`). On approve: `xeroFetch` the draft (Type
ACCPAY, Status DRAFT explicit — same shape as tonight's proof), then update
the `approvals` row (`status: "approved"`, `decidedBy`, `decidedAt`,
`auditEventId` of a new `approval.decided` audit event parented to the
original staging event). **No auto-approve, no batch-approve** — one human
click per bill, matching the never-moves-money invariant's "human-gated"
half (the guard covers the other half).

## 4. PortfolioList + TopBar stubs
Layout scaffolding only — property list placeholder, top nav bar. Do not
over-build; these are stubs for Sunday's demo flow to have somewhere to live,
not a real property-management feature.

## Freeze
**15:00 — features freeze.** Whatever is demo-able at that point is what
demos. Do not start item 5 (there is no item 5 tonight) or scope-creep any
of 1–4 past their stated shape.

## Carried from tonight (2026-07-04)
- Demo Company auto-resets ~every 28 days — if invoices/contacts look
  different Sunday, that's why, not a regression.
- Tier map is `anthropic/claude-haiku-4.5` (everyday) /
  `anthropic/claude-opus-4.8` (judgment) — both verified live on
  OpenRouter's catalogue. If either 404s Sunday (catalogue churn),
  `verifyTierModels()` in `lib/llm.ts` returns the current `anthropic/*`
  list — pick from that, don't guess.
- Supabase is wired (`lib/supabase.ts`) but has zero tables/callers —
  still not needed by anything built tonight. SQLite via Drizzle
  (`lib/db.ts`) is what tonight's audit/prompts/approvals actually use.
  Don't reach for Supabase Sunday unless a real need for hosted/shared
  Postgres shows up (e.g. multi-device demo access).
