import type { Landlord } from "@/lib/types";
import { money, pct } from "@/lib/utils";
import { splitLandlord } from "@/lib/data/mock";
import FlowBar from "./FlowBar";
import styles from "./LandlordCard.module.css";

const statusLabel: Record<Landlord["status"], string> = {
	"statement-ready": "Statement ready",
	"needs-review": "Needs review",
	"on-track": "On track",
};

export default function LandlordCard({ landlord }: { landlord: Landlord }) {
	const s = splitLandlord(landlord);

	return (
		<article className={styles.ll}>
			<header className={styles.hdr}>
				<span className={styles.badge} aria-hidden="true">
					{landlord.initials}
				</span>
				<div className={styles.id}>
					<h3>{landlord.name}</h3>
					<p>
						{landlord.propertyCount} {landlord.propertyCount === 1 ? "property" : "properties"} ·{" "}
						{pct(landlord.feeRate)} fee
					</p>
				</div>
				<span className={`${styles.pill} ${styles[`s-${landlord.status}`]}`}>
					{statusLabel[landlord.status]}
				</span>
			</header>

			<div className={styles.owed}>
				<span className={styles.k}>Owed to landlord</span>
				<span className={`${styles.v} fig`}>{money(s.owed)}</span>
			</div>

			<FlowBar
				height={10}
				segments={[
					{ label: "Costs", value: s.costs, tone: "out" },
					{ label: "Fee", value: s.fee, tone: "fee" },
					{ label: "Owed", value: s.owed, tone: "in" },
				]}
			/>
		</article>
	);
}
