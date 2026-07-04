@AGENTS.md

## Before any work

Read the following to understand the project:

- `README.md` — project vision, tech stack, key design decisions, setup
- `docs/app-architecture.md` — auth flow, read-only guard, component
  responsibilities, data flows
- `docs/file-structure.md` — repository layout and where code lives
- `docs/tracker.md` — current task priorities and what's completed
- `docs/data-schema.md` — `XeroSession` interface, Xero data types, storage
  layout

## After any change

If you changed architecture, data flows, file structure, the data model, or
added/removed a dependency, **update the matching `docs/` file immediately**.
The task is not complete until the documentation reflects the code.

## On `.brain/`

`.brain/` is session scratchpad — local working memory written during
development. It contains historical rationale (`decisions.md`), transient
notes (`blockers.md`, `next-session.md`), and the project plan (`plan.md`).
It may be out of date or incomplete.

**Do not rely solely on `.brain/` files.** Always cross-reference against
`docs/` (the canonical reference) and the actual codebase. If `.brain/` and
`docs/` disagree, `docs/` wins.
