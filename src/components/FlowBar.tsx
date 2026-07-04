import type { Money } from "@/lib/types";
import { money } from "@/lib/utils";
import styles from "./FlowBar.module.css";

type Tone = "out" | "fee" | "in";
export interface Segment {
	label: string;
	value: Money;
	tone: Tone;
}

export default function FlowBar({
	segments,
	height = 12,
	legend = true,
}: {
	segments: Segment[];
	height?: number;
	legend?: boolean;
}) {
	const total = segments.reduce((a, s) => a + s.value, 0) || 1;

	return (
		<div className={styles.flow} style={{ "--h": `${height}px` } as React.CSSProperties}>
			<div
				className={styles.track}
				role="img"
				aria-label={segments.map((s) => `${s.label} ${money(s.value)}`).join(", ")}
			>
				{segments.map((s) => (
					<span
						key={s.label}
						className={`${styles.seg} ${styles[`tone-${s.tone}`]}`}
						style={{ flexBasis: `${(s.value / total) * 100}%` }}
						title={`${s.label}: ${money(s.value)}`}
					/>
				))}
			</div>

			{legend && (
				<ul className={styles.legend}>
					{segments.map((s) => (
						<li key={s.label}>
							<span className={`${styles.dot} ${styles[`tone-${s.tone}`]}`} />
							<span className={styles.lab}>{s.label}</span>
							<span className={`${styles.val} fig`}>{money(s.value)}</span>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
