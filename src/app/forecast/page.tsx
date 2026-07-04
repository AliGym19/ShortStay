export default function ForecastPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-lg font-semibold">Revenue Forecast</h1>
      <p className="mt-1 text-sm text-zinc-500">Coming in v1 — design locked.</p>
      <div className="mt-6 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-6 text-sm text-zinc-600 dark:text-zinc-400">
        <p>
          Forecast v1 builds a monthly revenue trend from two Xero read-only
          signals: <strong>ACCREC invoices</strong> (accrual — booking revenue
          by date) and <strong>RECEIVE bank transactions</strong> (cash).
          Projection: trailing 3-month moving average with a naive seasonal
          lift for the next 3 months.
        </p>
        <p className="mt-3">
          Occupancy-based forecasting needs channel/PMS data (bookings, nights,
          ADR) which Xero doesn&apos;t hold — deferred to v2.
        </p>
        <p className="mt-3 text-xs text-zinc-500">
          Full design: <code className="font-mono">docs/forecasting-v1.md</code>
        </p>
      </div>
    </div>
  );
}
