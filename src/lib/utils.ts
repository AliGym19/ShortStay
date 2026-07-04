import type { Money } from './types';

const gbp0 = new Intl.NumberFormat('en-GB', {
	style: 'currency',
	currency: 'GBP',
	maximumFractionDigits: 0
});

/** £12,340 — for headline figures. */
export function money(v: Money): string {
	return gbp0.format(v);
}

/** 12,340 — bare number, currency symbol supplied by layout. */
export function bare(v: Money): string {
	return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(v);
}

/** 0.153 → "15%" */
export function pct(fraction: number): string {
	return `${Math.round(fraction * 100)}%`;
}

/** ISO date → "3 Jul" */
export function shortDate(iso: string): string {
	return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** relative day count for the triage queue, e.g. "2d ago" */
export function daysAgo(iso: string, now = new Date()): string {
	const d = Math.round((now.getTime() - new Date(iso).getTime()) / 86_400_000);
	if (d <= 0) return 'today';
	if (d === 1) return '1d ago';
	return `${d}d ago`;
}
