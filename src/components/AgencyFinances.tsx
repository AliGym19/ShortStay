import type { AgencyFinance } from "@/lib/types";
import { money } from "@/lib/utils";
import FlowBar from "./FlowBar";
import Sparkline from "./Sparkline";
import styles from "./AgencyFinances.module.css";

export default function AgencyFinances({ finance }: { finance: AgencyFinance }) {
	const landlordCosts = finance.managedGross - finance.agencyRevenue - finance.owedToLandlords;
	const growth =
		finance.trend.length >= 2
			? (finance.trend[finance.trend.length - 1].value - finance.trend[finance.trend.length - 2].value) /
				finance.trend[finance.trend.length - 2].value
			: 0;

	return (
		<section className={`${styles.hero} card`}>
			<div className={styles.top}>
				<div>
					<p className="eyebrow">Agency finances · {finance.monthLabel}</p>
					<h1 className={`${styles.net} fig`}>{money(finance.netProfit)}</h1>
					<p className={styles.netlab}>Your net profit this month</p>
				</div>
				<div className={styles.trend}>
					<Sparkline points={finance.trend} />
					<p className={styles.trendlab}>
						Revenue <span className={`${styles.up} fig`}>▲ {Math.round(growth * 100)}%</span> vs last month
					</p>
				</div>
			</div>

			<div className={styles.split}>
				<div className={styles.stat}>
					<span className={styles.k}>Fee revenue</span>
					<span className={`${styles.v} fig`}>{money(finance.agencyRevenue)}</span>
				</div>
				<div className={styles.stat}>
					<span className={styles.k}>Agency costs</span>
					<span className={`${styles.v} fig`}>{money(finance.agencyCosts)}</span>
				</div>
				<div className={styles.stat}>
					<span className={styles.k}>Managed gross</span>
					<span className={`${styles.v} fig`}>{money(finance.managedGross)}</span>
				</div>
			</div>

			<div>
				<div className={styles.flowhead}>
					<span className="eyebrow">Where the {money(finance.managedGross)} went</span>
					<span className={styles.held}>
						{money(finance.owedToLandlords)} held for landlords — never moved by ShortStay
					</span>
				</div>
				<FlowBar
					height={14}
					segments={[
						{ label: "Property costs", value: landlordCosts, tone: "out" },
						{ label: "Your fee", value: finance.agencyRevenue, tone: "fee" },
						{ label: "Owed to landlords", value: finance.owedToLandlords, tone: "in" },
					]}
				/>
			</div>
		</section>
	);
}
