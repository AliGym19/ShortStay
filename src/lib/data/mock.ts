import type { AgencyFinance, Approval, Landlord } from '@/lib/types';

// Demo data for the frontend. Every figure is internally consistent:
// per landlord, gross = costs + agencyFee + owedToLandlord.
// Replace these getters with Supabase queries; the return shapes stay the same.

export const landlords: Landlord[] = [
	{
		id: 'll_okafor',
		name: 'J. Okafor',
		initials: 'JO',
		propertyCount: 3,
		gross: 9240,
		costs: 1180,
		feeRate: 0.15,
		status: 'statement-ready'
	},
	{
		id: 'll_harlow',
		name: 'The Harlow Estate',
		initials: 'HE',
		propertyCount: 5,
		gross: 18600,
		costs: 2940,
		feeRate: 0.12,
		status: 'on-track'
	},
	{
		id: 'll_bianchi',
		name: 'S. & M. Bianchi',
		initials: 'SB',
		propertyCount: 2,
		gross: 5880,
		costs: 2110,
		feeRate: 0.15,
		status: 'needs-review'
	},
	{
		id: 'll_rao',
		name: 'Aditi Rao',
		initials: 'AR',
		propertyCount: 1,
		gross: 3120,
		costs: 340,
		feeRate: 0.18,
		status: 'on-track'
	},
	{
		id: 'll_camden',
		name: 'Camden Holdings',
		initials: 'CH',
		propertyCount: 4,
		gross: 14300,
		costs: 1760,
		feeRate: 0.13,
		status: 'statement-ready'
	},
	{
		id: 'll_fitz',
		name: 'D. Fitzgerald',
		initials: 'DF',
		propertyCount: 2,
		gross: 6450,
		costs: 980,
		feeRate: 0.15,
		status: 'on-track'
	}
];

export const approvals: Approval[] = [
	{
		id: 'ap_1',
		kind: 'repair',
		title: 'Boiler repair',
		detail: 'BritGas quote — hot water out since Tue',
		property: 'Flat 1 · 8 Pryor Rd',
		landlord: 'The Harlow Estate',
		amount: 480,
		raised: isoDaysAgo(2)
	},
	{
		id: 'ap_2',
		kind: 'confirm-booking',
		title: 'Confirm booking · 4 nights',
		detail: 'Guest requesting 1pm early check-in',
		property: 'Flat 2 · 14 High St',
		landlord: 'J. Okafor',
		amount: 620,
		raised: isoDaysAgo(0)
	},
	{
		id: 'ap_3',
		kind: 'attend-booking',
		title: 'Check-in handover · 5pm',
		detail: 'Key drop + walkthrough for arriving guest',
		property: 'The Mews · 3 Canal St',
		landlord: 'Camden Holdings',
		raised: isoDaysAgo(0)
	},
	{
		id: 'ap_4',
		kind: 'order',
		title: 'Toiletries + linen restock',
		detail: 'Below par after 3 turnovers',
		property: 'Studio · 21 Wharf Ln',
		landlord: 'S. & M. Bianchi',
		amount: 86,
		raised: isoDaysAgo(1)
	},
	{
		id: 'ap_5',
		kind: 'repair',
		title: 'Leaking tap',
		detail: 'Draft bill ready — tenant reported',
		property: 'Flat 9 · Rowan Ct',
		landlord: 'Aditi Rao',
		amount: 120,
		raised: isoDaysAgo(3)
	}
];

export function getAgencyFinance(): AgencyFinance {
	const managedGross = sum(landlords.map((l) => l.gross));
	const totalCosts = sum(landlords.map((l) => l.costs));
	const agencyRevenue = sum(landlords.map((l) => Math.round(l.gross * l.feeRate)));
	const agencyCosts = 4120;
	return {
		monthLabel: 'July 2026',
		managedGross,
		agencyRevenue,
		agencyCosts,
		netProfit: agencyRevenue - agencyCosts,
		owedToLandlords: managedGross - totalCosts - agencyRevenue,
		trend: [
			{ label: 'Feb', value: 5900 },
			{ label: 'Mar', value: 6340 },
			{ label: 'Apr', value: 6010 },
			{ label: 'May', value: 7120 },
			{ label: 'Jun', value: 7450 },
			{ label: 'Jul', value: agencyRevenue }
		]
	};
}

export function getLandlords(): Landlord[] {
	return landlords;
}

export function getApprovals(): Approval[] {
	return approvals;
}

/** fee a landlord's gross yields the agency, and the remainder owed to them. */
export function splitLandlord(l: Landlord) {
	const fee = Math.round(l.gross * l.feeRate);
	const owed = l.gross - l.costs - fee;
	return { costs: l.costs, fee, owed };
}

function sum(xs: number[]): number {
	return xs.reduce((a, b) => a + b, 0);
}

function isoDaysAgo(n: number): string {
	const d = new Date();
	d.setDate(d.getDate() - n);
	return d.toISOString();
}
