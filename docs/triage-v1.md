# Issue Triage v1 — Design

**Status**: design only (MVP ships placeholder page). Build after forecasting v1.

## Goal
Agentic triage of property issues (maintenance, guest complaints, billing,
listing problems) with a human always in the loop.

## Flow
1. **Intake**: manual form (property, description, reporter). Email/webhook
   intake deferred.
2. **Classify** (LLM call, Claude API):
   ```json
   {
     "severity": "P1 | P2 | P3 | P4",
     "category": "maintenance | guest | billing | listing",
     "suggested_action": "string",
     "confidence": 0.0
   }
   ```
   P1 = guest-safety/uninhabitable, P2 = revenue-affecting, P3 = routine,
   P4 = cosmetic/backlog.
3. **Queue**: human-in-the-loop review list sorted by severity. No
   auto-actioning in v1 — the agent proposes, the agency disposes.

## Storage
SQLite (likely via better-sqlite3 or Drizzle) — local-first, matches the
localhost deployment. Decide at build time.

## Boundaries
- Never touches Xero write scopes; fully decoupled from the accounting
  connection. Billing-category issues may *link* to a Xero invoice (read-only
  lookup) for context.
- v2 candidates: email intake, auto-drafted guest replies (still gated),
  contractor dispatch suggestions, Xero MCP server as the data plane for the
  agent instead of bespoke API calls.
