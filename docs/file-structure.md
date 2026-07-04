# File Structure

Repository layout for **ShortStay** — a Next.js 16 App Router app (React 19.2,
TypeScript 5 strict, Tailwind CSS v4). No separate backend/frontend, no Docker.

## Root Directory

- `package.json` — dependencies and scripts (the source of truth for commands).
- `tsconfig.json` — TypeScript config (strict mode, bundler module resolution).
- `next.config.ts` — Next.js configuration.
- `next-env.d.ts` — Next.js TypeScript declarations (auto-generated).
- `postcss.config.mjs` — PostCSS config (`@tailwindcss/postcss` plugin).
- `eslint.config.mjs` — ESLint config (`next/core-web-vitals` + `next/typescript`).
- `opencode.jsonc` — agentic CLI tool configuration.
- `pnpm-lock.yaml` — pnpm lockfile.
- `pnpm-workspace.yaml` — pnpm workspace overrides.
- `.npmrc` — pnpm config overrides.
- `.env` / `.env.example` — local environment variables (`XERO_CLIENT_ID`,
  `XERO_CLIENT_SECRET`, Supabase keys). `.env` is gitignored.
- `.gitignore` — ignores `.next/`, `node_modules/`, `.env*` (except
  `.env.example`), `.tokens.json`.
- `README.md` — system overview, vision, tech stack, setup.
- `AGENTS.md` — operational guidelines for AI agents (kept at root per
  agentic CLI convention).
- `CLAUDE.md` — agent entry point: references `@AGENTS.md` and documentation
  map.
- `docs/` — project documentation (canonical reference).
- `.brain/` — agent session scratchpad (working memory, may be out of date).
- `public/` — static assets (SVGs, favicon).
- `app/` — Next.js App Router pages and API routes.
- `lib/` — server-only library modules (Node.js runtime).
- `components/` — React components (shared across pages).

## `docs/`

- `app-architecture.md` — auth flow, read-only guard, component
  responsibilities, data flows.
- `data-schema.md` — `XeroSession` interface, Xero API data types, storage
  layout, future Supabase schema.
- `file-structure.md` — this file.
- `tracker.md` — task list and priorities.
- `forecasting-v1.md` — forecasting feature design (v1: monthly revenue trend +
  3-month MA projection).
- `triage-v1.md` — issue triage feature design (v1: manual intake → LLM
  classification → human review queue).

## `app/`

Next.js App Router (file-based routing).

### `app/` — pages

- `layout.tsx` — root layout: Geist fonts, nav header (Dashboard / Forecast /
  Triage), dark-mode aware body.
- `page.tsx` — **main dashboard** (server component, `force-dynamic`). Displays
  connection card + four data sections when connected, or a "Connect your Xero
  organisation" card when disconnected. Decodes JWT to extract granted scopes
  and compute scope mismatch.
- `forecast/page.tsx` — placeholder (describes v1 design).
- `triage/page.tsx` — placeholder (describes v1 design).
- `globals.css` — Tailwind v4 stylesheet with dark-mode custom properties.

### `app/api/` — API routes

- `auth/connect/route.ts` — `GET` — generates OAuth state, sets
  `xero_oauth_state` cookie, redirects to Xero authorize URL.
- `auth/callback/route.ts` — `GET` — validates state cookie, exchanges code for
  tokens, resolves Demo Company tenant, redirects to `/`.
- `auth/refresh/route.ts` — `POST` — calls `refreshSession()` (single-flight),
  redirects to `/`.
- `auth/disconnect/route.ts` — `POST` — clears session via `tokenStore.clear()`,
  redirects to `/`.
- `dev/guard-test/route.ts` — `GET` — verifies the read-only guard by
  attempting a synthetic POST through `xeroFetch`.

## `lib/`

Server-only modules (Node.js runtime — never imported from `"use client"`).

- `env.ts` — environment variable helpers (`xeroCredentials()`,
  `supabaseCredentials()`). Throws if required vars are missing.
- `jwt.ts` — `decodeJwtPayload(token)` — display-only JWT payload decoder
  (no signature verification).
- `oauth.ts` — OAuth2 logic: authorize URL construction, code-for-token
  exchange with HTTP Basic auth, `/connections` tenant resolution (picks Demo
  Company), single-flight token refresh. OAuth POSTs target `identity.xero.com`
  (outside the read-only guard).
- `tokenStore.ts` — in-memory session store on `globalThis` via `TokenStore`
  interface. Survives HMR, dies on restart. Exports `getRefreshLock()` /
  `setRefreshLock()` for single-flight refresh coordination.
- `xero.ts` — **single egress point** for all Xero accounting API traffic.
  `xeroFetch<T>(path, init)` enforces the read-only guard, auto-refreshes on
  expiry/401, handles 429s. Exports typed helpers: `getOrganisation()`,
  `getContacts()`, `getAccRecInvoices()`, `getBankTransactions()`.
- `supabase.ts` — lazy server-only `getSupabase()` singleton using the secret
  key (bypasses RLS). No tables or queries exist yet. Never import from a
  `"use client"` component.

## `components/`

React components (shared across pages, ship to the browser).

- `ConnectionCard.tsx` — session status card: tenant name with green dot, token
  expiry countdown, refresh/disconnect form-actions, granted-scope chips,
  scope-mismatch warning (amber banner).
- `DataSection.tsx` — generic data table: title + subtitle, error state,
  empty state, columnar table with optional row highlighting, collapsible
  "Raw JSON" details section.
- `XeroSignInButton.tsx` — official "Sign In with Xero" branded button
  (edge.xero.com/platform/sso/xero-sso.js) with plain `<a>` fallback.

## `.brain/`

Agent session scratchpad (local working memory, may be out of date).

- `plan.md` — what was shipped, done-points, kill conditions.
- `decisions.md` — historical rationale for architectural decisions.
- `blockers.md` — current open and resolved blockers.
- `next-session.md` — session-specific agenda (may reference `docs/tracker.md`).
