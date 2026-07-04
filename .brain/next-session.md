# Next session

1. **Live OAuth verification** (needs B1+B2 cleared): run README Verification
   steps 3–7 — consent screen, scope chips, four data sections, hot-reload
   persistence, refresh flow.
2. **Forecasting v1** per `docs/forecasting-v1.md` — monthly buckets from
   ACCREC invoices + RECEIVE bank transactions, 3-mo moving average, table
   first.
3. **Reports endpoint spike** — `accounting.reports.read` is already granted;
   evaluate P&L report as an aggregation shortcut vs hand-rolled bucketing.
4. **Triage v1** per `docs/triage-v1.md` after forecasting.
5. **Xero MCP server for the agentic layer** — decided path (2026-07-04):
   run `npx -y @xeroapi/xero-mcp-server@latest` in **bearer-token mode**, fed
   ShortStay's own session access token. The token carries only read-only
   scopes, so the server's write tools (create-payment etc.) fail at Xero even
   if invoked — the read-only invariant travels with the token. No Custom
   Connection / second credential set needed. Read tools include
   list-profit-and-loss / list-trial-balance → feeds the Reports spike (item 3).
   Reference for later multi-account SaaS: XeroAPI/xero-prompt-library
   (multi-tenant OAuth + encrypted token storage patterns).
6. Housekeeping: add ShortStay (and PEA — also missing) to
   `~/.brain/PROJECT_INDEX.md`.
