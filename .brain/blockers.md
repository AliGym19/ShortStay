# Blockers

## Open
- **B2 — Demo Company must be active** in Ali's Xero account (my.xero.com org
  switcher) or it won't appear on the consent screen. Note: Demo Company
  auto-resets ~every 28 days (harmless for MVP, data just changes).
- **B3 — Claude Code's shell cannot run processes with cwd under `~/Desktop`**
  (macOS TCC: file access by path works, `getcwd` fails → node/pnpm crash with
  `EPERM uv_cwd`). Dev-server verification was done from the scratchpad build
  dir. Fix: grant the terminal/app Desktop-folder (or Full Disk) access in
  System Settings → Privacy & Security, then restart it. Ali's own terminal is
  unaffected.

## Resolved
- **B1 — Xero app credentials** (resolved 2026-07-04): `.env` populated,
  confirmed gitignored. Secret was pasted in a Claude chat to get here —
  regenerate it at developer.xero.com after testing. Still verify the
  redirect URI `http://localhost:3000/api/auth/callback` is registered on
  the app (part of B2's live test).
