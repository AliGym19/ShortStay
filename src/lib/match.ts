import "server-only";

// Payout reconciliation — deterministic arithmetic, no LLM. A Booking.com
// payout matches a set of bookings iff payout === Σ(gross × (1 − commission))
// over bookings whose checkout falls inside the payout window, to ±1p.
// Try the full candidate set first, then largest-first greedy subsets.
// Ambiguity or no match returns the candidates for a human to pick —
// never guess (spec §7).

export interface MatchBooking {
  readonly id: string;
  readonly propertyId: string;
  readonly grossPence: number;
}

export interface MatchResult {
  readonly matched: boolean;
  readonly bookingIds: readonly string[];
  readonly perPropertySplitPence: Readonly<Record<string, number>>;
  readonly reason: string;
}

const TOLERANCE_PENCE = 1;

export function netPence(grossPence: number, commissionRate: number): number {
  return Math.round(grossPence * (1 - commissionRate));
}

function splitByProperty(
  bookings: readonly MatchBooking[],
  commissionRate: number
): Record<string, number> {
  const split: Record<string, number> = {};
  for (const b of bookings) {
    split[b.propertyId] = (split[b.propertyId] ?? 0) + netPence(b.grossPence, commissionRate);
  }
  return split;
}

export function matchPayout(
  payoutPence: number,
  candidates: readonly MatchBooking[],
  commissionRate: number
): MatchResult {
  const total = candidates.reduce(
    (s, b) => s + netPence(b.grossPence, commissionRate),
    0
  );

  if (Math.abs(total - payoutPence) <= TOLERANCE_PENCE) {
    return {
      matched: true,
      bookingIds: candidates.map((b) => b.id),
      perPropertySplitPence: splitByProperty(candidates, commissionRate),
      reason: `full candidate set sums to ${total}p (payout ${payoutPence}p, ±${TOLERANCE_PENCE}p)`,
    };
  }

  // Largest-first greedy: take bookings while they fit under the payout.
  const sorted = [...candidates].sort(
    (a, b) => netPence(b.grossPence, commissionRate) - netPence(a.grossPence, commissionRate)
  );
  const taken: MatchBooking[] = [];
  let sum = 0;
  for (const b of sorted) {
    const n = netPence(b.grossPence, commissionRate);
    if (sum + n <= payoutPence + TOLERANCE_PENCE) {
      taken.push(b);
      sum += n;
    }
  }
  if (taken.length > 0 && Math.abs(sum - payoutPence) <= TOLERANCE_PENCE) {
    return {
      matched: true,
      bookingIds: taken.map((b) => b.id),
      perPropertySplitPence: splitByProperty(taken, commissionRate),
      reason: `greedy subset of ${taken.length}/${candidates.length} bookings sums to ${sum}p`,
    };
  }

  return {
    matched: false,
    bookingIds: candidates.map((b) => b.id),
    perPropertySplitPence: {},
    reason: `no subset reconciles: full set ${total}p, best greedy ${sum}p, payout ${payoutPence}p — a human must pick`,
  };
}
