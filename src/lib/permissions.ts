// Role → capability map for the multi-user CRM. Enforcement happens
// server-side where it matters (statement approval, bill approval); the
// client uses the same map to shape which tabs a persona sees.

export type Role = "cleaner" | "operations" | "accountant";

export type Capability =
  | "submit-reports"
  | "review-reports" // ops: field-report queue + create invoice
  | "review-bookings" // ops: booking queue + raise ACCREC
  | "capture"
  | "contacts"
  | "messages"
  | "approve-bills" // accountant: decide staged bill approvals
  | "approve-statements" // accountant: the statement gate
  | "view-financials" // statements, reconcile, ledger, financial overview
  | "overview";

const CAPABILITIES: Record<Role, readonly Capability[]> = {
  cleaner: ["submit-reports"],
  operations: [
    "submit-reports",
    "review-reports",
    "review-bookings",
    "capture",
    "contacts",
    "messages",
    "overview",
  ],
  accountant: [
    "approve-bills",
    "approve-statements",
    "view-financials",
    "capture",
    "contacts",
    "messages",
    "overview",
  ],
};

// Session roles predate this module ("Operations" etc.) — normalise loosely.
export function normaliseRole(raw: string): Role {
  const r = raw.toLowerCase();
  if (r.includes("clean")) return "cleaner";
  if (r.includes("account") || r.includes("financ")) return "accountant";
  return "operations";
}

export function can(role: Role, capability: Capability): boolean {
  return CAPABILITIES[role].includes(capability);
}
