import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getAgencyFinance, getApprovals, getLandlords } from "@/lib/data/mock";
import AgencyFinances from "@/components/AgencyFinances";
import LandlordsPanel from "@/components/LandlordsPanel";
import ApprovalsPanel from "@/components/ApprovalsPanel";
import XeroDataPanel from "@/components/XeroDataPanel";
import styles from "./dashboard.module.css";

export const metadata: Metadata = { title: "Dashboard" };

// XeroDataPanel reads per-request from the in-process Xero token store.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
	const user = await getSession();
	// Swap these mock getters for Supabase queries (scoped to the agency),
	// keyed by xeroContactId once that link exists — see lib/types.ts.
	const finance = getAgencyFinance();
	const landlords = getLandlords();
	const approvals = getApprovals();
	const firstName = (user?.name ?? "there").split(" ")[0];

	return (
		<>
			<div className={styles.pagehead}>
				<h1>Good morning, {firstName}</h1>
				<p>
					{finance.monthLabel} · {landlords.length} landlords · {approvals.length} items need you
				</p>
			</div>

			<div className={styles.dash}>
				<div className={styles.left}>
					<AgencyFinances finance={finance} />
					<LandlordsPanel landlords={landlords} />
				</div>
				<div>
					<ApprovalsPanel approvals={approvals} />
				</div>
			</div>

			<div style={{ marginTop: 20 }}>
				<XeroDataPanel />
			</div>
		</>
	);
}
