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

// Live Xero connection status + the four raw data reads. Lives alongside the
// landlord/finance panels (mock data, still) rather than gating the whole
// dashboard — a demo-mode SessionUser has no real Xero token, and that's a
// valid state for this panel to show, not a reason to block the page.
async function attempt<T>(fn: () => Promise<T>): Promise<{ data?: T; error?: string }> {
	try {
		return { data: await fn() };
	} catch (err) {
		return { error: err instanceof Error ? err.message : String(err) };
	}
}

export default async function XeroDataPanel() {
	const session = tokenStore.get();

	if (!session) {
		return (
			<section className="card" style={{ padding: 24 }}>
				<p className="eyebrow">Xero connection</p>
				<h2 style={{ marginTop: 6 }}>Connect your Xero organisation</h2>
				<p style={{ marginTop: 8, color: "var(--muted)", fontSize: 14 }}>
					ShortStay reads your Xero data to power revenue forecasting and
					issue triage. It <strong>never moves money</strong> — the only
					write it can ever perform is a draft bill a human approves in Xero;
					no payment scope is requested.
				</p>
				<div style={{ marginTop: 16 }}>
					<XeroSignInButton />
				</div>
				<p style={{ marginTop: 16, fontSize: 12, color: "var(--faint)" }}>
					First time? The app&apos;s redirect URI{" "}
					<code>{REDIRECT_URI}</code> must be registered at
					developer.xero.com/myapps, and the Demo Company must be active in
					your Xero account.
				</p>
			</section>
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
		<div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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
