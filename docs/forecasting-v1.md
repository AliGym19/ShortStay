# Forecasting v1 — Design

**Status**: design only (MVP ships placeholder page). Build in next session.

## Goal
Monthly revenue trend + 3-month projection for an STR portfolio, from Xero
read-only data already granted to the app.

## Inputs (both already flowing through `lib/xero.ts`)
| Signal | Source | Filter |
|---|---|---|
| Accrual (booking revenue) | ACCREC invoices | `Status ∈ {AUTHORISED, PAID}`, bucket by `Date` |
| Cash | Bank transactions | `Type == "RECEIVE"`, bucket by `Date` |

## Method
1. Bucket both signals by calendar month (last 12 months, paginate as needed —
   `page` param, 100/page).
2. Trend: trailing 3-month moving average per signal.
3. Projection: next 3 months = moving average × naive seasonal lift
   (month-over-month ratio from the prior year where available, else 1.0).
4. Render as a simple table first; chart library decision deferred.

## Explicitly deferred to v2
- Occupancy/ADR-based forecasting — needs channel/PMS data (bookings, nights);
  Xero holds revenue only.
- Per-property segmentation (needs a property↔contact or tracking-category
  mapping decision).
- Xero Reports API (`accounting.reports.read` is already granted — P&L report
  is an alternative aggregation path worth evaluating).

## Constraints
- Read-only: all data via `xeroFetch` GETs. No writes, ever.
- Rate limits: 60/min per tenant — 12 months of pagination fits comfortably.
