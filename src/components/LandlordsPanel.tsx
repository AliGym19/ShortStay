import type { Landlord } from "@/lib/types";
import LandlordCard from "./LandlordCard";
import styles from "./LandlordsPanel.module.css";

export default function LandlordsPanel({ landlords }: { landlords: Landlord[] }) {
	const ready = landlords.filter((l) => l.status === "statement-ready").length;

	return (
		<section className={`${styles.panel} card`}>
			<header className={styles.head}>
				<div>
					<p className="eyebrow">Landlords &amp; reporting</p>
					<h2>Per-landlord profit &amp; loss</h2>
				</div>
				<span className={styles.count}>
					{ready > 0 ? (
						<>
							<span className={styles.dot} />
							{ready} statement{ready === 1 ? "" : "s"} ready to send
						</>
					) : (
						"All statements sent"
					)}
				</span>
			</header>

			<div className={styles.grid}>
				{landlords.map((l) => (
					<LandlordCard key={l.id} landlord={l} />
				))}
			</div>
		</section>
	);
}
