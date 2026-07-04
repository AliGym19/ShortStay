// ShortStay domain model.
// The business has three layers: guests (Airbnb) → landlords → agency (our user).
// The agency manages landlords' short-let properties and needs per-landlord and
// per-property P&L, a triage queue, and a view of its own agency finances.

export type Money = number; // whole pounds, GBP

export interface Property {
	id: string;
	name: string; // e.g. "Flat 2 · 14 High St"
	landlordId: string;
	bedrooms: number;
	nightsBooked: number; // this month
	nightsAvailable: number; // this month
	gross: Money; // guest revenue collected this month
	costs: Money; // repairs, cleaning, toiletries, utilities this month
}

export type LandlordStatus = 'statement-ready' | 'needs-review' | 'on-track';

export interface Landlord {
	id: string;
	name: string;
	initials: string;
	propertyCount: number;
	gross: Money; // total guest revenue across their properties, this month
	costs: Money; // total costs
	feeRate: number; // agency management fee, fraction of gross (e.g. 0.15)
	status: LandlordStatus;
	/**
	 * Xero Contact ID this landlord maps to — a landlord IS a Xero Contact,
	 * with agency-specific fields (feeRate, propertyCount) layered on top in
	 * a future Supabase table. Undefined until that table exists; mock data
	 * leaves it unset. See lib/xero.ts's getContacts() for the source shape.
	 */
	xeroContactId?: string;
}

export type ApprovalKind = 'repair' | 'confirm-booking' | 'attend-booking' | 'order';

export interface Approval {
	id: string;
	kind: ApprovalKind;
	title: string;
	detail: string;
	property: string;
	landlord: string;
	amount?: Money;
	raised: string; // ISO date
	/** Xero Contact ID for the supplier/landlord this approval concerns, once linked. */
	xeroContactId?: string;
	/** Set once this approval has been actioned into a real Xero draft bill. */
	xeroInvoiceId?: string;
}

export interface AgencyFinance {
	monthLabel: string;
	managedGross: Money; // total money that flowed through, across all landlords
	agencyRevenue: Money; // fees the agency actually earns
	agencyCosts: Money; // the agency's own operating costs
	netProfit: Money; // agencyRevenue - agencyCosts
	owedToLandlords: Money; // money held that belongs to landlords (never moved by us)
	trend: { label: string; value: Money }[]; // agency revenue, last 6 months
}

export type RecordType = 'invoice' | 'repair' | 'toiletries' | 'cleaning' | 'booking';
