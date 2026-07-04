<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent Guidelines

Operational guidelines for AI agents working in the **ShortStay** repository.

## Core Philosophy

- **Never-moves-money is paramount.** ShortStay holds exactly one Xero write
  scope (`accounting.invoices`) and the single egress point (`lib/xero.ts`)
  hard-throws on any request except GET or a `POST /Invoices` whose parsed
  body has `Type: "ACCPAY"` and `Status: "DRAFT"`. Never bypass, weaken, or
  route around this guard — not even "for testing". The OAuth endpoints
  target `identity.xero.com` — a different host — and are intentionally
  outside the guard's scope.
- **Simplicity over cleverness.** No Xero SDK, no heavy state management, no
  unnecessary abstractions. The codebase is deliberately small — keep it that
  way.
- **No unnecessary dependencies.** Justify every addition. The current surface
  is Next.js + Tailwind + Drizzle/better-sqlite3 + Supabase (client only,
  unused) + OpenRouter. Do not pull in a library without a clear,
  proportionate reason.
- **Documentation stays current.** If you change architecture, data flow, file
  structure, or the data model, update the matching `docs/` file immediately.
  `docs/` is canonical — `.brain/` is session scratch.

## Behavioral Rules

1. **Context first.** Read `README.md` (overview) and `docs/app-architecture.md`
   (logic + data flows) before acting.
2. **No assumptions.** Do not assume a library is present. Check `package.json`.
3. **Command discovery.** Never guess build, test, or lint commands. Read
   `package.json` scripts for the exact commands.
4. **Safety.** Explain any destructive operation before running it. Clear
   separation: `lib/{env,oauth,tokenStore,xero}.ts` is server-only (Node.js
   runtime); components and pages ship to the browser — don't leak tokens.
5. **Respect the xeroFetch seam.** All Xero accounting API traffic goes through
   `xeroFetch` in `lib/xero.ts`. Never call `api.xero.com/api.xro` directly —
   use the typed helpers (`getOrganisation`, `getContacts`, etc.) or add a new
   one.
6. **Style.** Follow existing patterns: TypeScript strict mode, no comments
   unless truly necessary for a non-obvious invariant, server components where
   possible, Tailwind utility classes.
7. **Never render or log tokens.** The dashboard decodes the access-token JWT
   locally to display the granted `scope` claim — that's the sole exception.
   No other token data should appear in UI, logs, or error messages.

## The Agent Workflow (Standard Operating Procedure)

Follow this sequence; do not skip steps.

1. **Contextualize (Understand)**
   - Read the prompt carefully.
   - Consult `docs/file-structure.md` for where code and docs live.
   - If the task touches auth, the never-moves-money guard, or data fetching,
     read `docs/app-architecture.md` first.
   - Use search tools and read existing files to understand the current
     implementation.

2. **Design & Contract (Plan)**
   - For a data or flow change, identify the contract first: `XeroSession`
     shape, `Xero*` interfaces in `lib/xero.ts`, or a future Supabase schema.
   - Document the intended change before writing code.

3. **Implement (Execute)**
   - Write the code. Keep functions small; mimic surrounding style.
   - Route all Xero API traffic through `xeroFetch` in `lib/xero.ts`.
   - Keep server-only code in `lib/` or `app/api/`; never import `lib/supabase.ts`
     from a `"use client"` component.
   - Auth routes (`app/api/auth/*`) use `redirect()` — they post to
     `identity.xero.com`, which is outside the read-only guard.

4. **Verify (Check)**
   - Look up exact commands in `package.json`. Do not guess.
   - Run `pnpm lint` and `pnpm build`. Fix any errors.
   - Confirm the never-moves-money guard still passes:
     `curl http://localhost:3000/api/dev/guard-test` should return
     `{"allPass":true,...}` with all four boundary cases passing.

5. **Document (Wrap-up)**
   - If you changed architecture, data flows, file structure, or the data model,
     update the matching `docs/` file immediately.
   - `docs/` is the canonical reference — it must not fall out of date.

## Project-Specific Invariants

- **Never-moves-money guard is inviolable.** `xeroFetch` throws
  `NeverMovesMoneyViolation` on anything except GET or a `POST /Invoices`
  with parsed body `Type: "ACCPAY"` + `Status: "DRAFT"`. This runs before
  token or network logic — it is testable pre-auth. The OAuth token endpoint
  (`identity.xero.com`) and connections endpoint are intentionally outside
  the guard (different host).
- **Single-flight refresh lock.** Xero refresh tokens rotate and are single-use.
  Concurrent refreshes would burn the token. `lib/tokenStore.ts` exposes
  `getRefreshLock`/`setRefreshLock`; `lib/oauth.ts` uses them. Never call
  `refreshSession` without understanding this.
- **Demo Company only.** Tenant resolution in `exchangeCode()` picks the Demo
  Company (or first available org as fallback). Multi-org support is deferred.
  Don't add org-switching logic unless the task explicitly calls for it.
- **In-memory tokens, no persistence.** Sessions live on `globalThis` via
  `TokenStore`. Survives HMR, dies on restart. Don't persist tokens — restart =
  re-auth is by design. The `TokenStore` interface is the seam if persistence
  is ever needed.
- **`force-dynamic` on the dashboard.** `app/page.tsx` reads per-request from the
  in-process token store — it must never be cached. Any similar page should
  export `dynamic = "force-dynamic"`.
- **Scope-diff covers `accounting.*` only.** Identity scopes (openid, profile,
  email, offline_access) don't appear in the access token's scope claim. The
  mismatch check on the dashboard filters to `accounting.*` scopes to avoid
  false warnings.
- **Supabase is server-only.** `lib/supabase.ts` uses the secret key (bypasses
  RLS). Never import it from a `"use client"` component.

## Documentation Map

- **System overview + vision**: `README.md`
- **Logic, auth flow, data flows**: `docs/app-architecture.md`
- **Data model + interfaces**: `docs/data-schema.md`
- **Repository layout**: `docs/file-structure.md`
- **Feature designs**: `docs/forecasting-v1.md`, `docs/triage-v1.md`
- **Task list + priorities**: `docs/tracker.md`

If code and docs disagree, fix the docs or flag the discrepancy.
