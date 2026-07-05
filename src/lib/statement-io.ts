import "server-only";
import { db } from "@/lib/db";
import { bookings, properties } from "@/lib/schema";
import type {
  CostInput,
  RevenueInput,
  StatementProperty,
} from "@/lib/statement";
import { getAccPayInvoices, NotConnectedError } from "@/lib/xero";

// Statement input loading — everything the pure assembly math needs,
// gathered from the local registry, the seeded bookings, and live Xero.
// Kept out of the route file: Next route modules may only export handlers.

export const STATEMENT_MONTH = process.env.STATEMENT_MONTH ?? "2026-06";
const COUNTED_BILL_STATUSES = new Set(["DRAFT", "SUBMITTED", "AUTHORISED"]);

// Route params are "L1"-style local ids; the registry stores "local:L1"
// until real Xero ContactIDs are linked. Accept both.
export function landlordMatches(landlordId: string, contactId: string): boolean {
  return contactId === landlordId || contactId === `local:${landlordId}`;
}

export interface StatementInputs {
  readonly landlordContactId: string;
  readonly landlordName: string;
  readonly statementProps: readonly StatementProperty[];
  readonly revenue: readonly RevenueInput[];
  readonly costs: readonly CostInput[];
  readonly xeroConnected: boolean;
}

export async function loadStatementInputs(
  landlordId: string
): Promise<StatementInputs | null> {
  const allProps = await db.select().from(properties);
  const mine = allProps.filter((p) => landlordMatches(landlordId, p.landlordContactId));
  if (mine.length === 0) return null;

  const statementProps: StatementProperty[] = mine.map((p) => ({
    id: p.id,
    name: p.name,
    landlordContactId: p.landlordContactId,
    commissionRate: Number(p.commissionRate),
    agencyFeeRate: Number(p.agencyFeeRate),
  }));

  const allBookings = await db.select().from(bookings);
  const revenue: RevenueInput[] = allBookings
    .filter(
      (b) =>
        b.checkIn.startsWith(STATEMENT_MONTH) &&
        mine.some((p) => p.id === b.propertyId)
    )
    .map((b) => ({
      propertyId: b.propertyId,
      description: `Booking ${b.id}${b.guest ? ` · ${b.guest}` : ""}`,
      amountPence: b.grossPence,
      sourceType: "booking.seed" as const,
      sourceId: b.id,
      date: b.checkIn,
    }));

  // Costs from live Xero ACCPAY bills, attributed via the SS-Reference
  // convention or a property-name match in the first line description.
  // Not connected → empty costs; the statement still assembles honestly.
  let costs: CostInput[] = [];
  let xeroConnected = true;
  try {
    const bills = await getAccPayInvoices(STATEMENT_MONTH);
    costs = bills
      .filter((inv) => COUNTED_BILL_STATUSES.has(inv.Status ?? ""))
      .flatMap((inv) => {
        const ref = inv.Reference ?? "";
        const lineDesc = inv.LineItems?.[0]?.Description ?? "";
        const prop = mine.find(
          (p) =>
            ref.includes(`/ ${p.id}`) ||
            lineDesc.toLowerCase().includes(p.name.toLowerCase())
        );
        if (!prop) return [];
        return [
          {
            propertyId: prop.id,
            description: lineDesc || `Bill ${inv.InvoiceNumber ?? inv.InvoiceID}`,
            supplier: inv.Contact?.Name ?? "Unknown supplier",
            amountPence: Math.round((inv.Total ?? 0) * 100),
            sourceId: inv.InvoiceID,
            billStatus: inv.Status ?? "UNKNOWN",
            date: inv.DateString?.slice(0, 10) ?? "",
          },
        ];
      });
  } catch (err) {
    if (!(err instanceof NotConnectedError)) throw err;
    xeroConnected = false;
  }

  return {
    landlordContactId: mine[0].landlordContactId,
    landlordName: mine[0].landlordName,
    statementProps,
    revenue,
    costs,
    xeroConnected,
  };
}
