"use client";

import React, { useMemo, useState } from "react";
import { logout } from "@/app/actions";
import type { Role } from "@/lib/permissions";

/* ============================================================================
   ShortStay — Xero back office for Booking.com short-let agencies
   Ported from the single-file prototype (spec §8). Reads + drafts only;
   never moves money.
   - Receipt coding via POST /api/code-receipt (deterministic fallback offline)
   - Per-landlord P&L "money bridge" (gross − commission − agency fee − costs)
   - Append-only audit log with no payment event type
   - OAuth scope exhibit: the money boundary, made legible
   ============================================================================ */

/* ---------------------------------------------------------------- styles --- */
const Style = () => (
  <style>{`
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;1,400&family=Space+Mono:wght@400;700&display=swap');

  /* HLB Intraconnect-style palette: white primary, deep blue accents.
     Semantic data colours (amber/teal/clay deductions, sage allow) kept —
     only brand surfaces and accents moved to blue. */
  :root{
    --ink:#0B1F4B; --pine:#1B3F9C; --pine2:#2B55C4; --pine-soft:#E8EEFB;
    --paper:#F7F9FC; --surface:#FFFFFF; --sand:#EEF2F8; --line:#D9E2F0;
    --txt:#16233D; --muted:#5A6B85; --faint:#8A99B5;
    --amber:#B8781E; --amber-soft:#F5EBD6;
    --teal:#3C6E63; --teal-soft:#E4EEEB;
    --clay:#9E4A34; --clay-soft:#F2E2DC;
    --sage:#3E7D5E; --sage-soft:#E4F0E9;
    --shadow:0 1px 2px rgba(11,31,75,.05), 0 8px 24px -14px rgba(11,31,75,.18);
    --radius:14px;
  }
  *{box-sizing:border-box}
  .ss-root{
    font-family:'Instrument Sans',system-ui,sans-serif;
    color:var(--txt); background:var(--paper);
    min-height:100vh; -webkit-font-smoothing:antialiased;
    display:flex; letter-spacing:.005em;
  }
  .ss-root h1,.ss-root h2,.ss-root h3,.ss-root .disp{font-family:'Space Grotesk',sans-serif;}
  .mono{font-family:'Space Mono',monospace; font-variant-numeric:tabular-nums;}
  .num{font-family:'Space Mono',monospace; font-variant-numeric:tabular-nums; letter-spacing:-.02em;}
  button{font-family:inherit; cursor:pointer}
  ::selection{background:#D6E2F8}
  a{color:inherit}

  /* ---- sidebar ---- */
  .side{width:238px; flex:0 0 238px; background:var(--ink); color:#DDE4F2;
    display:flex; flex-direction:column; padding:22px 16px; position:sticky; top:0; height:100vh;}
  .brand{display:flex; align-items:center; gap:10px; padding:2px 6px 18px;}
  .brand-mark{width:30px;height:30px;flex:0 0 30px}
  .brand-name{font-family:'Space Grotesk';font-weight:700;font-size:19px;color:#fff;letter-spacing:-.01em}
  .brand-sub{font-size:11px;color:#8FA3CB;margin-top:1px;letter-spacing:.02em}
  .nav{display:flex;flex-direction:column;gap:2px;margin-top:6px}
  .nav-b{display:flex;align-items:center;gap:11px;width:100%;text-align:left;background:none;border:none;
    color:#AEBEDF;padding:10px 12px;border-radius:9px;font-size:14.5px;font-weight:500;transition:.15s}
  .nav-b:hover{background:rgba(255,255,255,.05);color:#EAF0FB}
  .nav-b.on{background:var(--pine2);color:#fff}
  .ico{width:17px;height:17px;flex:0 0 17px}
  .nav-b .ico{opacity:.9}
  .nav-b .pip{margin-left:auto;background:var(--amber);color:#231a08;font-size:11px;font-weight:700;
    border-radius:20px;padding:1px 7px;font-family:'Space Mono'}
  .side-spacer{flex:1}
  .seal{background:linear-gradient(180deg,#122A5E,#0E2350);border:1px solid #26407F;border-radius:12px;
    padding:13px 13px 12px;}
  .seal-top{display:flex;align-items:center;gap:8px;font-family:'Space Grotesk';font-weight:600;font-size:12.5px;color:#EAF0FB}
  .seal-dot{width:7px;height:7px;border-radius:50%;background:var(--sage);box-shadow:0 0 0 4px rgba(62,125,94,.18)}
  .seal-txt{font-size:11.5px;line-height:1.45;color:#93A5C8;margin-top:7px}
  .seal-txt b{color:#CFDCF2;font-weight:600}

  /* ---- main ---- */
  .main{flex:1;min-width:0;padding:30px 40px 64px;max-width:1380px}
  .head{margin-bottom:24px}
  .eyebrow{font-size:11.5px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--pine2);margin-bottom:8px}
  .h-title{font-size:29px;font-weight:600;letter-spacing:-.02em;line-height:1.08}
  .h-sub{color:var(--muted);font-size:15px;margin-top:8px;max-width:64ch;line-height:1.5}

  .card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow)}
  .pad{padding:20px 22px}
  .row{display:flex;gap:18px}
  .grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}

  .kpi{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:18px 20px 17px;box-shadow:var(--shadow);position:relative;overflow:hidden}
  .kpi .lab{font-size:12.5px;color:var(--muted);font-weight:500;display:flex;align-items:center;gap:7px}
  .kpi .big{font-size:30px;font-weight:700;letter-spacing:-.03em;margin-top:9px;color:var(--ink)}
  .kpi .foot{font-size:12px;color:var(--faint);margin-top:5px}
  .kpi .stripe{position:absolute;left:0;top:0;bottom:0;width:3px}
  .kpi .anim{position:absolute;right:18px;top:16px;width:56px;height:44px}

  /* KPI micro-animations — muted white/blue/green/red, CSS-driven */
  .a-bars{display:flex;align-items:flex-end;gap:5px;height:100%;justify-content:flex-end}
  .a-bars span{width:8px;border-radius:3px;background:#2B55C4;opacity:.75;animation:barrise 2.6s ease-in-out infinite}
  .a-bars span:nth-child(1){height:40%;animation-delay:0s}
  .a-bars span:nth-child(2){height:65%;animation-delay:.3s}
  .a-bars span:nth-child(3){height:90%;animation-delay:.6s}
  @keyframes barrise{0%,100%{transform:scaleY(.75)}50%{transform:scaleY(1)}}
  .a-bars span{transform-origin:bottom}

  .a-spark{width:100%;height:100%}
  .a-spark path{stroke:#3E7D5E;stroke-width:2.4;fill:none;stroke-linecap:round;stroke-linejoin:round;
    stroke-dasharray:90;stroke-dashoffset:90;animation:sparkdraw 3.2s ease-out infinite}
  .a-spark circle{fill:#3E7D5E;opacity:0;animation:sparkdot 3.2s ease-out infinite}
  @keyframes sparkdraw{0%{stroke-dashoffset:90}45%,85%{stroke-dashoffset:0}100%{stroke-dashoffset:0;opacity:0}}
  @keyframes sparkdot{0%,40%{opacity:0}50%,85%{opacity:.9}100%{opacity:0}}

  .a-gate{position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:flex-end;padding-right:10px}
  .a-gate .core{width:12px;height:12px;border-radius:50%;background:#9E4A34;opacity:.85}
  .a-gate .ring{position:absolute;right:4px;width:24px;height:24px;border-radius:50%;border:2px solid #9E4A34;
    animation:gatepulse 2.2s ease-out infinite}
  @keyframes gatepulse{0%{transform:scale(.5);opacity:.7}80%{transform:scale(1.5);opacity:0}100%{opacity:0}}

  .tag{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;border-radius:6px;padding:2px 7px;letter-spacing:.01em;white-space:nowrap}
  .tag.src{background:var(--sand);color:#5c5a48;font-family:'Space Mono';font-weight:400;font-size:10.5px}
  .tag.draft{background:var(--amber-soft);color:#8a5a10}
  .tag.approved{background:var(--sage-soft);color:#2c5a41}
  .tag.read{background:var(--teal-soft);color:#2c5148}
  .tag.hold{background:var(--amber-soft);color:#8a5a10}

  .sect-t{font-size:13px;font-weight:600;letter-spacing:.02em;color:var(--ink);font-family:'Space Grotesk';display:flex;align-items:center;gap:9px}
  .divider{height:1px;background:var(--line);margin:0}

  table.led{width:100%;border-collapse:collapse;font-size:13.5px}
  table.led th{text-align:left;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--faint);padding:9px 12px;border-bottom:1px solid var(--line)}
  table.led td{padding:11px 12px;border-bottom:1px solid #F0EBDE;vertical-align:middle}
  table.led tr:last-child td{border-bottom:none}
  table.led td.r,table.led th.r{text-align:right}
  .prop-name{font-weight:600;color:var(--ink)}
  .subtle{color:var(--muted);font-size:12.5px}

  .btn{border:1px solid var(--pine);background:var(--pine);color:#fff;font-weight:600;font-size:14px;
    padding:10px 18px;border-radius:10px;transition:.15s;display:inline-flex;align-items:center;gap:8px}
  .btn:hover:not(:disabled){background:var(--pine2)}
  .btn:disabled{opacity:.42;cursor:not-allowed}
  .btn.ghost{background:transparent;color:var(--pine);border-color:var(--line)}
  .btn.ghost:hover:not(:disabled){border-color:var(--pine);background:var(--pine-soft)}
  .btn.sm{padding:7px 13px;font-size:13px;border-radius:9px}

  .chip{border:1px solid var(--line);background:var(--surface);border-radius:20px;padding:6px 13px;font-size:13px;font-weight:500;color:var(--muted);transition:.15s}
  .chip.on{background:var(--ink);color:#fff;border-color:var(--ink)}
  .chip:hover:not(.on){border-color:var(--pine)}

  /* ---- capture ---- */
  .receipt{background:#FBFCFE;border:1px dashed var(--line);border-radius:12px;padding:0;overflow:hidden}
  .receipt textarea{width:100%;border:none;background:transparent;resize:vertical;min-height:210px;
    font-family:'Space Mono';font-size:12.5px;line-height:1.7;color:#2C3A55;padding:18px 18px;outline:none}
  .field{display:flex;justify-content:space-between;align-items:baseline;padding:11px 2px;border-bottom:1px solid #F0EBDE;opacity:0;transform:translateY(4px);animation:fade .4s forwards}
  .field .fl{font-size:12.5px;color:var(--muted);font-weight:500}
  .field .fv{font-family:'Space Mono';font-size:13.5px;color:var(--ink);font-weight:700}
  @keyframes fade{to{opacity:1;transform:none}}
  .spinner{width:15px;height:15px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
  .spinner.dk{border:2px solid var(--sand);border-top-color:var(--pine)}
  @keyframes spin{to{transform:rotate(360deg)}}

  /* ---- bridge ---- */
  .bridge-track{display:flex;height:52px;border-radius:9px;overflow:hidden;border:1px solid var(--line);background:var(--sand)}
  .bridge-seg{transition:flex-basis .7s cubic-bezier(.2,.7,.2,1),width .7s;display:flex;align-items:center;justify-content:center;position:relative;min-width:2px}
  .bridge-seg span{font-family:'Space Mono';font-size:11px;font-weight:700;color:#fff;padding:0 6px;white-space:nowrap;text-shadow:0 1px 1px rgba(0,0,0,.18)}
  .legend{display:flex;flex-wrap:wrap;gap:14px 22px;margin-top:14px}
  .leg{display:flex;align-items:center;gap:8px;font-size:12.5px}
  .leg .sw{width:11px;height:11px;border-radius:3px;flex:0 0 11px}
  .leg .lv{font-family:'Space Mono';font-weight:700;color:var(--ink)}
  .leg .ll{color:var(--muted)}

  .gate{border-radius:12px;border:1px solid var(--line);overflow:hidden}
  .gate-h{padding:15px 18px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}
  .guard-line{display:flex;align-items:center;gap:10px;font-size:13px;padding:8px 18px;border-top:1px solid #F0EBDE;flex-wrap:wrap}
  .guard-line .gd{width:8px;height:8px;border-radius:50%;flex:0 0 8px}
  .guard-line .gn{font-family:'Space Mono';font-size:12px;color:var(--muted)}
  .guard-line .gr{margin-left:auto;font-size:12.5px;color:var(--muted)}

  /* ---- statements two-column: gate fills the right rail ---- */
  .stmt-grid{display:grid;grid-template-columns:minmax(0,1fr) 350px;gap:16px;align-items:start}
  .stmt-side{position:sticky;top:20px}
  .stmt-side .guard-line .gr{margin-left:18px;flex-basis:100%}
  @media (max-width:1100px){.stmt-grid{grid-template-columns:1fr}.stmt-side{position:static}}

  /* ---- property thumbnail + details ---- */
  .prop-head{display:flex;align-items:center;gap:12px}
  .prop-thumb{width:64px;height:44px;border-radius:8px;flex:0 0 64px;border:1px solid var(--line);
    cursor:pointer;padding:0;background:none;overflow:hidden;transition:.15s}
  .prop-thumb:hover{transform:translateY(-1px);box-shadow:var(--shadow)}
  .prop-thumb svg{width:100%;height:100%;display:block}
  .prop-details{border-top:1px dashed var(--line);padding:12px 22px;display:grid;
    grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px 20px;background:#FBFCFE}
  .prop-details .pd{font-size:12.5px}
  .prop-details .pd .pdl{color:var(--faint);font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;font-weight:600;margin-bottom:2px}
  .prop-details .pd .pdv{color:var(--txt)}

  /* ---- audit ---- */
  .evt{display:grid;grid-template-columns:150px 1fr auto;gap:14px;align-items:center;padding:10px 4px;border-bottom:1px solid #F0EBDE;position:relative}
  .evt .et{font-family:'Space Mono';font-size:12px;font-weight:700;color:var(--pine)}
  .evt .em{font-size:13px;color:var(--txt)}
  .evt .emeta{font-size:11.5px;color:var(--faint);margin-top:2px;font-family:'Space Mono'}
  .evt .ets{font-family:'Space Mono';font-size:11px;color:var(--faint);white-space:nowrap}
  .scope{display:flex;align-items:center;gap:9px;padding:8px 11px;border-radius:8px;font-size:12.5px;margin-bottom:6px;border:1px solid var(--line)}
  .scope.grant{background:var(--surface)}
  .scope.omit{background:#FBF6F4;border-color:var(--clay-soft)}
  .scope .sc-name{font-family:'Space Mono';font-size:12px;font-weight:700}
  .scope.omit .sc-name{color:var(--clay);text-decoration:line-through;text-decoration-thickness:1.5px}
  .scope .sc-why{margin-left:auto;color:var(--muted);font-size:11.5px;text-align:right}

  .callout{background:var(--pine-soft);border:1px solid #C7D6F4;border-radius:12px;padding:15px 18px;font-size:13.5px;line-height:1.55;color:#1C2C52}
  .callout b{font-weight:600}

  /* ---- policy accordion ---- */
  .policy details{border:1px solid var(--line);border-radius:10px;margin-bottom:8px;background:var(--surface)}
  .policy summary{cursor:pointer;padding:11px 14px;font-weight:600;font-size:13px;font-family:'Space Grotesk';color:var(--ink);list-style:none;display:flex;align-items:center;gap:8px}
  .policy summary::before{content:"+";font-family:'Space Mono';color:var(--pine2);font-weight:700}
  .policy details[open] summary::before{content:"−"}
  .policy .pbody{padding:2px 14px 13px;font-size:12.5px;line-height:1.6;color:var(--muted)}
  .policy .pbody b{color:var(--txt);font-weight:600}

  /* ---- sidebar logout ---- */
  .logout-b{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;margin-top:10px;
    background:var(--pine2);color:#fff;border:none;border-radius:9px;padding:10px 12px;
    font-size:14px;font-weight:600;transition:.15s}
  .logout-b:hover{background:var(--pine)}

  /* ---- agents timeline ---- */
  .wf{border-left:2px solid var(--line);margin-left:8px;padding-left:18px;position:relative}
  .wf-step{position:relative;padding:7px 0 9px}
  .wf-step::before{content:"";position:absolute;left:-24px;top:12px;width:9px;height:9px;border-radius:50%;
    background:#2B55C4;border:2px solid var(--surface);box-shadow:0 0 0 1.5px #2B55C4}
  .wf-step.done::before{background:#3E7D5E;box-shadow:0 0 0 1.5px #3E7D5E}
  .wf-step.gated::before{background:#fff;box-shadow:0 0 0 1.5px #9E4A34}
  .wf-step .ws-t{font-size:13px;color:var(--txt);font-weight:500}
  .wf-step .ws-m{font-size:11.5px;color:var(--faint);font-family:'Space Mono';margin-top:2px}
  .wf-gate-chip{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-weight:700;border-radius:5px;
    padding:1.5px 7px;background:var(--clay-soft);color:#7d3a28;margin-left:8px;letter-spacing:.03em}

  .topbar-m{display:none}
  @media (max-width:860px){
    .ss-root{flex-direction:column}
    .side{width:100%;height:auto;position:static;flex-direction:row;align-items:center;padding:12px 16px;flex-wrap:wrap;gap:8px}
    .brand{padding:0;flex:1}
    .brand-sub{display:none}
    .nav{flex-direction:row;flex-wrap:wrap;width:100%;order:3}
    .nav-b{width:auto}
    .side-spacer,.seal{display:none}
    .main{padding:22px 18px 60px}
    .grid3,.grid2{grid-template-columns:1fr}
    .h-title{font-size:24px}
    .evt{grid-template-columns:1fr}
  }
  @media (prefers-reduced-motion: reduce){
    *{animation-duration:.001s !important;transition-duration:.001s !important}
  }
  .focusable:focus-visible{outline:2.5px solid var(--pine2);outline-offset:2px;border-radius:8px}
  `}</style>
);

/* ---------------------------------------------------------------- types ---- */
interface Account { code: string; name: string }
interface Landlord { id: string; name: string; contactId: string; ref: string }
interface Property { id: string; name: string; area: string; landlordId: string; commission: number; fee: number }
interface Booking { id: string; propertyId: string; guest: string; nights: number; gross: number; checkIn: string }
interface CodedReceipt {
  supplier: string; date: string; grossInclVat: number; vatRate?: number;
  accountCode: string; propertyId: string; confidence?: number; note?: string;
  via?: string;
}
interface CodedFields {
  supplier: string; date: string; gross: number; vat: number;
  code: string; accName: string; propId: string; propName: string;
  confidence: number; note?: string;
}
type TabKey =
  | "overview"
  | "capture"
  | "statements"
  | "reconcile"
  | "agents"
  | "ledger"
  | "report"
  | "fieldreports"
  | "approvals"
  | "contacts";

// Which tabs each persona sees — mirrors lib/permissions capabilities.
const ROLE_TABS: Record<Role, readonly TabKey[]> = {
  cleaner: ["report"],
  operations: ["overview", "capture", "fieldreports", "contacts", "agents"],
  accountant: ["overview", "statements", "approvals", "contacts", "reconcile", "agents", "ledger"],
};

/* ------------------------------------------------------- API contracts ---- */
interface ApiStatementLine {
  kind: "revenue" | "commission" | "fee" | "cost" | "owed";
  propertyId: string;
  description: string;
  amountPence: number;
  sourceType: string;
  sourceId: string;
  billStatus?: string;
  date?: string;
}
interface ApiStatementTotals {
  grossPence: number;
  commissionPence: number;
  feePence: number;
  costsPence: number;
  owedPence: number;
}
interface ApiStatement {
  statementId: string;
  landlordId: string;
  landlordName: string;
  month: string;
  status: string;
  lines: ApiStatementLine[];
  totals: ApiStatementTotals;
  xeroConnected: boolean;
}
interface ApiGuardResult {
  name: string;
  decision: "allow" | "pause" | "escalate";
  reason: string;
}
interface ApiApproveResponse {
  approved: boolean;
  moved: boolean;
  status: string;
  decision?: string;
  guards: ApiGuardResult[];
  note?: string;
  approvedEventId?: string;
}
interface ApiAuditEvent {
  id: string;
  eventType: string;
  actor: string;
  subjectType: string;
  subjectId: string;
  payload: unknown;
  parentEventId: string | null;
  createdAt: string;
}
interface ApiDraftBillResult {
  ok: boolean;
  invoiceId?: string;
  needsContact?: boolean;
  warning?: string;
  error?: string;
  auditEventId?: string;
}
interface ApiXeroStatus {
  connected: boolean;
  tenantName?: string;
  tenantId?: string;
  expiresAt?: number;
  grantedScopes?: string[];
  requestedScopes?: string[];
  missingScopes?: string[];
}

const LANDLORD_IDS = ["L1", "L2"] as const;
const penceToMoney = (p: number) => money(p / 100);

const fmtTs = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

function summarisePayload(e: ApiAuditEvent): string {
  const p = e.payload as Record<string, unknown> | null;
  if (!p || typeof p !== "object") return "";
  if (typeof p.supplier === "string" && typeof p.grossInclVat === "number") {
    return `${p.supplier} · ${money(p.grossInclVat)}${p.accountCode ? ` → ${p.accountCode}` : ""}`;
  }
  if (typeof p.preview === "string") return p.preview.split("\n")[0];
  if (p.totals && typeof p.totals === "object") {
    const t = p.totals as { owedPence?: number };
    return typeof t.owedPence === "number" ? `owed ${penceToMoney(t.owedPence)}` : "totals recorded";
  }
  if (typeof p.decision === "string") return `decision: ${p.decision}`;
  if (typeof p.name === "string" && typeof p.version === "number") {
    return `${p.name}@v${p.version}`;
  }
  if (typeof p.note === "string") return p.note;
  const s = JSON.stringify(p);
  return s.length > 80 ? s.slice(0, 77) + "…" : s;
}

/* ---------------------------------------------------------------- data ----- */
const GBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2 });
const money = (n: number) => GBP.format(n);
const round2 = (n: number) => Math.round(n * 100) / 100;

const ACCOUNTS: Account[] = [
  { code: "408", name: "Cleaning" },
  { code: "473", name: "Repairs & Maintenance" },
  { code: "445", name: "Light, Power, Heating" },
  { code: "429", name: "General Expenses" },
];
const accByCode = (c: string): Account => ACCOUNTS.find((a) => a.code === c) || ACCOUNTS[3];

const LANDLORDS: Landlord[] = [
  { id: "L1", name: "Amara Okafor", contactId: "c-8f21", ref: "LL-AMARA" },
  { id: "L2", name: "The Whitfield Trust", contactId: "c-3b90", ref: "LL-WHITF" },
];
const PROPERTIES: Property[] = [
  { id: "P1", name: "Dockside Loft", area: "Wapping", landlordId: "L1", commission: 0.15, fee: 0.12 },
  { id: "P2", name: "Gasholder Studio", area: "King's Cross", landlordId: "L1", commission: 0.15, fee: 0.12 },
  { id: "P3", name: "Tin Quarter Mews", area: "Digbeth", landlordId: "L2", commission: 0.15, fee: 0.12 },
];
const propById = (id: string): Property => PROPERTIES.find((p) => p.id === id) || PROPERTIES[0];

const BOOKINGS: Booking[] = [
  { id: "bk-201", propertyId: "P1", guest: "M. Ellery", nights: 3, gross: 980, checkIn: "2026-06-02" },
  { id: "bk-207", propertyId: "P1", guest: "R. Nkemdirim", nights: 4, gross: 1240, checkIn: "2026-06-08" },
  { id: "bk-214", propertyId: "P1", guest: "S. Prakash", nights: 2, gross: 760, checkIn: "2026-06-15" },
  { id: "bk-219", propertyId: "P1", guest: "J. Alvarsson", nights: 2, gross: 620, checkIn: "2026-06-21" },
  { id: "bk-226", propertyId: "P1", guest: "K. Duval", nights: 4, gross: 1220, checkIn: "2026-06-26" },
  { id: "bk-231", propertyId: "P2", guest: "T. Oyelaran", nights: 2, gross: 640, checkIn: "2026-06-05" },
  { id: "bk-238", propertyId: "P2", guest: "L. Behrens", nights: 3, gross: 880, checkIn: "2026-06-11" },
  { id: "bk-244", propertyId: "P2", guest: "H. Costa", nights: 2, gross: 720, checkIn: "2026-06-18" },
  { id: "bk-250", propertyId: "P2", guest: "F. Marchetti", nights: 3, gross: 910, checkIn: "2026-06-24" },
  { id: "bk-261", propertyId: "P3", guest: "D. Whitcombe", nights: 2, gross: 560, checkIn: "2026-06-07" },
  { id: "bk-268", propertyId: "P3", guest: "A. Serrano", nights: 3, gross: 740, checkIn: "2026-06-14" },
  { id: "bk-274", propertyId: "P3", guest: "V. Ilić", nights: 2, gross: 700, checkIn: "2026-06-20" },
  { id: "bk-280", propertyId: "P3", guest: "N. Palmer", nights: 2, gross: 480, checkIn: "2026-06-25" },
];

// the receipt sitting in the inbox, waiting to be coded live
const INBOX_RECEIPTS: Record<string, string> = {
  plumbing: `RAPID FLOW PLUMBING LTD
VAT Reg 284 9912 04
Invoice #RF-20614
Date: 24 Jun 2026

Emergency callout — Dockside Loft, Wapping
Cleared blocked soil stack, replaced trap.
Labour + parts.

Total (inc. VAT):  £240.00`,
  cleaning: `SPARKLE TURNAROUNDS
Job sheet #ST-7742
3 Jun 2026

Same-day changeover clean
Property: Gasholder Studio, King's Cross
2 bed / 1 bath, linen change included

Amount due (inc. VAT):  £85.00`,
  linen: `THE LINEN ROOMS
Order LR-5590 · 11 Jun 2026

Restock — bath towels x8, bedding set x2
Deliver to: Tin Quarter Mews, Digbeth

Total:  £64.00  (VAT included)`,
};

// Property registry detail — shown when a property thumbnail is clicked.
interface PropertyInfo {
  address: string;
  landlord: string;
  contact: string;
  occupied: boolean;
  occupancy: string;
  nextChangeover: string;
}
const PROPERTY_INFO: Record<string, PropertyInfo> = {
  P1: {
    address: "14 Dockside Wharf, Wapping, London E1W 3TD",
    landlord: "Amara Okafor",
    contact: "amara.okafor@mail.com · 07700 900412",
    occupied: true,
    occupancy: "Occupied · K. Duval until 30 Jun",
    nextChangeover: "30 Jun · Sparkle Turnarounds booked",
  },
  P2: {
    address: "3 Gasholder Place, King's Cross, London N1C 4AB",
    landlord: "Amara Okafor",
    contact: "amara.okafor@mail.com · 07700 900412",
    occupied: false,
    occupancy: "Vacant · next check-in 2 Jul",
    nextChangeover: "1 Jul · deep clean scheduled",
  },
  P3: {
    address: "27 Tin Quarter Mews, Digbeth, Birmingham B9 4AA",
    landlord: "The Whitfield Trust",
    contact: "lettings@whitfieldtrust.org · 0121 496 0203",
    occupied: true,
    occupancy: "Occupied · N. Palmer until 27 Jun",
    nextChangeover: "27 Jun · BrightKey Cleaning booked",
  },
};

// Placeholder visual per property — abstract building silhouettes, hue-keyed.
const PROP_THUMB_HUES: Record<string, [string, string]> = {
  P1: ["#2B55C4", "#1B3F9C"],
  P2: ["#3C6E63", "#2C5148"],
  P3: ["#9E4A34", "#7D3A28"],
};

function PropThumb({ pid }: { pid: string }) {
  const [light, dark] = PROP_THUMB_HUES[pid] ?? PROP_THUMB_HUES.P1;
  return (
    <svg viewBox="0 0 64 44" aria-hidden>
      <defs>
        <linearGradient id={`sky-${pid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={light} stopOpacity=".16" />
          <stop offset="1" stopColor={light} stopOpacity=".05" />
        </linearGradient>
      </defs>
      <rect width="64" height="44" fill={`url(#sky-${pid})`} />
      <rect x="8" y="16" width="14" height="28" rx="1.5" fill={light} opacity=".8" />
      <rect x="26" y="8" width="16" height="36" rx="1.5" fill={dark} opacity=".85" />
      <rect x="46" y="22" width="11" height="22" rx="1.5" fill={light} opacity=".55" />
      {[0, 1, 2].map((r) => (
        <g key={r} fill="#fff" opacity=".85">
          <rect x={29} y={13 + r * 8} width="3.4" height="4" rx=".6" />
          <rect x={35} y={13 + r * 8} width="3.4" height="4" rx=".6" />
        </g>
      ))}
    </svg>
  );
}

const SCOPES_GRANTED = [
  { s: "accounting.contacts.read", why: "resolve landlord / supplier" },
  { s: "accounting.settings.read", why: "read chart of accounts" },
  { s: "accounting.banktransactions.read", why: "read booking payouts in" },
  { s: "accounting.invoices.read", why: "read back drafted bills" },
  { s: "accounting.invoices", why: "the ONE write — draft a bill" },
];
const SCOPES_OMITTED = [
  { s: "accounting.payments", why: "would mark bills paid" },
  { s: "accounting.banktransactions (write)", why: "would move / transfer cash" },
  { s: "paymentservices", why: "payment rails" },
  { s: "accounting.transactions", why: "legacy — bundles payments" },
];

/* ------------------------------------------------------------ tiny icons -- */
const I: Record<string, React.ReactElement> = {
  overview: <path d="M3 3h7v7H3zM14 3h7v4h-7zM14 10h7v11h-7zM3 13h7v8H3z" />,
  capture: <path d="M4 4h16v13H4zM8 21h8M9 9h6M9 12h4" />,
  statements: <path d="M6 2h9l5 5v15H6zM15 2v5h5M9 12h7M9 16h7M9 8h3" />,
  reconcile: <path d="M3 7h13l-3-3M21 17H8l3 3M4 7v3M20 17v-3" />,
  agents: <path d="M9 3v3M15 3v3M5 6h14v13H5zM9 11h.01M15 11h.01M9 15.5h6" />,
  ledger: <path d="M4 3h13a2 2 0 0 1 2 2v16l-3-2-2 2-2-2-2 2-2-2-3 2V5a2 2 0 0 1 2-2zM8 8h8M8 12h6" />,
};
const Ico = ({ d, cls = "ico" }: { d: React.ReactElement; cls?: string }) => (
  <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);
const Mark = () => (
  <svg className="brand-mark" viewBox="0 0 40 40" fill="none">
    <rect x="2" y="2" width="36" height="36" rx="9" fill="#2B55C4" />
    <path d="M12 27V15l8-5 8 5v12" stroke="#EAF0FB" strokeWidth="2.2" strokeLinejoin="round" />
    <circle cx="20" cy="20" r="3.1" stroke="#B8781E" strokeWidth="2.2" />
    <path d="M20 23.1V28" stroke="#B8781E" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

/* ---------------------------------------------------------- calc helpers -- */
function vatOf(grossInclVat: number, rate = 0.2) { return round2(grossInclVat - grossInclVat / (1 + rate)); }

/* =========================================================== LLM coding === */
// Server-side coding through ShortStay's own API (never a direct browser call
// to the model provider). Falls back to the offline matcher on any failure.
async function codeReceiptLLM(text: string): Promise<CodedReceipt> {
  const res = await fetch("/api/code-receipt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ receiptText: text }),
  });
  if (!res.ok) throw new Error(`code-receipt ${res.status}`);
  return res.json();
}
function codeReceiptFallback(text: string): CodedReceipt & { _fallback: true } {
  const t = text.toLowerCase();
  const supplier = (text.trim().split("\n")[0] || "Supplier").replace(/\s+/g, " ").trim();
  const amtMatch = text.match(/£\s?([\d,]+(?:\.\d{2})?)/g) || [];
  const nums = amtMatch.map((x) => parseFloat(x.replace(/[£,\s]/g, "")));
  const grossInclVat = nums.length ? Math.max(...nums) : 0;
  let accountCode = "429";
  if (/(clean|changeover|turnaround)/.test(t)) accountCode = "408";
  else if (/(plumb|repair|leak|boiler|locksmith|callout|electric)/.test(t)) accountCode = "473";
  else if (/(power|heating|energy|gas bill|electric)/.test(t)) accountCode = "445";
  let propertyId = "P1";
  if (/dockside|wapping/.test(t)) propertyId = "P1";
  else if (/gasholder|king'?s cross/.test(t)) propertyId = "P2";
  else if (/tin quarter|digbeth|mews/.test(t)) propertyId = "P3";
  const dm = text.match(/(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s*(\d{4})/i);
  const mo: Record<string, string> = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
  const date = dm ? `${dm[3]}-${mo[dm[2].toLowerCase()]}-${dm[1].padStart(2, "0")}` : "2026-06-24";
  return { supplier, date, grossInclVat, vatRate: 0.2, accountCode, propertyId, confidence: 0.72, note: "matched offline", _fallback: true };
}

/* ============================================================ components == */
type KpiAnim = "bars" | "spark" | "gate";

function KPI({ lab, big, foot, color, anim }: {
  lab: string; big: string; foot: string; color: string; anim: KpiAnim;
}) {
  return (
    <div className="kpi">
      <div className="stripe" style={{ background: color }} />
      <div className="anim" aria-hidden>
        {anim === "bars" && (
          <div className="a-bars"><span /><span /><span /></div>
        )}
        {anim === "spark" && (
          <svg className="a-spark" viewBox="0 0 56 44">
            <path d="M4 36 L18 24 L28 30 L52 8" />
            <circle cx="52" cy="8" r="3" />
          </svg>
        )}
        {anim === "gate" && (
          <div className="a-gate"><span className="ring" /><span className="core" /></div>
        )}
      </div>
      <div className="lab">{lab}</div>
      <div className="big num">{big}</div>
      <div className="foot">{foot}</div>
    </div>
  );
}

function Overview({ statements, xero, go }: {
  statements: Record<string, ApiStatement | undefined>;
  xero: ApiXeroStatus | null;
  go: (t: TabKey) => void;
}) {
  const loaded = LANDLORD_IDS.map((id) => statements[id]).filter(
    (s): s is ApiStatement => !!s
  );
  const owed = penceToMoney(loaded.reduce((s, x) => s + x.totals.owedPence, 0));
  const earned = penceToMoney(loaded.reduce((s, x) => s + x.totals.feePence, 0));
  const gross = penceToMoney(loaded.reduce((s, x) => s + x.totals.grossPence, 0));
  const pending = loaded.filter((s) => s.status !== "approved").length;

  const rows = loaded.flatMap((s) => {
    const ids = Array.from(new Set(s.lines.map((l) => l.propertyId)));
    return ids.map((pid) => {
      const lines = s.lines.filter((l) => l.propertyId === pid);
      const sum = (kind: ApiStatementLine["kind"]) =>
        lines.filter((l) => l.kind === kind).reduce((t, l) => t + l.amountPence, 0);
      const revenue = sum("revenue");
      const commission = sum("commission");
      const fee = sum("fee");
      const costTotal = sum("cost");
      return {
        p: propById(pid),
        landlordName: s.landlordName,
        revenue, commission, fee, costTotal,
        owed: revenue - commission - fee - costTotal,
      };
    });
  });

  return (
    <>
      <div className="head">
        <div className="eyebrow">June 2026 · month to date{xero?.connected ? ` · live from ${xero.tenantName}` : " · Xero disconnected"}</div>
      </div>

      <div className="grid3" style={{ marginBottom: 16 }}>
        <KPI lab="Owed to landlords" big={owed} foot={`Across ${loaded.length || "…"} landlords · awaiting your approval`} color="#2B55C4" anim="bars" />
        <KPI lab="Agency earned" big={earned} foot="Management fee, 12% of gross bookings" color="#3E7D5E" anim="spark" />
        <KPI lab="Held for approval" big={String(pending)} foot={`${owed} in statements · live from the gate`} color="#9E4A34" anim="gate" />
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="pad" style={{ paddingBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="sect-t"><Ico d={I.overview} cls="ico" /> Properties this month</div>
          <div className="subtle">gross booked {gross} · Booking.com</div>
        </div>
        <table className="led">
          <thead><tr>
            <th>Property</th><th>Landlord</th><th className="r">Gross</th>
            <th className="r">Commission</th><th className="r">Agency fee</th><th className="r">Costs</th><th className="r">Owed</th>
          </tr></thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7} className="subtle" style={{ padding: 18 }}>Assembling statements from live sources…</td></tr>
            )}
            {rows.map(({ p, landlordName, revenue, commission, fee, costTotal, owed: propOwed }) => (
              <tr key={p.id}>
                <td><span className="prop-name">{p.name}</span> <span className="subtle">· {p.area}</span></td>
                <td className="subtle">{landlordName}</td>
                <td className="r num">{penceToMoney(revenue)}</td>
                <td className="r num" style={{ color: "var(--amber)" }}>−{penceToMoney(commission)}</td>
                <td className="r num" style={{ color: "var(--teal)" }}>−{penceToMoney(fee)}</td>
                <td className="r num" style={{ color: "var(--clay)" }}>−{penceToMoney(costTotal)}</td>
                <td className="r num" style={{ fontWeight: 700, color: "var(--ink)" }}>{penceToMoney(propOwed)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="callout">
        <b>1 receipt is waiting to be coded.</b> An emergency plumbing bill for Dockside Loft hasn&apos;t hit the ledger yet — code it and watch Amara&apos;s statement update. <button className="btn sm ghost focusable" style={{ marginLeft: 10 }} onClick={() => go("capture")}>Open the inbox →</button>
      </div>
    </>
  );
}

type CaptureState = "idle" | "coding" | "coded" | "drafting" | "drafted";

interface Preflight {
  contact: { contactId: string; name: string } | null | "checking";
  account: { code?: string; name: string } | null | "checking";
}

function Capture({ audit, xeroConnected, onLedgerChange }: {
  audit: ApiAuditEvent[];
  xeroConnected: boolean;
  onLedgerChange: () => void;
}) {
  const [text, setText] = useState(INBOX_RECEIPTS.plumbing);
  const [state, setState] = useState<CaptureState>("idle");
  const [fields, setFields] = useState<CodedFields | null>(null);
  const [via, setVia] = useState<string | null>(null);
  const [drafted, setDrafted] = useState<ApiDraftBillResult | null>(null);
  const [meta, setMeta] = useState<{ receiptId: string; codedEventId: string } | null>(null);
  const [preflight, setPreflight] = useState<Preflight | null>(null);

  const load = (k: string) => { setText(INBOX_RECEIPTS[k]); setState("idle"); setFields(null); setDrafted(null); setMeta(null); setPreflight(null); };

  // Pre-flight: the same live Xero lookups the write path will make, run
  // BEFORE the draft button — the round-trip is visible, not implied.
  const runPreflight = async (supplier: string, code: string) => {
    if (!xeroConnected) { setPreflight(null); return; }
    setPreflight({ contact: "checking", account: "checking" });
    const [contactRes, accountRes] = await Promise.all([
      fetch(`/api/xero/contacts?name=${encodeURIComponent(supplier)}`).then((r) => (r.ok ? r.json() : { match: null })).catch(() => ({ match: null })),
      fetch(`/api/xero/accounts?code=${encodeURIComponent(code)}`).then((r) => (r.ok ? r.json() : { match: null })).catch(() => ({ match: null })),
    ]);
    setPreflight({ contact: contactRes.match ?? null, account: accountRes.match ?? null });
  };

  const run = async () => {
    setState("coding"); setFields(null); setDrafted(null); setMeta(null);
    let out: CodedReceipt & { receiptId?: string; codedEventId?: string };
    let source = "Claude · receipt-coder";
    try {
      out = await codeReceiptLLM(text);
      if (!out || typeof out.grossInclVat !== "number") throw new Error("shape");
      if (out.via === "fallback") source = "offline matcher (fallback)";
      if (out.receiptId && out.codedEventId) {
        setMeta({ receiptId: out.receiptId, codedEventId: out.codedEventId });
      }
    } catch {
      out = codeReceiptFallback(text); source = "offline matcher (browser fallback)";
    }
    const acc = accByCode(String(out.accountCode));
    const prop = propById(out.propertyId);
    const gross = round2(out.grossInclVat);
    setFields({ supplier: out.supplier, date: out.date, gross, vat: vatOf(gross, out.vatRate || 0.2),
      code: acc.code, accName: acc.name, propId: prop.id, propName: `${prop.name}, ${prop.area}`,
      confidence: out.confidence ?? 0.8, note: out.note });
    setVia(source);
    setState("coded");
    onLedgerChange();
    void runPreflight(out.supplier, acc.code);
  };

  // The ONE write — through ShortStay's API, never from the browser to Xero.
  const draft = async () => {
    if (!fields) return;
    setState("drafting");
    try {
      const res = await fetch("/api/draft-bill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coded: {
            supplier: fields.supplier,
            date: fields.date,
            grossInclVat: fields.gross,
            vatRate: 0.2,
            accountCode: fields.code,
            propertyId: fields.propId,
            confidence: fields.confidence,
            note: fields.note,
          },
          receiptId: meta?.receiptId,
          codedEventId: meta?.codedEventId,
        }),
      });
      const result = (await res.json()) as ApiDraftBillResult;
      setDrafted(result);
    } catch (err) {
      setDrafted({ ok: false, error: err instanceof Error ? err.message : String(err) });
    }
    setState("drafted");
    onLedgerChange();
  };

  return (
    <>
      <div className="head">
        <h1 className="h-title">Code a receipt into a draft bill</h1>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <span className="subtle" style={{ marginRight: 4 }}>Inbox:</span>
        {([["plumbing", "Plumbing · Dockside"], ["cleaning", "Clean · Gasholder"], ["linen", "Linen · Tin Quarter"]] as const).map(([k, lab]) => (
          <button key={k} className={"chip focusable" + (text === INBOX_RECEIPTS[k] ? " on" : "")} onClick={() => load(k)}>{lab}</button>
        ))}
        <label className="chip focusable" style={{ marginLeft: "auto", cursor: "pointer" }}>
          ⬆ Upload invoice
          <input
            type="file"
            accept="text/plain,.txt,.md,.csv,.eml,text/*"
            style={{ display: "none" }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const content = await file.text();
              setText(content);
              setState("idle"); setFields(null); setDrafted(null); setMeta(null); setPreflight(null);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      <div className="grid2">
        <div className="card pad">
          <div className="sect-t" style={{ marginBottom: 12 }}><Ico d={I.capture} cls="ico" /> Supplier receipt</div>
          <div className="receipt">
            <textarea value={text} onChange={(e) => { setText(e.target.value); setState("idle"); }} spellCheck={false} aria-label="Receipt text" />
          </div>
          <button className="btn focusable" style={{ marginTop: 14, width: "100%", justifyContent: "center" }} onClick={run} disabled={state === "coding"}>
            {state === "coding" ? <><span className="spinner" /> Reading receipt…</> : <>Code this receipt</>}
          </button>
        </div>

        <div className="card pad">
          <div className="sect-t" style={{ marginBottom: 4, justifyContent: "space-between" }}>
            <span style={{ display: "inline-flex", gap: 9, alignItems: "center" }}><Ico d={I.statements} cls="ico" /> Extracted fields</span>
            {via && <span className="tag src">{via}</span>}
          </div>

          {state === "idle" && <p className="subtle" style={{ padding: "26px 2px", lineHeight: 1.6 }}>Nothing coded yet. Press <b>Code this receipt</b> — the fields appear here, then you draft the bill.</p>}
          {state === "coding" && <p className="subtle" style={{ padding: "26px 2px", display: "flex", gap: 10, alignItems: "center" }}><span className="spinner dk" /> Extracting supplier, amount, VAT, account, property…</p>}

          {fields && state !== "coding" && (
            <div style={{ marginTop: 8 }}>
              {([
                ["Supplier", fields.supplier],
                ["Date", fields.date],
                ["Gross (inc. VAT)", money(fields.gross)],
                ["VAT (20%)", money(fields.vat)],
                ["Account", `${fields.code} · ${fields.accName}`],
                ["Property", fields.propName],
              ] as const).map(([l, v], i) => (
                <div className="field" key={l} style={{ animationDelay: `${i * 60}ms` }}>
                  <span className="fl">{l}</span><span className="fv">{v}</span>
                </div>
              ))}
              {preflight && (
                <div style={{ marginTop: 12, padding: "10px 12px", background: "var(--sand)", borderRadius: 9, fontSize: 12.5 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 11.5, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--faint)" }}>Live Xero pre-flight</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                    {preflight.contact === "checking" ? <span className="spinner dk" style={{ width: 11, height: 11 }} />
                      : preflight.contact ? <span style={{ color: "var(--sage)", fontWeight: 700 }}>✓</span>
                      : <span style={{ color: "var(--clay)", fontWeight: 700 }}>✗</span>}
                    <span className="mono" style={{ fontSize: 11.5 }}>
                      {preflight.contact === "checking" ? "resolving supplier against Xero contacts…"
                        : preflight.contact ? `contact "${preflight.contact.name}" · ${preflight.contact.contactId.slice(0, 8)}…`
                        : `no Xero contact matches "${fields.supplier}" — create it in Xero first`}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {preflight.account === "checking" ? <span className="spinner dk" style={{ width: 11, height: 11 }} />
                      : preflight.account ? <span style={{ color: "var(--sage)", fontWeight: 700 }}>✓</span>
                      : <span style={{ color: "var(--clay)", fontWeight: 700 }}>✗</span>}
                    <span className="mono" style={{ fontSize: 11.5 }}>
                      {preflight.account === "checking" ? "validating account code against the live chart…"
                        : preflight.account ? `account ${fields.code} · "${preflight.account.name}" in the live chart`
                        : `account ${fields.code} not in the org's chart`}
                    </span>
                  </div>
                </div>
              )}
              {!xeroConnected && state === "coded" && (
                <div style={{ marginTop: 12, padding: "10px 12px", background: "var(--clay-soft)", borderRadius: 9, fontSize: 12.5 }}>
                  Xero is not connected — the coded fields are ready, but drafting needs a live org. Sign in from the sidebar.
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
                <span className="tag draft">Xero · ACCPAY · DRAFT</span>
                <span className="subtle" style={{ fontSize: 12 }}>confidence {(fields.confidence * 100).toFixed(0)}%</span>
                {state === "coded" && (
                  <button
                    className="btn sm focusable"
                    style={{ marginLeft: "auto" }}
                    onClick={draft}
                    disabled={!xeroConnected || preflight?.contact === null || preflight?.contact === "checking"}
                    title={!xeroConnected ? "Connect Xero first" : preflight?.contact === null ? "Supplier has no Xero contact" : undefined}
                  >
                    Send to Xero →
                  </button>
                )}
                {state === "drafting" && <span className="subtle" style={{ marginLeft: "auto", display: "inline-flex", gap: 8, alignItems: "center" }}><span className="spinner dk" /> Writing draft…</span>}
              </div>

              {state === "drafted" && drafted?.ok && (
                <div className="callout" style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                  <span><b>Draft bill created in Xero.</b> Waiting in Xero for your approval.</span>
                  <a className="btn sm focusable" style={{ textDecoration: "none" }} href={`https://go.xero.com/AccountsPayable/Edit.aspx?InvoiceID=${drafted.invoiceId}`} target="_blank" rel="noreferrer">View in Xero →</a>
                </div>
              )}
              {state === "drafted" && drafted && !drafted.ok && (
                <div className="callout" style={{ marginTop: 16, background: "var(--clay-soft)", borderColor: "var(--clay)" }}>
                  <b>{drafted.needsContact ? "Contact needed" : "Draft not written"}</b> — {drafted.error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 16 }} className="card pad">
        <div className="sect-t" style={{ marginBottom: 8 }}><Ico d={I.ledger} cls="ico" /> What just got written to the audit log</div>
        {audit.slice(-3).reverse().map((e) => (
          <div className="evt" key={e.id} style={{ gridTemplateColumns: "150px 1fr auto" }}>
            <span className="et">{e.eventType}</span>
            <span><span className="em">{summarisePayload(e)}</span><div className="emeta">{e.actor} · {e.subjectType}:{e.subjectId.slice(0, 12)}{e.parentEventId ? ` ← ${e.parentEventId.slice(0, 8)}` : ""}</div></span>
            <span className="ets">{fmtTs(e.createdAt)}</span>
          </div>
        ))}
        <p className="subtle" style={{ marginTop: 10, fontSize: 12.5 }}>No <span className="mono">payment.*</span> event exists in the vocabulary — coding a cost can never become paying one.</p>
      </div>

      <div style={{ marginTop: 16 }} className="card pad policy">
        <div className="sect-t" style={{ marginBottom: 10 }}>Money handling — policy, rights &amp; terms</div>
        <details>
          <summary>Money-handling policy</summary>
          <div className="pbody">
            ShortStay <b>never initiates, authorises, or transmits payments</b>. Its single write capability is creating a <b>DRAFT purchase bill</b> in Xero — a document, not a transaction. The OAuth grant excludes every payment scope (<span className="mono">accounting.payments</span>, bank-transaction writes, <span className="mono">paymentservices</span>), so payment endpoints return 403 by construction. A software guard additionally refuses any non-whitelisted API call before network traffic occurs, and every action is recorded in an append-only audit log whose vocabulary contains no payment or transfer event type.
          </div>
        </details>
        <details>
          <summary>Your rights</summary>
          <div className="pbody">
            Every figure shown traces to its source — a Xero invoice, a bank transaction, or a computation you can inspect. <b>Nothing is approved without you</b>: statements are held behind a human approval gate, and approval itself moves no money — it only records your authorisation to pay from Xero yourself. You may revoke ShortStay&apos;s access at any time from Xero&apos;s <b>Connected apps</b> settings, and request the audit log for any decision.
          </div>
        </details>
        <details>
          <summary>Terms &amp; conditions (demo)</summary>
          <div className="pbody">
            This is a prototype operating against a Xero demo organisation for evaluation. It does not provide financial, tax, or accounting advice. Drafted bills require human review in Xero before any payment is made. Extracted figures are AI-generated and shown with a confidence score — verify before approving. No liability is accepted for decisions made on unverified drafts.
          </div>
        </details>
        <p className="subtle" style={{ margin: "10px 2px 0", fontSize: 12.5 }}>
          Full regulatory documents — Terms of Service, Privacy Policy, Cookie Policy, Acceptable Use, and the UK GDPR Art. 28 Data Processing Addendum — are at{" "}
          <a href="/legal" target="_blank" rel="noreferrer" style={{ fontWeight: 600, textDecoration: "underline" }}>ShortStay Legal ↗</a>.
        </p>
      </div>
    </>
  );
}

function Bridge({ totals }: { totals: ApiStatementTotals }) {
  const segs = [
    { k: "owed", v: totals.owedPence, c: "var(--pine)", lab: "Owed to landlord" },
    { k: "commission", v: totals.commissionPence, c: "var(--amber)", lab: "Booking.com commission" },
    { k: "fee", v: totals.feePence, c: "var(--teal)", lab: "Agency fee" },
    { k: "costs", v: totals.costsPence, c: "var(--clay)", lab: "Property costs" },
  ];
  const gross = totals.grossPence || 1;
  return (
    <div>
      <div className="bridge-track">
        {segs.map((s) => (
          <div key={s.k} className="bridge-seg" style={{ flexBasis: `${(s.v / gross) * 100}%`, background: s.c }} title={`${s.lab}: ${penceToMoney(s.v)}`}>
            {(s.v / gross) > 0.12 && <span>{penceToMoney(s.v)}</span>}
          </div>
        ))}
      </div>
      <div className="legend">
        {[{ c: "var(--pine)", l: "Owed to landlord", v: totals.owedPence, big: true },
          { c: "var(--amber)", l: "− Booking.com 15%", v: totals.commissionPence, big: false },
          { c: "var(--teal)", l: "− Agency fee 12%", v: totals.feePence, big: false },
          { c: "var(--clay)", l: "− Property costs", v: totals.costsPence, big: false }].map((x) => (
          <div className="leg" key={x.l}>
            <span className="sw" style={{ background: x.c }} />
            <span className="lv" style={x.big ? { fontSize: 14 } : {}}>{penceToMoney(x.v)}</span>
            <span className="ll">{x.l}</span>
          </div>
        ))}
        <div className="leg" style={{ marginLeft: "auto" }}>
          <span className="ll">of</span><span className="lv">{penceToMoney(totals.grossPence)}</span><span className="ll">gross booked</span>
        </div>
      </div>
    </div>
  );
}

function Statements({ statements, onRefresh }: {
  statements: Record<string, ApiStatement | undefined>;
  onRefresh: () => void;
}) {
  const [lid, setLid] = useState<string>("L1");
  const [gate, setGate] = useState<Record<string, ApiApproveResponse | undefined>>({});
  const [openProp, setOpenProp] = useState<string | null>(null);
  const st = statements[lid];
  const gateResult = gate[lid];
  const status = gateResult?.status ?? st?.status ?? "assembled";

  // Server-side guards are the truth; before the first approve attempt we
  // show what will be evaluated, not a pre-judged verdict.
  const guards: ApiGuardResult[] = gateResult?.guards ?? [
    { name: "no-money-movement", decision: "allow", reason: "evaluated server-side on approval" },
    { name: "statement-completeness", decision: "allow", reason: "evaluated server-side on approval" },
  ];

  const approve = async () => {
    try {
      const res = await fetch(`/api/statements/${lid}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionKind: "approve-statement" }),
      });
      const data = (await res.json()) as ApiApproveResponse;
      setGate((g) => ({ ...g, [lid]: data }));
    } catch {
      // surfaced by the unchanged "assembled" status
    }
    onRefresh();
  };

  // Group API lines per property for the detail tables.
  const perProp = useMemo(() => {
    if (!st) return [];
    const ids = Array.from(new Set(st.lines.map((l) => l.propertyId)));
    return ids.map((pid) => {
      const lines = st.lines.filter((l) => l.propertyId === pid);
      const sum = (kind: ApiStatementLine["kind"]) =>
        lines.filter((l) => l.kind === kind).reduce((s, l) => s + l.amountPence, 0);
      const revenue = sum("revenue");
      const commission = sum("commission");
      const fee = sum("fee");
      const costTotal = sum("cost");
      return {
        p: propById(pid),
        lines,
        revenue,
        commission,
        fee,
        costTotal,
        owed: revenue - commission - fee - costTotal,
        stays: lines.filter((l) => l.kind === "revenue").length,
        costs: lines.filter((l) => l.kind === "cost"),
      };
    });
  }, [st]);

  return (
    <>
      <div className="head">
        <h1 className="h-title">Per-landlord monthly statement</h1>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {LANDLORDS.map((l) => (
          <button key={l.id} className={"chip focusable" + (lid === l.id ? " on" : "")} onClick={() => setLid(l.id)}>{l.name}</button>
        ))}
        <span className="chip" style={{ marginLeft: "auto", cursor: "default" }}>{st?.month ?? "June 2026"}</span>
      </div>

      <div className="stmt-grid">
        <div>
          {!st && (
            <div className="card pad subtle" style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span className="spinner dk" /> Assembling from live sources…
            </div>
          )}

          {st && (
            <>
              <div className="card pad" style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div className="disp" style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-.02em" }}>{st.landlordName}</div>
                    <div className="subtle" style={{ marginTop: 3 }}>{perProp.length} propert{perProp.length > 1 ? "ies" : "y"} · statement <span className="mono" style={{ fontSize: 12 }}>{st.statementId.slice(0, 8)}</span>{!st.xeroConnected && <span className="tag hold" style={{ marginLeft: 8 }}>Xero disconnected — costs not read</span>}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="subtle" style={{ fontSize: 12 }}>Owed to landlord</div>
                    <div className="num" style={{ fontSize: 30, fontWeight: 700, color: "var(--pine)", letterSpacing: "-.03em" }}>{penceToMoney(st.totals.owedPence)}</div>
                  </div>
                </div>
                <Bridge totals={st.totals} />
              </div>

              {perProp.map(({ p, revenue, commission, fee, owed, stays, costs: pc }) => {
                const info = PROPERTY_INFO[p.id];
                const open = openProp === p.id;
                return (
                  <div className="card" key={p.id} style={{ marginBottom: 14 }}>
                    <div className="pad" style={{ paddingBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                      <div className="prop-head">
                        <button className="prop-thumb focusable" onClick={() => setOpenProp(open ? null : p.id)} title={`${p.name} details`} aria-expanded={open}>
                          <PropThumb pid={p.id} />
                        </button>
                        <div>
                          <div className="sect-t">{p.name} <span className="subtle" style={{ fontWeight: 400 }}>· {p.area}</span></div>
                          {info && <span className={`tag ${info.occupied ? "approved" : "hold"}`} style={{ marginTop: 4 }}>{info.occupied ? "Occupied" : "Vacant"}</span>}
                        </div>
                      </div>
                      <div className="num" style={{ fontWeight: 700 }}>{penceToMoney(owed)} <span className="subtle" style={{ fontWeight: 400, fontSize: 12 }}>owed</span></div>
                    </div>
                    {open && info && (
                      <div className="prop-details">
                        <div className="pd"><div className="pdl">Address</div><div className="pdv">{info.address}</div></div>
                        <div className="pd"><div className="pdl">Landlord</div><div className="pdv">{info.landlord}</div></div>
                        <div className="pd"><div className="pdl">Contact</div><div className="pdv">{info.contact}</div></div>
                        <div className="pd"><div className="pdl">Occupancy</div><div className="pdv">{info.occupancy}</div></div>
                        <div className="pd"><div className="pdl">Next changeover</div><div className="pdv">{info.nextChangeover}</div></div>
                      </div>
                    )}
                    <table className="led">
                      <tbody>
                        <tr>
                          <td><span style={{ fontWeight: 600 }}>Booking revenue</span><div className="subtle">{stays} stays</div></td>
                          <td><span className="tag src">booking ledger</span></td>
                          <td className="r num" style={{ fontWeight: 700 }}>{penceToMoney(revenue)}</td>
                        </tr>
                        <tr>
                          <td>Booking.com commission <span className="subtle">15%</span></td>
                          <td><span className="tag src">computed</span></td>
                          <td className="r num" style={{ color: "var(--amber)" }}>−{penceToMoney(commission)}</td>
                        </tr>
                        <tr>
                          <td>Agency management fee <span className="subtle">12%</span></td>
                          <td><span className="tag src">computed</span></td>
                          <td className="r num" style={{ color: "var(--teal)" }}>−{penceToMoney(fee)}</td>
                        </tr>
                        {pc.map((c) => (
                          <tr key={c.sourceId + c.description}>
                            <td style={{ paddingLeft: 22 }}>{c.description} <span className="subtle">· {c.date}</span></td>
                            <td><span className="tag src">ACCPAY {c.sourceId.slice(0, 8)} · {c.billStatus}</span></td>
                            <td className="r num" style={{ color: "var(--clay)" }}>−{penceToMoney(c.amountPence)}</td>
                          </tr>
                        ))}
                        <tr>
                          <td style={{ fontWeight: 700, color: "var(--ink)" }}>Owed to {st.landlordName.split(" ")[0]}</td>
                          <td><span className="tag src">computed</span></td>
                          <td className="r num" style={{ fontWeight: 700, color: "var(--pine)" }}>{penceToMoney(owed)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </>
          )}
        </div>

        <aside className="stmt-side">
          <div className="card">
            <div className="gate-h">
              <div>
                <div className="sect-t"><Ico d={<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM5 11V8a7 7 0 0 1 14 0v3M4 11h16v10H4z" />} cls="ico" /> Human approval gate</div>
                <div className="subtle" style={{ marginTop: 5, fontSize: 12.5 }}>Guards decide; they never act. ShortStay cannot release funds — approval only authorises you to.</div>
              </div>
            </div>
            <div style={{ padding: "0 18px 14px" }}>
              {status === "approved"
                ? <span className="tag approved" style={{ fontSize: 12.5, padding: "6px 12px" }}>✓ Approved for release · you authorised</span>
                : <button className="btn focusable" style={{ width: "100%", justifyContent: "center" }} onClick={approve} disabled={!st}>{status === "held" ? "Re-run guards" : "Approve statement for release"}</button>}
            </div>
            {guards.map((g) => (
              <div className="guard-line" key={g.name}>
                <span className="gd" style={{ background: g.decision === "allow" ? "var(--sage)" : g.decision === "pause" ? "var(--amber)" : "var(--clay)" }} />
                <span className="gn">{g.name}</span>
                <span className="tag" style={{ background: g.decision === "allow" ? "var(--sage-soft)" : "var(--amber-soft)", color: g.decision === "allow" ? "#2c5a41" : "#8a5a10" }}>{g.decision}</span>
                <span className="gr">{g.reason}</span>
              </div>
            ))}
            {status === "approved" && (
              <div className="callout" style={{ margin: "12px 14px 14px" }}>
                <b>Statement approved.</b> ShortStay recorded <span className="mono">statement.approved</span> and stopped. No <span className="mono">Payment</span>, no <span className="mono">BankTransfer</span> — the payout is yours to send from Xero.
              </div>
            )}
            {status === "held" && (
              <div className="callout" style={{ margin: "12px 14px 14px", background: "var(--amber-soft)", borderColor: "var(--amber)" }}>
                <b>Statement held.</b> The gate returned <span className="mono">409 · {gateResult?.decision}</span> and recorded <span className="mono">statement.held</span>. Resolve the guard reasons and re-run.
              </div>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}

function Reconcile({ onLedgerChange }: { onLedgerChange: () => void }) {
  const [result, setResult] = useState<{ matched: boolean; split: Record<string, number>; reason?: string } | null>(null);
  const subset = ["bk-201", "bk-207", "bk-231", "bk-238", "bk-261", "bk-268"];
  const rows = BOOKINGS.filter((b) => subset.includes(b.id)).map((b) => ({ ...b, net: round2(b.gross * 0.85) }));
  const payout = round2(rows.reduce((s, r) => s + r.net, 0));
  const matched = result?.matched ?? false;

  // Deterministic server-side match: payout = Σ(gross × 0.85) ±1p over the
  // candidate set — audited as payout.matched. The LLM never touches money.
  const runMatch = async () => {
    try {
      const res = await fetch("/api/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutPence: Math.round(payout * 100), bookingIds: subset }),
      });
      const data = await res.json();
      setResult({ matched: !!data.matched, split: data.perPropertySplitPence ?? {}, reason: data.reason });
    } catch {
      setResult({ matched: false, split: {}, reason: "reconcile request failed" });
    }
    onLedgerChange();
  };

  const bySplit = result?.matched
    ? Object.entries(result.split).map(([pid, net]) => ({ p: propById(pid), net: net / 100 }))
    : [];

  return (
    <>
      <div className="head">
        <div className="eyebrow">Stretch · seeded bank data</div>
        <h1 className="h-title">Reconcile a Booking.com payout</h1>
        <p className="h-sub">A channel payout lands as one lump sum. ShortStay reads it as a <span className="mono" style={{ fontSize: 13 }}>RECEIVE</span> bank transaction and splits it back across bookings and properties. It reads this — it never creates a bank transaction.</p>
      </div>

      <div className="grid2" style={{ marginBottom: 16 }}>
        <div className="kpi"><div className="stripe" style={{ background: "var(--sage)" }} /><div className="lab">Payout received</div><div className="big num">{money(payout)}</div><div className="foot">Booking.com · 27 Jun 2026 · <span className="tag read" style={{ marginLeft: 4 }}>Bank · RECEIVE</span></div></div>
        <div className="kpi"><div className="stripe" style={{ background: matched ? "var(--sage)" : "var(--amber)" }} /><div className="lab">Match status</div><div className="big num" style={{ fontSize: 22, marginTop: 12 }}>{matched ? "Reconciled · 6 of 6" : "6 bookings to match"}</div><div className="foot">Rule: payout = Σ(booking gross × 0.85) in window</div></div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="pad" style={{ paddingBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="sect-t"><Ico d={I.reconcile} cls="ico" /> Bookings inside this payout</div>
          {!matched && <button className="btn sm focusable" onClick={runMatch}>Match payout to bookings</button>}
        </div>
        <table className="led">
          <thead><tr><th>Booking</th><th>Property</th><th>Guest</th><th className="r">Gross</th><th className="r">Net (−15%)</th><th className="r">State</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="mono" style={{ fontSize: 12 }}>{r.id}</td>
                <td>{propById(r.propertyId).name}</td>
                <td className="subtle">{r.guest}</td>
                <td className="r num">{money(r.gross)}</td>
                <td className="r num">{money(r.net)}</td>
                <td className="r">{matched ? <span className="tag approved">matched</span> : <span className="tag hold">pending</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {matched && (
        <div className="card pad">
          <div className="sect-t" style={{ marginBottom: 12 }}>Split across properties</div>
          <div className="grid3">
            {bySplit.map(({ p, net }) => (
              <div key={p.id} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "13px 15px" }}>
                <div className="subtle" style={{ fontSize: 12 }}>{p.name}</div>
                <div className="num" style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{money(net)}</div>
              </div>
            ))}
          </div>
          <p className="subtle" style={{ marginTop: 14, fontSize: 12.5 }}>Reconciled to the penny · <span className="mono">{money(payout)}</span> · <span className="mono">payout.matched</span> recorded. {result?.reason}</p>
        </div>
      )}
      {result && !result.matched && (
        <div className="callout" style={{ background: "var(--amber-soft)", borderColor: "var(--amber)" }}>
          <b>No deterministic match.</b> {result.reason} — pick the bookings yourself; ShortStay never guesses.
        </div>
      )}
    </>
  );
}

// Why each scope exists — display copy for the live grant.
const SCOPE_WHY: Record<string, string> = {
  "accounting.contacts.read": "resolve landlord / supplier",
  "accounting.settings.read": "read chart of accounts",
  "accounting.banktransactions.read": "read booking payouts in",
  "accounting.invoices.read": "read back drafted bills (auto-granted with the write scope)",
  "accounting.invoices": "the ONE write — draft a bill",
  "accounting.reports.profitandloss.read": "P&L for forecasting",
};

function Ledger({ audit, xero }: { audit: ApiAuditEvent[]; xero: ApiXeroStatus | null }) {
  const [filter, setFilter] = useState("all");
  const liveScopes = (xero?.grantedScopes ?? []).filter((s) => s.startsWith("accounting."));
  const types = ["all", ...Array.from(new Set(audit.map((e) => e.eventType)))];
  const shown = filter === "all" ? audit : audit.filter((e) => e.eventType === filter);
  const list = [...shown].reverse();
  return (
    <>
      <div className="head">
        <div className="eyebrow">The trust exhibit</div>
        <h1 className="h-title">Audit log &amp; the money boundary</h1>
        <p className="h-sub">Every action is an append-only event with its cause. The vocabulary has no payment type, and the OAuth grant omits every money-moving scope. A reviewer can prove money never moved from these two facts alone.</p>
      </div>

      <div className="grid2" style={{ marginBottom: 16, alignItems: "start" }}>
        <div className="card pad">
          <div className="sect-t" style={{ marginBottom: 12 }}>
            <span className="seal-dot" style={{ position: "relative", top: 0, ...(xero?.connected ? {} : { background: "var(--clay)" }) }} />
            {xero?.connected
              ? <>Granted scopes — decoded live from {xero.tenantName}&apos;s token</>
              : <>Granted scopes — connect Xero to read the live token</>}
          </div>
          {(xero?.connected ? liveScopes : SCOPES_GRANTED.map((x) => x.s)).map((s) => (
            <div className="scope grant" key={s}>
              <span className="sc-name" style={{ color: s === "accounting.invoices" ? "var(--pine)" : "var(--txt)" }}>{s}</span>
              {s === "accounting.invoices" ? <span className="tag draft">WRITE · draft only</span> : <span className="tag read">read</span>}
              <span className="sc-why">{SCOPE_WHY[s] ?? SCOPES_GRANTED.find((x) => x.s === s)?.why ?? ""}</span>
            </div>
          ))}
          {xero?.connected && (
            <p className="subtle" style={{ marginTop: 10, fontSize: 12.5 }}>These are the access token&apos;s own <span className="mono">scope</span> claims — proof of the actual grant, not a screenshot of what was requested.</p>
          )}
        </div>
        <div className="card pad">
          <div className="sect-t" style={{ marginBottom: 12 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--clay)", display: "inline-block" }} /> Deliberately omitted — money movement</div>
          {SCOPES_OMITTED.map((x) => (
            <div className="scope omit" key={x.s}>
              <span className="sc-name">{x.s}</span>
              <span className="sc-why">{x.why}</span>
            </div>
          ))}
          <p className="subtle" style={{ marginTop: 10, fontSize: 12.5 }}>Without <span className="mono">accounting.payments</span>, the <span className="mono">create-payment</span> tool returns 403. ShortStay is <b>structurally</b> unable to pay.</p>
        </div>
      </div>

      <div className="card">
        <div className="pad" style={{ paddingBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div className="sect-t"><Ico d={I.ledger} cls="ico" /> Append-only event log <span className="subtle" style={{ fontWeight: 400 }}>· {audit.length} events</span></div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {types.map((t) => (
              <button key={t} className={"chip focusable" + (filter === t ? " on" : "")} style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setFilter(t)}>{t === "all" ? "all" : t}</button>
            ))}
          </div>
        </div>
        <div className="pad" style={{ paddingTop: 4, maxHeight: 420, overflow: "auto" }}>
          {list.map((e) => (
            <div className="evt" key={e.id}>
              <span className="et">{e.eventType}</span>
              <span>
                <span className="em">{summarisePayload(e)}</span>
                <div className="emeta">{e.actor} · {e.subjectType}:{e.subjectId.slice(0, 12)}{e.parentEventId ? `  ← ${e.parentEventId.slice(0, 8)}` : ""}</div>
              </span>
              <span className="ets">{fmtTs(e.createdAt)}</span>
            </div>
          ))}
          {list.length === 0 && <p className="subtle" style={{ padding: "18px 2px" }}>No events yet — code a receipt or assemble a statement and the log fills itself.</p>}
        </div>
        <div className="divider" />
        <div className="pad" style={{ padding: "12px 22px" }}>
          <span className="subtle" style={{ fontSize: 12.5 }}>Vocabulary: <span className="mono">booking.recorded · bill.drafted · statement.assembled · guard.evaluated · statement.approved</span>. There is no <span className="mono" style={{ color: "var(--clay)", textDecoration: "line-through" }}>payment.sent</span> or <span className="mono" style={{ color: "var(--clay)", textDecoration: "line-through" }}>transfer.made</span>.</span>
        </div>
      </div>

      <div className="card pad" style={{ marginTop: 16 }}>
        <div className="sect-t" style={{ marginBottom: 6 }}>Legal &amp; compliance documents</div>
        <p className="subtle" style={{ margin: "0 0 12px", fontSize: 12.5 }}>
          UK GDPR, PECR (as amended by the Data (Use and Access) Act 2025), Xero Developer Platform Terms,
          and short-term-let regulation are covered by the full document set — publicly available, no sign-in required.
        </p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {([
            ["terms-of-service", "Terms of Service"],
            ["privacy-policy", "Privacy Policy"],
            ["cookie-policy", "Cookie Policy"],
            ["acceptable-use-policy", "Acceptable Use"],
            ["data-processing-addendum", "Data Processing Addendum"],
          ] as const).map(([slug, label]) => (
            <a key={slug} className="chip focusable" style={{ textDecoration: "none" }} href={`/legal?doc=${slug}`} target="_blank" rel="noreferrer">{label} ↗</a>
          ))}
        </div>
      </div>
    </>
  );
}

/* ---- agents ---- */
interface WorkflowStep {
  text: string;
  meta: string;
  state: "done" | "gated";
}
interface AgentWorkflow {
  id: string;
  title: string;
  agent: string;
  when: string;
  outcome: string;
  steps: WorkflowStep[];
}

const AGENT_WORKFLOWS: AgentWorkflow[] = [
  {
    id: "wf-triage-0704",
    title: "Tenant WhatsApp report → emergency plumber triaged",
    agent: "agent:triage-runner",
    when: "Fri 07:42",
    outcome: "Resolved · bill drafted after your approval",
    steps: [
      { text: "Extracted maintenance report from WhatsApp", meta: "tenant · Dockside Loft · “water pooling under the sink”", state: "done" },
      { text: "Understood the problem", meta: "classified plumbing · severity high · respond within 4h", state: "done" },
      { text: "Shortlisted approved contractors, requested a callout quote", meta: "Rapid Flow Plumbing Ltd · £240 inc. VAT", state: "done" },
      { text: "Asked you before committing to the callout", meta: "approved by you · 08:05", state: "gated" },
      { text: "Coded the invoice and drafted the ACCPAY bill in Xero", meta: "bill.drafted · 473 Repairs & Maintenance · DRAFT", state: "done" },
    ],
  },
  {
    id: "wf-statement-0703",
    title: "Landlord email → June statement assembled",
    agent: "agent:statement-runner",
    when: "Thu 16:20",
    outcome: "Held at the gate · awaiting your approval",
    steps: [
      { text: "Extracted query from email", meta: "Amara Okafor · “when is my June payout?”", state: "done" },
      { text: "Assembled the June statement from live Xero reads", meta: "statement.assembled · every line source-tagged", state: "done" },
      { text: "Ran the guards", meta: "no-money-movement allow · completeness allow", state: "done" },
      { text: "Stopped for your approval — the reply is drafted, never auto-sent", meta: "human gate · statement.held until you decide", state: "gated" },
    ],
  },
  {
    id: "wf-reconcile-0627",
    title: "Booking.com payout → reconciled to the penny",
    agent: "agent:reconciler",
    when: "27 Jun",
    outcome: "Matched 6/6 · no approval needed (read-only)",
    steps: [
      { text: "Read the lump-sum RECEIVE bank transaction", meta: "£4,284.00 · Booking.com", state: "done" },
      { text: "Matched it to bookings by deterministic rule", meta: "payout = Σ(gross × 0.85) ±1p · 6 of 6", state: "done" },
      { text: "Recorded the split per property", meta: "payout.matched · feeds statement revenue lines", state: "done" },
    ],
  },
];

function Agents() {
  return (
    <>
      <div className="head">
        <div className="eyebrow">Pre-prompted agents · sample workflows</div>
        <h1 className="h-title">Recent agent runs</h1>
        <p className="h-sub">Each agent works a fixed playbook: extract, understand, act — and at every critical step, stop and ask you. Approval is a human-gated decision recorded in the audit log; no agent can move money.</p>
      </div>

      {AGENT_WORKFLOWS.map((wf) => (
        <div className="card" key={wf.id} style={{ marginBottom: 14 }}>
          <div className="pad" style={{ paddingBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
            <div>
              <div className="sect-t">{wf.title}</div>
              <div className="subtle" style={{ marginTop: 4, fontFamily: "'Space Mono', monospace", fontSize: 11.5 }}>{wf.agent} · {wf.when}</div>
            </div>
            <span className="tag read">{wf.outcome}</span>
          </div>
          <div className="pad" style={{ paddingTop: 0 }}>
            <div className="wf">
              {wf.steps.map((s, i) => (
                <div className={`wf-step ${s.state}`} key={i}>
                  <div className="ws-t">
                    {s.text}
                    {s.state === "gated" && <span className="wf-gate-chip">HUMAN GATE</span>}
                  </div>
                  <div className="ws-m">{s.meta}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

/* ---- pipeline: report → invoice → approval ---- */
interface ApiReport {
  id: string;
  propertyId: string;
  description: string;
  urgency: "low" | "normal" | "urgent";
  submittedBy: string;
  status: "open" | "invoiced" | "approved" | "denied";
  approvalId: string | null;
  createdAt: number;
}
interface ApiApproval {
  id: string;
  kind: string;
  subjectId: string;
  summary: string;
  detail: {
    invoiceId?: string;
    reportDescription?: string;
    propertyId?: string;
    supplier?: string;
    grossInclVat?: number;
    accountCode?: string;
  } | null;
  stagedBy: string;
  status: string;
  decidedBy: string | null;
  createdAt: number;
}

const URGENCY_TAG: Record<string, string> = { urgent: "hold", normal: "read", low: "src" };
const REPORT_STATUS_TAG: Record<string, string> = {
  open: "hold",
  invoiced: "draft",
  approved: "approved",
  denied: "src",
};

function ReportForm({ userName, onLedgerChange }: { userName: string; onLedgerChange: () => void }) {
  const [propertyId, setPropertyId] = useState("P1");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<"low" | "normal" | "urgent">("normal");
  const [submitting, setSubmitting] = useState(false);
  const [mine, setMine] = useState<ApiReport[]>([]);

  const loadMine = React.useCallback(async () => {
    try {
      const res = await fetch("/api/reports");
      const data = (await res.json()) as { reports: ApiReport[] };
      setMine(data.reports.filter((r) => r.submittedBy === userName));
    } catch {
      setMine([]);
    }
  }, [userName]);
  React.useEffect(() => { void loadMine(); }, [loadMine]);

  const submit = async () => {
    if (!description.trim() || submitting) return;
    setSubmitting(true);
    try {
      await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, description, urgency }),
      });
      setDescription("");
      setUrgency("normal");
      await loadMine();
      onLedgerChange();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="head">
        <h1 className="h-title">Report an issue</h1>
        <p className="h-sub">Spotted something at a property? Send it in — the office takes it from there.</p>
      </div>

      <div className="card pad" style={{ maxWidth: 560 }}>
        <div className="sect-t" style={{ marginBottom: 10 }}>Which property?</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          {PROPERTIES.map((p) => (
            <button
              key={p.id}
              className={"chip focusable" + (propertyId === p.id ? " on" : "")}
              onClick={() => setPropertyId(p.id)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px 6px 6px" }}
            >
              <span style={{ width: 40, height: 28, borderRadius: 6, overflow: "hidden", display: "inline-block" }}>
                <PropThumb pid={p.id} />
              </span>
              {p.name}
            </button>
          ))}
        </div>

        <div className="sect-t" style={{ marginBottom: 8 }}>What&apos;s the issue?</div>
        <div className="receipt" style={{ marginBottom: 12 }}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Toilet paper needs restocking — cupboard is empty"
            style={{ minHeight: 110 }}
            aria-label="Issue description"
          />
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
          <span className="subtle">Urgency:</span>
          {(["low", "normal", "urgent"] as const).map((u) => (
            <button key={u} className={"chip focusable" + (urgency === u ? " on" : "")} onClick={() => setUrgency(u)}>{u}</button>
          ))}
        </div>

        <button className="btn focusable" style={{ width: "100%", justifyContent: "center" }} onClick={submit} disabled={!description.trim() || submitting}>
          {submitting ? <><span className="spinner" /> Sending…</> : "Send report"}
        </button>
      </div>

      <div className="card pad" style={{ maxWidth: 560, marginTop: 16 }}>
        <div className="sect-t" style={{ marginBottom: 8 }}>My reports</div>
        {mine.length === 0 && <p className="subtle" style={{ padding: "8px 0" }}>Nothing yet.</p>}
        {mine.map((r) => (
          <div key={r.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "9px 0", borderBottom: "1px solid #EDF1F8" }}>
            <span style={{ width: 40, height: 28, borderRadius: 6, overflow: "hidden", flex: "0 0 40px" }}><PropThumb pid={r.propertyId} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.description}</div>
              <div className="subtle" style={{ fontSize: 11.5 }}>{propById(r.propertyId).name} · {fmtTs(new Date(r.createdAt).toISOString())}</div>
            </div>
            <span className={`tag ${REPORT_STATUS_TAG[r.status]}`}>{r.status}</span>
          </div>
        ))}
      </div>
    </>
  );
}

interface ApiBookingRequest {
  id: string;
  propertyId: string;
  guestName: string;
  guestEmail: string | null;
  checkIn: string | null;
  nights: number;
  totalPence: number;
  status: string;
  createdAt: number;
}

// Booking requests from the public /book site, surfaced in the ops view.
// Raising the ACCREC invoice from a confirmed booking is the next step —
// the queue makes the intake→review seam visible now.
function BookingQueue() {
  const [bookings, setBookings] = useState<ApiBookingRequest[]>([]);
  React.useEffect(() => {
    fetch("/api/bookings").then((r) => r.json()).then((d) => setBookings(d.bookings ?? [])).catch(() => setBookings([]));
  }, []);
  if (bookings.length === 0) return null;
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="pad" style={{ paddingBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div className="sect-t">Booking requests · {bookings.filter((b) => b.status === "requested").length} new</div>
        <span className="subtle" style={{ fontSize: 12 }}>from the public booking site</span>
      </div>
      {bookings.map((b) => (
        <div key={b.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "11px 22px", borderTop: "1px solid #EDF1F8" }}>
          <span style={{ width: 52, height: 36, borderRadius: 7, overflow: "hidden", flex: "0 0 52px" }}><PropThumb pid={b.propertyId} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 500 }}>{b.guestName} · {propById(b.propertyId).name}</div>
            <div className="subtle" style={{ fontSize: 11.5 }}>
              {b.nights} night{b.nights > 1 ? "s" : ""}{b.checkIn ? ` from ${b.checkIn}` : ""} · {penceToMoney(b.totalPence)}{b.guestEmail ? ` · ${b.guestEmail}` : ""}
            </div>
          </div>
          <span className={`tag ${b.status === "requested" ? "hold" : b.status === "confirmed" ? "approved" : "src"}`}>{b.status}</span>
        </div>
      ))}
    </div>
  );
}

function FieldReports({ xeroConnected, onLedgerChange }: { xeroConnected: boolean; onLedgerChange: () => void }) {
  const [reports, setReports] = useState<ApiReport[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [supplier, setSupplier] = useState("");
  const [amount, setAmount] = useState("");
  const [accountCode, setAccountCode] = useState<"408" | "473" | "445" | "429">("429");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string; invoiceId?: string } | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/reports");
      setReports(((await res.json()) as { reports: ApiReport[] }).reports);
    } catch { setReports([]); }
  }, []);
  React.useEffect(() => { void load(); }, [load]);

  const urgencyRank = { urgent: 0, normal: 1, low: 2 } as const;
  const open = [...reports.filter((r) => r.status === "open")].sort(
    (a, b) => urgencyRank[a.urgency] - urgencyRank[b.urgency]
  );
  const rest = reports.filter((r) => r.status !== "open");

  const stage = async (report: ApiReport) => {
    if (busy) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch(`/api/reports/${report.id}/invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coded: {
            supplier: supplier.trim(),
            date: new Date().toISOString().slice(0, 10),
            grossInclVat: Number(amount),
            vatRate: 0.2,
            accountCode,
            propertyId: report.propertyId,
            confidence: 1,
            note: `field report: ${report.description.slice(0, 120)}`,
          },
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setResult({ ok: true, text: "Sent to Xero as pending — now in the accountant's approvals queue.", invoiceId: data.invoiceId });
        setOpenId(null);
        setSupplier("");
        setAmount("");
        await load();
        onLedgerChange();
      } else {
        setResult({ ok: false, text: data.error ?? "staging failed" });
      }
    } catch (err) {
      setResult({ ok: false, text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="head">
        <h1 className="h-title">Field reports</h1>
        <p className="h-sub">Reports from the field team. Review, price the fix, and send the bill to Xero — the accountant signs it off.</p>
      </div>

      <BookingQueue />

      {result && (
        <div className="callout" style={{ marginBottom: 14, ...(result.ok ? {} : { background: "var(--clay-soft)", borderColor: "var(--clay)" }) }}>
          {result.text}
          {result.ok && result.invoiceId && (
            <>{" "}<a className="focusable" style={{ fontWeight: 600, textDecoration: "underline" }} href={`https://go.xero.com/AccountsPayable/Edit.aspx?InvoiceID=${result.invoiceId}`} target="_blank" rel="noreferrer">View in Xero →</a></>
          )}
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="pad" style={{ paddingBottom: 8 }}>
          <div className="sect-t">Open · {open.length}</div>
        </div>
        {open.length === 0 && <p className="subtle" style={{ padding: "0 22px 18px" }}>Queue is clear.</p>}
        {open.map((r) => (
          <div key={r.id} style={{ borderTop: "1px solid #EDF1F8" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 22px" }}>
              <span style={{ width: 52, height: 36, borderRadius: 7, overflow: "hidden", flex: "0 0 52px" }}><PropThumb pid={r.propertyId} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>{r.description}</div>
                <div className="subtle" style={{ fontSize: 11.5 }}>{propById(r.propertyId).name} · {r.submittedBy} · {fmtTs(new Date(r.createdAt).toISOString())}</div>
              </div>
              <span className={`tag ${URGENCY_TAG[r.urgency]}`}>{r.urgency}</span>
              <button className="btn sm focusable" onClick={() => { setOpenId(openId === r.id ? null : r.id); setResult(null); }}>
                {openId === r.id ? "Close" : "Create invoice"}
              </button>
            </div>
            {openId === r.id && (
              <div style={{ padding: "0 22px 16px", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <input
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="Supplier (must exist in Xero)"
                  className="focusable"
                  style={{ flex: "1 1 220px", border: "1px solid var(--line)", borderRadius: 9, padding: "9px 12px", fontSize: 13, fontFamily: "inherit" }}
                />
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="£ inc. VAT"
                  inputMode="decimal"
                  className="focusable"
                  style={{ width: 110, border: "1px solid var(--line)", borderRadius: 9, padding: "9px 12px", fontSize: 13, fontFamily: "inherit" }}
                />
                <select
                  value={accountCode}
                  onChange={(e) => setAccountCode(e.target.value as typeof accountCode)}
                  className="focusable"
                  style={{ border: "1px solid var(--line)", borderRadius: 9, padding: "9px 10px", fontSize: 13, fontFamily: "inherit", background: "var(--surface)" }}
                >
                  <option value="408">408 · Cleaning</option>
                  <option value="473">473 · Repairs</option>
                  <option value="445">445 · Light/Power/Heat</option>
                  <option value="429">429 · General</option>
                </select>
                <button
                  className="btn sm focusable"
                  onClick={() => void stage(r)}
                  disabled={busy || !supplier.trim() || !(Number(amount) > 0) || !xeroConnected}
                  title={!xeroConnected ? "Connect Xero first" : undefined}
                >
                  {busy ? "Sending…" : "Send to Xero as pending →"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {rest.length > 0 && (
        <div className="card">
          <div className="pad" style={{ paddingBottom: 8 }}><div className="sect-t">Handled</div></div>
          {rest.map((r) => (
            <div key={r.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 22px", borderTop: "1px solid #EDF1F8" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.description}</div>
                <div className="subtle" style={{ fontSize: 11.5 }}>{propById(r.propertyId).name} · {r.submittedBy}</div>
              </div>
              <span className={`tag ${REPORT_STATUS_TAG[r.status]}`}>{r.status === "invoiced" ? "awaiting accountant" : r.status}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function ApprovalsTab({ onLedgerChange }: { onLedgerChange: () => void }) {
  const [items, setItems] = useState<ApiApproval[]>([]);
  const [denyingId, setDenyingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/approvals");
      setItems(((await res.json()) as { approvals: ApiApproval[] }).approvals);
    } catch { setItems([]); }
  }, []);
  React.useEffect(() => { void load(); }, [load]);

  const decide = async (id: string, decision: "approved" | "denied") => {
    if (busy) return;
    setBusy(true);
    try {
      await fetch(`/api/approvals/${id}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, ...(decision === "denied" ? { reason } : {}) }),
      });
      setDenyingId(null);
      setReason("");
      await load();
      onLedgerChange();
    } finally {
      setBusy(false);
    }
  };

  const pending = items.filter((a) => a.status === "pending");
  const decided = items.filter((a) => a.status !== "pending");

  return (
    <>
      <div className="head">
        <h1 className="h-title">Approvals</h1>
        <p className="h-sub">Bills staged by the operations team, pending in Xero. Approve to authorise payment from Xero, or deny with a reason — ShortStay itself never pays and never voids.</p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="pad" style={{ paddingBottom: 8 }}><div className="sect-t">Pending · {pending.length}</div></div>
        {pending.length === 0 && <p className="subtle" style={{ padding: "0 22px 18px" }}>Nothing waiting on you.</p>}
        {pending.map((a) => (
          <div key={a.id} style={{ borderTop: "1px solid #EDF1F8", padding: "14px 22px" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
              {a.detail?.propertyId && (
                <span style={{ width: 52, height: 36, borderRadius: 7, overflow: "hidden", flex: "0 0 52px" }}><PropThumb pid={a.detail.propertyId} /></span>
              )}
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{a.detail?.supplier} · {typeof a.detail?.grossInclVat === "number" ? money(a.detail.grossInclVat) : ""} · account {a.detail?.accountCode}</div>
                <div className="subtle" style={{ fontSize: 12.5, marginTop: 3 }}>&ldquo;{a.detail?.reportDescription}&rdquo;</div>
                <div className="subtle" style={{ fontSize: 11.5, marginTop: 4, fontFamily: "'Space Mono', monospace" }}>
                  staged by {a.stagedBy} · Xero {a.detail?.invoiceId?.slice(0, 8)}…{" "}
                  <a className="focusable" style={{ textDecoration: "underline" }} href={`https://go.xero.com/AccountsPayable/Edit.aspx?InvoiceID=${a.detail?.invoiceId}`} target="_blank" rel="noreferrer">View in Xero</a>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button className="btn sm focusable" onClick={() => void decide(a.id, "approved")} disabled={busy}>Approve</button>
                <button className="btn sm ghost focusable" onClick={() => setDenyingId(denyingId === a.id ? null : a.id)} disabled={busy}>Deny</button>
              </div>
            </div>
            {denyingId === a.id && (
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason (required to deny)"
                  className="focusable"
                  style={{ flex: 1, border: "1px solid var(--line)", borderRadius: 9, padding: "9px 12px", fontSize: 13, fontFamily: "inherit" }}
                />
                <button className="btn sm focusable" style={{ background: "var(--clay)", borderColor: "var(--clay)" }} onClick={() => void decide(a.id, "denied")} disabled={busy || !reason.trim()}>Confirm deny</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {decided.length > 0 && (
        <div className="card">
          <div className="pad" style={{ paddingBottom: 8 }}><div className="sect-t">Decided</div></div>
          {decided.map((a) => (
            <div key={a.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 22px", borderTop: "1px solid #EDF1F8" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.summary}</div>
                <div className="subtle" style={{ fontSize: 11.5 }}>decided by {a.decidedBy}</div>
              </div>
              <span className={`tag ${a.status === "approved" ? "approved" : "src"}`}>{a.status}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ---- contacts tab (live Xero) ---- */
function ContactsTab({ onMessage }: { onMessage: (name: string) => void }) {
  const [contacts, setContacts] = useState<{ contactId: string; name: string; isSupplier: boolean }[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "suppliers" | "landlords">("all");
  React.useEffect(() => {
    fetch("/api/xero/contacts").then((r) => r.json()).then((d) => setContacts(d.contacts ?? [])).catch(() => setContacts([]));
  }, []);
  const landlordNames = new Set(PROPERTIES.map((p) => LANDLORDS.find((l) => l.id === p.landlordId)?.name ?? ""));
  const shown = contacts.filter((c) => {
    if (q && !c.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter === "suppliers") return c.isSupplier;
    if (filter === "landlords") return landlordNames.has(c.name);
    return true;
  });
  return (
    <>
      <div className="head"><h1 className="h-title">Contacts</h1><p className="h-sub">Live from Xero — {contacts.length} contacts.</p></div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {(["all", "suppliers", "landlords"] as const).map((f) => (
          <button key={f} className={"chip focusable" + (filter === f ? " on" : "")} onClick={() => setFilter(f)}>{f}</button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="focusable"
          style={{ marginLeft: "auto", border: "1px solid var(--line)", borderRadius: 20, padding: "7px 14px", fontSize: 13, fontFamily: "inherit" }} />
      </div>
      <div className="card">
        <table className="led">
          <thead><tr><th>Name</th><th>Type</th><th className="r">Actions</th></tr></thead>
          <tbody>
            {shown.map((c) => (
              <tr key={c.contactId}>
                <td>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
                    <span style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--pine-soft)", color: "var(--pine)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>
                      {c.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                    </span>
                    <span className="prop-name">{c.name}</span>
                  </span>
                </td>
                <td>
                  {landlordNames.has(c.name) ? <span className="tag read">landlord</span> : c.isSupplier ? <span className="tag draft">supplier</span> : <span className="tag src">contact</span>}
                </td>
                <td className="r"><button className="btn sm ghost focusable" onClick={() => onMessage(c.name)}>Message</button></td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={3} className="subtle" style={{ padding: 16 }}>No matches.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ---- messenger dock (POC — client-side threads) ---- */
interface PocMsg { from: string; body: string; ts: string; mine: boolean }
interface PocThread { id: string; name: string; kind: string; msgs: PocMsg[]; unread: boolean }
const SEED_THREADS: PocThread[] = [
  { id: "t1", name: "Amara Okafor", kind: "landlord", unread: true, msgs: [
    { from: "Amara Okafor", body: "Hi — quick one, when does the June statement land? Mortgage payment on the 8th.", ts: "09:12", mine: false },
    { from: "Amara Okafor", body: "Also is the Dockside plumbing invoice in there?", ts: "09:14", mine: false },
  ]},
  { id: "t2", name: "Priya Raman", kind: "lead", unread: true, msgs: [
    { from: "Priya Raman", body: "Hello! Is Gasholder Studio free 21–25 August for 2 guests?", ts: "Yesterday", mine: false },
  ]},
  { id: "t3", name: "Tom Whitfield", kind: "teammate", unread: false, msgs: [
    { from: "Tom Whitfield", body: "Before you approve — the plumber bill looks doubled vs the receipt. Check the capture?", ts: "Thu", mine: false },
    { from: "me", body: "On it — re-checking against the receipt now.", ts: "Thu", mine: true },
  ]},
];

function Dock({ popups, threads, onOpen, onClose, onMin, onReply }: {
  popups: { id: string; minimized: boolean }[];
  threads: PocThread[];
  onOpen: (id: string) => void;
  onClose: (id: string) => void;
  onMin: (id: string) => void;
  onReply: (id: string, body: string) => void;
}) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  return (
    <div style={{ position: "fixed", bottom: 0, right: 18, zIndex: 60, display: "flex", flexDirection: "row-reverse", alignItems: "flex-end", gap: 10 }}>
      {popups.map((p) => {
        const t = p.id === "inbox" ? null : threads.find((x) => x.id === p.id);
        return (
          <div key={p.id} style={{ width: 320, height: p.minimized ? "auto" : 400, display: "flex", flexDirection: "column", background: "var(--surface)", border: "1px solid var(--line)", borderBottom: "none", borderRadius: "12px 12px 0 0", boxShadow: "0 -2px 8px rgba(11,31,75,.08), 0 -12px 32px -12px rgba(11,31,75,.28)", overflow: "hidden" }}>
            <div onClick={() => onMin(p.id)} style={{ background: "var(--ink)", color: "#fff", fontWeight: 600, fontSize: 13, padding: "9px 10px 9px 14px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t ? t.name : "Messages"}</span>
              <button onClick={(e) => { e.stopPropagation(); onMin(p.id); }} className="focusable" style={{ background: "none", border: "none", color: "#AEBEDF", width: 22 }}>−</button>
              <button onClick={(e) => { e.stopPropagation(); onClose(p.id); }} className="focusable" style={{ background: "none", border: "none", color: "#AEBEDF", width: 22 }}>×</button>
            </div>
            {!p.minimized && (t ? (
              <>
                <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px", background: "#FBFCFE" }}>
                  {t.msgs.map((m, i) => (
                    <div key={i} style={{ maxWidth: "82%", padding: "8px 11px", borderRadius: 12, fontSize: 13, lineHeight: 1.45, marginBottom: 8, ...(m.mine ? { background: "var(--pine2)", color: "#fff", marginLeft: "auto", borderBottomRightRadius: 4 } : { background: "var(--sand)", borderBottomLeftRadius: 4 }) }}>
                      {m.body}
                      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, opacity: 0.65, marginTop: 3 }}>{m.ts}</div>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: "1px solid var(--line)", padding: 9, display: "flex", gap: 7, background: "var(--surface)" }}>
                  <input value={draft[t.id] ?? ""} onChange={(e) => setDraft((d) => ({ ...d, [t.id]: e.target.value }))} placeholder="Reply…" className="focusable"
                    onKeyDown={(e) => { if (e.key === "Enter" && (draft[t.id] ?? "").trim()) { onReply(t.id, draft[t.id]); setDraft((d) => ({ ...d, [t.id]: "" })); } }}
                    style={{ flex: 1, border: "1px solid var(--line)", borderRadius: 9, padding: "8px 11px", fontSize: 13, fontFamily: "inherit" }} />
                  <button className="btn sm focusable" disabled={!(draft[t.id] ?? "").trim()} onClick={() => { onReply(t.id, draft[t.id]); setDraft((d) => ({ ...d, [t.id]: "" })); }}>Send</button>
                </div>
              </>
            ) : (
              <div style={{ flex: 1, overflowY: "auto", background: "#FBFCFE" }}>
                {threads.map((th) => (
                  <button key={th.id} onClick={() => onOpen(th.id)} className="focusable" style={{ display: "flex", gap: 10, alignItems: "center", width: "100%", textAlign: "left", background: "none", border: "none", borderBottom: "1px solid #EDF1F8", padding: "11px 12px", cursor: "pointer" }}>
                    <span style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--pine-soft)", color: "var(--pine)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 700, flex: "0 0 30px" }}>
                      {th.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontWeight: 600, fontSize: 13, color: "var(--ink)" }}>{th.name} <span className="tag src" style={{ marginLeft: 4 }}>{th.kind}</span></span>
                      <span style={{ display: "block", fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{th.msgs.at(-1)?.body}</span>
                    </span>
                    {th.unread && <span className="pip">•</span>}
                  </button>
                ))}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/* ================================================================= app ==== */
export default function ShortStayApp({ userName, role }: { userName: string; role: Role }) {
  const [tab, setTab] = useState<TabKey>(role === "cleaner" ? "report" : "overview");
  const [statements, setStatements] = useState<Record<string, ApiStatement | undefined>>({});
  const [auditEvents, setAuditEvents] = useState<ApiAuditEvent[]>([]);
  const [xero, setXero] = useState<ApiXeroStatus | null>(null);

  const refresh = React.useCallback(async () => {
    const [stmtResults, auditRes, xeroRes] = await Promise.all([
      Promise.all(
        LANDLORD_IDS.map(async (lid) => {
          try {
            const res = await fetch(`/api/statements/${lid}`);
            if (!res.ok) return [lid, undefined] as const;
            return [lid, (await res.json()) as ApiStatement] as const;
          } catch {
            return [lid, undefined] as const;
          }
        })
      ),
      fetch("/api/audit?limit=200").then((r) => (r.ok ? r.json() : { events: [] })).catch(() => ({ events: [] })),
      fetch("/api/xero/status").then((r) => (r.ok ? r.json() : { connected: false })).catch(() => ({ connected: false })),
    ]);
    setStatements(Object.fromEntries(stmtResults));
    setAuditEvents((auditRes as { events: ApiAuditEvent[] }).events ?? []);
    setXero(xeroRes as ApiXeroStatus);
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const hasDraftedBill = auditEvents.some((e) => e.eventType === "bill.drafted");

  // Messenger POC — client-side threads + Gmail-style dock.
  const [threads, setThreads] = useState<PocThread[]>(SEED_THREADS);
  const [popups, setPopups] = useState<{ id: string; minimized: boolean }[]>([]);
  const openPopup = (id: string) =>
    setPopups((ps) => {
      if (ps.some((p) => p.id === id)) return ps.map((p) => (p.id === id ? { ...p, minimized: false } : p));
      const next = [{ id, minimized: false }, ...ps];
      return next.slice(0, 3); // POC cap: 3 windows
    });
  const openThread = (id: string) => {
    setThreads((ts) => ts.map((t) => (t.id === id ? { ...t, unread: false } : t)));
    openPopup(id);
  };
  const openMessageTo = (name: string) => {
    const existing = threads.find((t) => t.name === name);
    if (existing) { openThread(existing.id); return; }
    const id = `t-${name.toLowerCase().replace(/\W+/g, "-")}`;
    setThreads((ts) => [{ id, name, kind: "contact", unread: false, msgs: [] }, ...ts]);
    openPopup(id);
  };
  const reply = (id: string, body: string) =>
    setThreads((ts) => ts.map((t) => (t.id === id ? { ...t, msgs: [...t.msgs, { from: "me", body, ts: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }), mine: true }] } : t)));
  const unreadCount = threads.filter((t) => t.unread).length;

  const NAV_ALL: [TabKey, string, React.ReactElement, number?][] = [
    ["overview", "Overview", I.overview],
    ["report", "Report an issue", I.capture],
    ["fieldreports", "Field reports", I.reconcile],
    ["capture", "Capture", I.capture, 1],
    ["statements", "Statements", I.statements],
    ["approvals", "Approvals", I.statements],
    ["reconcile", "Reconcile", I.reconcile],
    ["agents", "Agents", I.agents],
    ["ledger", "Ledger & trust", I.ledger],
  ];
  const nav = NAV_ALL.filter(([k]) => ROLE_TABS[role].includes(k));

  return (
    <div className="ss-root">
      <Style />
      <aside className="side">
        <div className="brand">
          <Mark />
          <div>
            <div className="brand-name">ShortStay</div>
            <div className="brand-sub">Xero back office</div>
          </div>
        </div>
        <nav className="nav">
          {nav.map(([k, lab, ico, pip]) => (
            <button key={k} className={"nav-b focusable" + (tab === k ? " on" : "")} onClick={() => setTab(k)}>
              <Ico d={ico} cls="ico" /> {lab}
              {pip && tab !== "capture" && !hasDraftedBill && k === "capture" && <span className="pip">1</span>}
            </button>
          ))}
          {role !== "cleaner" && (
            <button className="nav-b focusable" onClick={() => openPopup("inbox")}>
              <Ico d={<path d="M4 5h16v11H8l-4 4z" />} cls="ico" /> Messages
              {unreadCount > 0 && <span className="pip">{unreadCount}</span>}
            </button>
          )}
        </nav>
        <div className="side-spacer" />
        <div className="seal" style={{ marginBottom: 10 }}>
          {xero?.connected ? (
            <>
              <div className="seal-top"><span className="seal-dot" /> {xero.tenantName}</div>
              <div className="seal-txt">
                Live Xero connection · {xero.grantedScopes?.filter((s) => s.startsWith("accounting.")).length ?? 0} accounting scopes
                {typeof xero.expiresAt === "number" && <> · token ~{Math.max(0, Math.round((xero.expiresAt - Date.now()) / 60_000))} min</>}
                <div style={{ marginTop: 8 }}>
                  <a className="focusable" href="/api/auth/disconnect" style={{ color: "#CFDCF2", fontSize: 11, textDecoration: "underline" }}>Disconnect</a>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="seal-top"><span className="seal-dot" style={{ background: "var(--clay)", boxShadow: "0 0 0 4px rgba(158,74,52,.18)" }} /> Xero not connected</div>
              <div className="seal-txt">
                Reads and drafts need a live org.
                <div style={{ marginTop: 8 }}>
                  <a className="focusable" href="/api/auth/connect" style={{ display: "inline-block", background: "var(--pine2)", color: "#fff", fontWeight: 600, fontSize: 12, padding: "7px 12px", borderRadius: 8, textDecoration: "none" }}>Sign in with Xero →</a>
                </div>
              </div>
            </>
          )}
        </div>
        <form action={logout}>
          <button type="submit" className="logout-b focusable">Log out</button>
        </form>
      </aside>

      <main className="main">
        {tab === "overview" && <Overview statements={statements} xero={xero} go={setTab} />}
        {tab === "report" && <ReportForm userName={userName} onLedgerChange={() => void refresh()} />}
        {tab === "fieldreports" && <FieldReports xeroConnected={!!xero?.connected} onLedgerChange={() => void refresh()} />}
        {tab === "capture" && <Capture audit={auditEvents} xeroConnected={!!xero?.connected} onLedgerChange={() => void refresh()} />}
        {tab === "statements" && <Statements statements={statements} onRefresh={() => void refresh()} />}
        {tab === "approvals" && <ApprovalsTab onLedgerChange={() => void refresh()} />}
        {tab === "contacts" && <ContactsTab onMessage={openMessageTo} />}
        {tab === "reconcile" && <Reconcile onLedgerChange={() => void refresh()} />}
        {tab === "agents" && <Agents />}
        {tab === "ledger" && <Ledger audit={auditEvents} xero={xero} />}
      </main>

      {role !== "cleaner" && (
        <Dock
          popups={popups}
          threads={threads}
          onOpen={openThread}
          onClose={(id) => setPopups((ps) => ps.filter((p) => p.id !== id))}
          onMin={(id) => setPopups((ps) => ps.map((p) => (p.id === id ? { ...p, minimized: !p.minimized } : p)))}
          onReply={reply}
        />
      )}
    </div>
  );
}
