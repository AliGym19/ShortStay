import ConnectionCard from "@/components/ConnectionCard";
import DataSection from "@/components/DataSection";
import XeroSignInButton from "@/components/XeroSignInButton";
import { decodeJwtPayload } from "@/lib/jwt";
import { REDIRECT_URI, REQUESTED_SCOPES } from "@/lib/oauth";
import { tokenStore } from "@/lib/tokenStore";
import {
  getAccRecInvoices,
  getBankTransactions,
  getContacts,
  getOrganisation,
} from "@/lib/xero";

// Renders per-request from process-local token state — never cache.
export const dynamic = "force-dynamic";

async function attempt<T>(fn: () => Promise<T>): Promise<{ data?: T; error?: string }> {
  try {
    return { data: await fn() };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const session = tokenStore.get();

  if (!session) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8">
          <h1 className="text-lg font-semibold">Connect your Xero organisation</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            ShortStay reads your Xero data to power STR revenue forecasting and
            issue triage. Access is <strong>strictly read-only</strong> — no
            write scope is ever requested.
          </p>
          {error ? (
            <p className="mt-4 rounded border border-red-300 bg-red-50 dark:bg-red-950 dark:border-red-900 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              {decodeURIComponent(error)}
            </p>
          ) : null}
          <div className="mt-6">
            <XeroSignInButton />
          </div>
          <p className="mt-6 text-xs text-zinc-500">
            First time? The app&apos;s redirect URI{" "}
            <code className="font-mono">{REDIRECT_URI}</code> must be registered
            at developer.xero.com/myapps, and the Demo Company must be active in
            your Xero account.
          </p>
        </div>
      </div>
    );
  }

  // Granted scopes come from the access token itself — proof of what the
  // consent screen actually granted, not what we asked for. Identity scopes
  // (openid/profile/email/offline_access) don't appear in the access token's
  // scope claim, so the mismatch check covers accounting.* only.
  let grantedScopes: string[] = [];
  try {
    const payload = decodeJwtPayload(session.accessToken);
    grantedScopes = Array.isArray(payload.scope)
      ? (payload.scope as string[])
      : typeof payload.scope === "string"
        ? payload.scope.split(" ")
        : [];
  } catch {
    grantedScopes = [];
  }
  const missingScopes = REQUESTED_SCOPES.filter(
    (s) => s.startsWith("accounting.") && !grantedScopes.includes(s)
  );

  const [org, contacts, invoices, bankTxns] = await Promise.all([
    attempt(getOrganisation),
    attempt(getContacts),
    attempt(getAccRecInvoices),
    attempt(getBankTransactions),
  ]);

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <p className="rounded border border-red-300 bg-red-50 dark:bg-red-950 dark:border-red-900 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {decodeURIComponent(error)}
        </p>
      ) : null}

      <ConnectionCard
        tenantName={session.tenantName}
        expiresAt={session.expiresAt}
        grantedScopes={grantedScopes}
        missingScopes={missingScopes}
      />

      <DataSection
        title="Organisation"
        error={org.error}
        columns={["Name", "Legal name", "Currency", "Country", "Type"]}
        rows={
          org.data
            ? [
                [
                  org.data.Name,
                  org.data.LegalName,
                  org.data.BaseCurrency,
                  org.data.CountryCode,
                  org.data.OrganisationType,
                ],
              ]
            : []
        }
        raw={org.data}
      />

      <DataSection
        title="Contacts"
        subtitle={`Showing up to 20 of ${contacts.data?.length ?? 0} on page 1`}
        error={contacts.error}
        columns={["Name", "Email", "Customer", "Supplier"]}
        rows={(contacts.data ?? [])
          .slice(0, 20)
          .map((c) => [c.Name, c.EmailAddress, c.IsCustomer, c.IsSupplier])}
        raw={contacts.data?.slice(0, 20)}
      />

      <DataSection
        title="Invoices (ACCREC — revenue)"
        subtitle="Sales invoices are the STR revenue signal the forecast will build on"
        error={invoices.error}
        columns={["Number", "Contact", "Date", "Due", "Status", "Total", "Paid"]}
        rows={(invoices.data ?? [])
          .slice(0, 20)
          .map((inv) => [
            inv.InvoiceNumber,
            inv.Contact?.Name,
            inv.DateString?.slice(0, 10),
            inv.DueDateString?.slice(0, 10),
            inv.Status,
            inv.Total,
            inv.AmountPaid,
          ])}
        raw={invoices.data?.slice(0, 20)}
      />

      <DataSection
        title="Bank transactions"
        subtitle="RECEIVE rows (highlighted) are the cash-side forecast input"
        error={bankTxns.error}
        columns={["Date", "Type", "Contact", "Account", "Total", "Status"]}
        rows={(bankTxns.data ?? [])
          .slice(0, 20)
          .map((t) => [
            t.DateString?.slice(0, 10),
            t.Type,
            t.Contact?.Name,
            t.BankAccount?.Name,
            t.Total,
            t.Status,
          ])}
        highlight={(bankTxns.data ?? []).slice(0, 20).map((t) => t.Type === "RECEIVE")}
        raw={bankTxns.data?.slice(0, 20)}
      />
    </div>
  );
}
