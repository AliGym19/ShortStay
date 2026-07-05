"use client";

import React, { useMemo, useState } from "react";

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

  :root{
    --ink:#16241E; --pine:#244638; --pine2:#2E5A47; --pine-soft:#EAF0EC;
    --paper:#F7F4ED; --surface:#FFFFFF; --sand:#EFE9DB; --line:#E1D9C8;
    --txt:#1B2B24; --muted:#63614F; --faint:#8C8974;
    --amber:#B8781E; --amber-soft:#F5EBD6;
    --teal:#3C6E63; --teal-soft:#E4EEEB;
    --clay:#9E4A34; --clay-soft:#F2E2DC;
    --sage:#3E7D5E; --sage-soft:#E4F0E9;
    --shadow:0 1px 2px rgba(22,36,30,.05), 0 8px 24px -14px rgba(22,36,30,.18);
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
  ::selection{background:#D9E4DD}
  a{color:inherit}

  /* ---- sidebar ---- */
  .side{width:238px; flex:0 0 238px; background:var(--ink); color:#DDE6E0;
    display:flex; flex-direction:column; padding:22px 16px; position:sticky; top:0; height:100vh;}
  .brand{display:flex; align-items:center; gap:10px; padding:2px 6px 18px;}
  .brand-mark{width:30px;height:30px;flex:0 0 30px}
  .brand-name{font-family:'Space Grotesk';font-weight:700;font-size:19px;color:#fff;letter-spacing:-.01em}
  .brand-sub{font-size:11px;color:#8FA69B;margin-top:1px;letter-spacing:.02em}
  .nav{display:flex;flex-direction:column;gap:2px;margin-top:6px}
  .nav-b{display:flex;align-items:center;gap:11px;width:100%;text-align:left;background:none;border:none;
    color:#AEC0B7;padding:10px 12px;border-radius:9px;font-size:14.5px;font-weight:500;transition:.15s}
  .nav-b:hover{background:rgba(255,255,255,.05);color:#EAF2ED}
  .nav-b.on{background:var(--pine2);color:#fff}
  .nav-b .ico{width:17px;height:17px;flex:0 0 17px;opacity:.9}
  .nav-b .pip{margin-left:auto;background:var(--amber);color:#231a08;font-size:11px;font-weight:700;
    border-radius:20px;padding:1px 7px;font-family:'Space Mono'}
  .side-spacer{flex:1}
  .seal{background:linear-gradient(180deg,#1C2E27,#182620);border:1px solid #2C4034;border-radius:12px;
    padding:13px 13px 12px;}
  .seal-top{display:flex;align-items:center;gap:8px;font-family:'Space Grotesk';font-weight:600;font-size:12.5px;color:#EAF2ED}
  .seal-dot{width:7px;height:7px;border-radius:50%;background:var(--sage);box-shadow:0 0 0 4px rgba(62,125,94,.18)}
  .seal-txt{font-size:11.5px;line-height:1.45;color:#93A79D;margin-top:7px}
  .seal-txt b{color:#CFded6;font-weight:600}

  /* ---- main ---- */
  .main{flex:1;min-width:0;padding:30px 40px 64px;max-width:1180px}
  .head{margin-bottom:24px}
  .eyebrow{font-size:11.5px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--amber);margin-bottom:8px}
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
  .receipt{background:#FCFBF6;border:1px dashed var(--line);border-radius:12px;padding:0;overflow:hidden}
  .receipt textarea{width:100%;border:none;background:transparent;resize:vertical;min-height:210px;
    font-family:'Space Mono';font-size:12.5px;line-height:1.7;color:#3a382c;padding:18px 18px;outline:none}
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
  .gate-h{padding:15px 18px;display:flex;align-items:center;justify-content:space-between;gap:14px}
  .guard-line{display:flex;align-items:center;gap:10px;font-size:13px;padding:8px 18px;border-top:1px solid #F0EBDE}
  .guard-line .gd{width:8px;height:8px;border-radius:50%;flex:0 0 8px}
  .guard-line .gn{font-family:'Space Mono';font-size:12px;color:var(--muted)}
  .guard-line .gr{margin-left:auto;font-size:12.5px;color:var(--muted)}

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

  .callout{background:var(--pine-soft);border:1px solid #CFE0D6;border-radius:12px;padding:15px 18px;font-size:13.5px;line-height:1.55;color:#23392F}
  .callout b{font-weight:600}

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
  .focusable:focus-visible{outline:2.5px solid var(--amber);outline-offset:2px;border-radius:8px}
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
type TabKey = "overview" | "capture" | "statements" | "reconcile" | "ledger";

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
  ledger: <path d="M4 3h13a2 2 0 0 1 2 2v16l-3-2-2 2-2-2-2 2-2-2-3 2V5a2 2 0 0 1 2-2zM8 8h8M8 12h6" />,
};
const Ico = ({ d, cls = "ico" }: { d: React.ReactElement; cls?: string }) => (
  <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);
const Mark = () => (
  <svg className="brand-mark" viewBox="0 0 40 40" fill="none">
    <rect x="2" y="2" width="36" height="36" rx="9" fill="#2E5A47" />
    <path d="M12 27V15l8-5 8 5v12" stroke="#EAF2ED" strokeWidth="2.2" strokeLinejoin="round" />
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
function KPI({ lab, big, foot, color, icon }: {
  lab: string; big: string; foot: string; color: string; icon: React.ReactNode;
}) {
  return (
    <div className="kpi">
      <div className="stripe" style={{ background: color }} />
      <div className="lab">{icon}{lab}</div>
      <div className="big num">{big}</div>
      <div className="foot">{foot}</div>
    </div>
  );
}

function Overview({ statements, go }: {
  statements: Record<string, ApiStatement | undefined>;
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
        <div className="eyebrow">June 2026 · month to date</div>
        <h1 className="h-title">The paperwork runs itself.<br />You approve every payout.</h1>
        <p className="h-sub">Booking revenue and costs are read from Xero, coded to the right property, and assembled into a landlord-ready P&amp;L. ShortStay drafts and flags — it never sends money.</p>
      </div>

      <div className="grid3" style={{ marginBottom: 16 }}>
        <KPI lab="Owed to landlords" big={owed} foot={`Across ${loaded.length || "…"} landlords · awaiting your approval`} color="var(--pine)"
          icon={<Ico d={<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />} cls="ico" />} />
        <KPI lab="Agency earned" big={earned} foot="Management fee, 12% of gross bookings" color="var(--teal)"
          icon={<Ico d={<path d="M3 3v18h18M7 15l4-4 3 3 5-6" />} cls="ico" />} />
        <KPI lab="Held for approval" big={String(pending)} foot={`${owed} in statements · live from the gate`} color="var(--amber)"
          icon={<Ico d={<path d="M12 8v5M12 16h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />} cls="ico" />} />
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

function Capture({ audit, onLedgerChange }: { audit: ApiAuditEvent[]; onLedgerChange: () => void }) {
  const [text, setText] = useState(INBOX_RECEIPTS.plumbing);
  const [state, setState] = useState<CaptureState>("idle");
  const [fields, setFields] = useState<CodedFields | null>(null);
  const [via, setVia] = useState<string | null>(null);
  const [drafted, setDrafted] = useState<ApiDraftBillResult | null>(null);
  const [meta, setMeta] = useState<{ receiptId: string; codedEventId: string } | null>(null);

  const load = (k: string) => { setText(INBOX_RECEIPTS[k]); setState("idle"); setFields(null); setDrafted(null); setMeta(null); };

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
        <div className="eyebrow">Step 1 · the agent does the admin</div>
        <h1 className="h-title">Code a receipt into a draft bill</h1>
        <p className="h-sub">Drop the supplier receipt. Claude reads it, extracts the figures, picks the account and the property, and creates a <b>draft</b> ACCPAY bill in Xero. You confirm before anything is written.</p>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <span className="subtle" style={{ alignSelf: "center", marginRight: 4 }}>Inbox:</span>
        {([["plumbing", "Plumbing · Dockside"], ["cleaning", "Clean · Gasholder"], ["linen", "Linen · Tin Quarter"]] as const).map(([k, lab]) => (
          <button key={k} className={"chip focusable" + (text === INBOX_RECEIPTS[k] ? " on" : "")} onClick={() => load(k)}>{lab}</button>
        ))}
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
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
                <span className="tag draft">Xero · ACCPAY · DRAFT</span>
                <span className="subtle" style={{ fontSize: 12 }}>confidence {(fields.confidence * 100).toFixed(0)}%</span>
                {state === "coded" && <button className="btn sm focusable" style={{ marginLeft: "auto" }} onClick={draft}>Create draft bill in Xero →</button>}
                {state === "drafting" && <span className="subtle" style={{ marginLeft: "auto", display: "inline-flex", gap: 8, alignItems: "center" }}><span className="spinner dk" /> Writing draft…</span>}
              </div>

              {state === "drafted" && drafted?.ok && (
                <div className="callout" style={{ marginTop: 16 }}>
                  <b>Draft bill created in Xero</b> — <span className="mono" style={{ fontSize: 12 }}>{drafted.invoiceId}</span>, coded {money(fields.gross)} to {fields.code} for {fields.propName}. Read back and verified <b>DRAFT</b> — it waits in Xero for a human to approve.{" "}
                  <a className="focusable" style={{ fontWeight: 600, textDecoration: "underline" }} href={`https://go.xero.com/AccountsPayable/Edit.aspx?InvoiceID=${drafted.invoiceId}`} target="_blank" rel="noreferrer">View in Xero →</a>
                  {drafted.warning && <div className="subtle" style={{ marginTop: 8, fontSize: 12 }}>⚠ {drafted.warning}</div>}
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
        <div className="eyebrow">Step 2 · the demo climax</div>
        <h1 className="h-title">Per-landlord monthly statement</h1>
        <p className="h-sub">Revenue in, commission and fee and costs out, owed to landlord — every line traceable to its Xero source. This is the landlord&apos;s tax document and your value in one artifact. It is never auto-sent.</p>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {LANDLORDS.map((l) => (
          <button key={l.id} className={"chip focusable" + (lid === l.id ? " on" : "")} onClick={() => setLid(l.id)}>{l.name}</button>
        ))}
        <span className="chip" style={{ marginLeft: "auto", cursor: "default" }}>{st?.month ?? "June 2026"}</span>
      </div>

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

          {perProp.map(({ p, revenue, commission, fee, owed, stays, costs: pc }) => (
            <div className="card" key={p.id} style={{ marginBottom: 14 }}>
              <div className="pad" style={{ paddingBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div className="sect-t">{p.name} <span className="subtle" style={{ fontWeight: 400 }}>· {p.area}</span></div>
                <div className="num" style={{ fontWeight: 700 }}>{penceToMoney(owed)} <span className="subtle" style={{ fontWeight: 400, fontSize: 12 }}>owed</span></div>
              </div>
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
          ))}
        </>
      )}

      <div className="card" style={{ marginTop: 4 }}>
        <div className="gate-h">
          <div>
            <div className="sect-t"><Ico d={<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM5 11V8a7 7 0 0 1 14 0v3M4 11h16v10H4z" />} cls="ico" /> Human approval gate</div>
            <div className="subtle" style={{ marginTop: 5, fontSize: 12.5 }}>Guards decide; they never act. ShortStay cannot release funds — approval only authorises you to.</div>
          </div>
          {status === "approved"
            ? <span className="tag approved" style={{ fontSize: 12.5, padding: "6px 12px" }}>✓ Approved for release · you authorised</span>
            : <button className="btn focusable" onClick={approve} disabled={!st}>{status === "held" ? "Re-run guards" : "Approve statement for release"}</button>}
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
          <div className="callout" style={{ margin: "4px 18px 18px" }}>
            <b>Statement approved.</b> ShortStay recorded <span className="mono">statement.approved</span> and stopped. No <span className="mono">Payment</span>, no <span className="mono">BankTransfer</span> — the payout is yours to send from Xero. The audit chain proves nothing moved.
            {gateResult?.note && <div className="mono" style={{ marginTop: 8, fontSize: 11.5 }}>server said: “{gateResult.note}”</div>}
          </div>
        )}
        {status === "held" && (
          <div className="callout" style={{ margin: "4px 18px 18px", background: "var(--amber-soft)", borderColor: "var(--amber)" }}>
            <b>Statement held.</b> The gate returned <span className="mono">409 · {gateResult?.decision}</span> and recorded <span className="mono">statement.held</span>. Resolve the guard reasons above and re-run — nothing is approvable until the guards allow it.
          </div>
        )}
      </div>
    </>
  );
}

function Reconcile() {
  const [matched, setMatched] = useState(false);
  const subset = ["bk-201", "bk-207", "bk-231", "bk-238", "bk-261", "bk-268"];
  const rows = BOOKINGS.filter((b) => subset.includes(b.id)).map((b) => ({ ...b, net: round2(b.gross * 0.85) }));
  const payout = round2(rows.reduce((s, r) => s + r.net, 0));
  const bySplit = PROPERTIES.map((p) => ({ p, net: round2(rows.filter((r) => r.propertyId === p.id).reduce((s, r) => s + r.net, 0)) })).filter((x) => x.net > 0);

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
          {!matched && <button className="btn sm focusable" onClick={() => setMatched(true)}>Match payout to bookings</button>}
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
          <p className="subtle" style={{ marginTop: 14, fontSize: 12.5 }}>Reconciled to the penny · <span className="mono">{money(payout)}</span>. Feeds each property&apos;s revenue line on the landlord statement.</p>
        </div>
      )}
    </>
  );
}

function Ledger({ audit }: { audit: ApiAuditEvent[] }) {
  const [filter, setFilter] = useState("all");
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
          <div className="sect-t" style={{ marginBottom: 12 }}><span className="seal-dot" style={{ position: "relative", top: 0 }} /> Granted scopes — read + one draft write</div>
          {SCOPES_GRANTED.map((x) => (
            <div className="scope grant" key={x.s}>
              <span className="sc-name" style={{ color: x.s === "accounting.invoices" ? "var(--pine)" : "var(--txt)" }}>{x.s}</span>
              {x.s === "accounting.invoices" ? <span className="tag draft">WRITE · draft only</span> : <span className="tag read">read</span>}
              <span className="sc-why">{x.why}</span>
            </div>
          ))}
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
    </>
  );
}

/* ================================================================= app ==== */
export default function ShortStayApp() {
  const [tab, setTab] = useState<TabKey>("overview");
  const [statements, setStatements] = useState<Record<string, ApiStatement | undefined>>({});
  const [auditEvents, setAuditEvents] = useState<ApiAuditEvent[]>([]);

  const refresh = React.useCallback(async () => {
    const [stmtResults, auditRes] = await Promise.all([
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
    ]);
    setStatements(Object.fromEntries(stmtResults));
    setAuditEvents((auditRes as { events: ApiAuditEvent[] }).events ?? []);
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const hasDraftedBill = auditEvents.some((e) => e.eventType === "bill.drafted");

  const nav: [TabKey, string, React.ReactElement, number?][] = [
    ["overview", "Overview", I.overview],
    ["capture", "Capture", I.capture, 1],
    ["statements", "Statements", I.statements],
    ["reconcile", "Reconcile", I.reconcile],
    ["ledger", "Ledger & trust", I.ledger],
  ];

  return (
    <div className="ss-root">
      <Style />
      <aside className="side">
        <div className="brand">
          <Mark />
          <div>
            <div className="brand-name">ShortStay</div>
            <div className="brand-sub">Xero back office · short-lets</div>
          </div>
        </div>
        <nav className="nav">
          {nav.map(([k, lab, ico, pip]) => (
            <button key={k} className={"nav-b focusable" + (tab === k ? " on" : "")} onClick={() => setTab(k)}>
              <Ico d={ico} cls="ico" /> {lab}
              {pip && tab !== "capture" && !hasDraftedBill && k === "capture" && <span className="pip">1</span>}
            </button>
          ))}
        </nav>
        <div className="side-spacer" />
        <div className="seal">
          <div className="seal-top"><span className="seal-dot" /> Never moves money</div>
          <div className="seal-txt">ShortStay can <b>read</b> and <b>draft</b>. It holds no payment scope, writes no <b>Payment</b> or <b>transfer</b>, and logs every action. You approve every payout.</div>
        </div>
      </aside>

      <main className="main">
        {tab === "overview" && <Overview statements={statements} go={setTab} />}
        {tab === "capture" && <Capture audit={auditEvents} onLedgerChange={() => void refresh()} />}
        {tab === "statements" && <Statements statements={statements} onRefresh={() => void refresh()} />}
        {tab === "reconcile" && <Reconcile />}
        {tab === "ledger" && <Ledger audit={auditEvents} />}
      </main>
    </div>
  );
}
