import "server-only";

// Per-landlord statement assembly — pure functions over already-fetched
// inputs so the math is testable without Xero. All money is integer pence;
// formatting happens at the edge. The penny assertion at the bottom is the
// spec's hard invariant: gross − commission − fee − costs === owed, exactly.

export interface StatementProperty {
  readonly id: string;
  readonly name: string;
  readonly landlordContactId: string;
  readonly commissionRate: number; // 0.15
  readonly agencyFeeRate: number; // 0.12
}

export interface RevenueInput {
  readonly propertyId: string;
  readonly description: string;
  readonly amountPence: number;
  readonly sourceType: "xero.banktransaction" | "booking.seed";
  readonly sourceId: string;
  readonly date: string;
}

export interface CostInput {
  readonly propertyId: string;
  readonly description: string;
  readonly supplier: string;
  readonly amountPence: number;
  readonly sourceId: string; // Xero InvoiceID
  readonly billStatus: string; // DRAFT | SUBMITTED | AUTHORISED | ...
  readonly accountCode?: string;
  readonly date: string;
}

export interface StatementLine {
  readonly kind: "revenue" | "commission" | "fee" | "cost" | "owed";
  readonly propertyId: string;
  readonly description: string;
  readonly amountPence: number; // deductions carry positive magnitudes; kind says the sign
  readonly sourceType: string;
  readonly sourceId: string; // Xero id or "computed"
  readonly billStatus?: string;
  readonly date?: string;
}

export interface StatementTotals {
  readonly grossPence: number;
  readonly commissionPence: number;
  readonly feePence: number;
  readonly costsPence: number;
  readonly owedPence: number;
}

export interface AssembledStatement {
  readonly landlordContactId: string;
  readonly month: string;
  readonly lines: readonly StatementLine[];
  readonly totals: StatementTotals;
}

export class StatementReconciliationError extends Error {}

const pct = (pence: number, rate: number) => Math.round(pence * rate);

export function assembleStatement(
  landlordContactId: string,
  month: string,
  properties: readonly StatementProperty[],
  revenue: readonly RevenueInput[],
  costs: readonly CostInput[]
): AssembledStatement {
  const mine = properties.filter(
    (p) => p.landlordContactId === landlordContactId
  );
  const lines: StatementLine[] = [];

  let grossPence = 0;
  let commissionPence = 0;
  let feePence = 0;
  let costsPence = 0;

  for (const p of mine) {
    const propRevenue = revenue.filter((r) => r.propertyId === p.id);
    const propCosts = costs.filter((c) => c.propertyId === p.id);
    const propGross = propRevenue.reduce((s, r) => s + r.amountPence, 0);
    const propCommission = pct(propGross, p.commissionRate);
    const propFee = pct(propGross, p.agencyFeeRate);

    for (const r of propRevenue) {
      lines.push({
        kind: "revenue",
        propertyId: p.id,
        description: r.description,
        amountPence: r.amountPence,
        sourceType: r.sourceType,
        sourceId: r.sourceId,
        date: r.date,
      });
    }
    lines.push({
      kind: "commission",
      propertyId: p.id,
      description: `Booking.com commission ${(p.commissionRate * 100).toFixed(0)}%`,
      amountPence: propCommission,
      sourceType: "computed",
      sourceId: "computed",
    });
    lines.push({
      kind: "fee",
      propertyId: p.id,
      description: `Agency management fee ${(p.agencyFeeRate * 100).toFixed(0)}%`,
      amountPence: propFee,
      sourceType: "computed",
      sourceId: "computed",
    });
    for (const c of propCosts) {
      lines.push({
        kind: "cost",
        propertyId: p.id,
        description: `${c.description} · ${c.supplier}`,
        amountPence: c.amountPence,
        sourceType: "xero.invoice",
        sourceId: c.sourceId,
        billStatus: c.billStatus,
        date: c.date,
      });
    }

    grossPence += propGross;
    commissionPence += propCommission;
    feePence += propFee;
    costsPence += propCosts.reduce((s, c) => s + c.amountPence, 0);
  }

  const owedPence = grossPence - commissionPence - feePence - costsPence;
  const totals: StatementTotals = {
    grossPence,
    commissionPence,
    feePence,
    costsPence,
    owedPence,
  };

  // The penny test. Tautological by construction here — the assertion exists
  // to catch any future refactor that computes owed independently of the
  // components (e.g. from a Xero report) and drifts.
  if (
    totals.grossPence -
      totals.commissionPence -
      totals.feePence -
      totals.costsPence !==
    totals.owedPence
  ) {
    throw new StatementReconciliationError(
      `statement for ${landlordContactId} ${month} does not reconcile to the penny`
    );
  }

  return { landlordContactId, month, lines, totals };
}
