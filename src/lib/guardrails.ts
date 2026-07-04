import "server-only";

// Guardrails: pure decision functions gating the statement approval action.
// Guards decide; they never act. Shape ported from the substrate pattern
// (PEA/.brain/substrate) — combine() is strictly escalate > pause > allow.

export type GuardDecision = "allow" | "pause" | "escalate";

export interface GuardResult {
  readonly name: string;
  readonly decision: GuardDecision;
  readonly reason: string;
}

export function combine(results: readonly GuardResult[]): GuardDecision {
  if (results.some((r) => r.decision === "escalate")) return "escalate";
  if (results.some((r) => r.decision === "pause")) return "pause";
  return "allow";
}

// Guard 1 — no-money-movement. The only action kind this system can ever be
// asked to approve is a statement. Anything that smells like a payment,
// transfer, or send escalates immediately.
export function noMoneyMovement(actionKind: string): GuardResult {
  const allowed = actionKind === "approve-statement";
  return {
    name: "no-money-movement",
    decision: allowed ? "allow" : "escalate",
    reason: allowed
      ? "approval flags for release; no Payment or transfer is issued"
      : `action kind "${actionKind}" is not approvable — only approve-statement exists`,
  };
}

export interface StatementLineForGuard {
  readonly sourceType: string;
  readonly sourceId: string;
  readonly amountPence: number;
  readonly billStatus?: string;
}

export interface StatementTotalsForGuard {
  readonly grossPence: number;
  readonly commissionPence: number;
  readonly feePence: number;
  readonly costsPence: number;
  readonly owedPence: number;
}

// Guard 2 — statement-completeness. Pauses (never escalates — this is a
// data-quality problem, not a boundary violation) if any line lacks a
// source, the totals don't reconcile to the penny, or a cost bill has been
// voided/deleted in Xero since assembly.
export function statementCompleteness(
  lines: readonly StatementLineForGuard[],
  totals: StatementTotalsForGuard
): GuardResult {
  const missingSource = lines.filter((l) => !l.sourceId || !l.sourceType);
  if (missingSource.length > 0) {
    return {
      name: "statement-completeness",
      decision: "pause",
      reason: `${missingSource.length} line(s) lack a sourceId — every number must trace to its Xero source`,
    };
  }

  const badBills = lines.filter(
    (l) => l.billStatus === "VOIDED" || l.billStatus === "DELETED"
  );
  if (badBills.length > 0) {
    return {
      name: "statement-completeness",
      decision: "pause",
      reason: `${badBills.length} cost bill(s) are VOIDED/DELETED in Xero — reassemble before approving`,
    };
  }

  const computed =
    totals.grossPence -
    totals.commissionPence -
    totals.feePence -
    totals.costsPence;
  if (computed !== totals.owedPence) {
    return {
      name: "statement-completeness",
      decision: "pause",
      reason: `totals do not reconcile: gross − commission − fee − costs = ${computed}p but owed = ${totals.owedPence}p`,
    };
  }

  return {
    name: "statement-completeness",
    decision: "allow",
    reason: "every line traces to a Xero source and totals reconcile to the penny",
  };
}
