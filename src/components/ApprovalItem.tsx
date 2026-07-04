"use client";

import type { Approval } from "@/lib/types";
import { money, daysAgo } from "@/lib/utils";
import ApprovalIcon from "./ApprovalIcon";
import styles from "./ApprovalItem.module.css";

const cta: Record<Approval["kind"], string> = {
	repair: "Approve repair",
	"confirm-booking": "Confirm",
	"attend-booking": "Mark attending",
	order: "Approve order",
};

export default function ApprovalItem({
	item,
	onApprove,
	onDismiss,
}: {
	item: Approval;
	onApprove: (id: string) => void;
	onDismiss: (id: string) => void;
}) {
	return (
		<li className={styles.item}>
			<span className={styles.ic} aria-hidden="true">
				<ApprovalIcon kind={item.kind} />
			</span>
			<div className={styles.body}>
				<div className={styles.line1}>
					<h4 className={styles.title}>{item.title}</h4>
					{item.amount !== undefined && <span className={`${styles.amt} fig`}>{money(item.amount)}</span>}
				</div>
				<p className={styles.detail}>{item.detail}</p>
				<p className={styles.meta}>
					{item.property} · {item.landlord} · {daysAgo(item.raised)}
				</p>
				<div className={styles.actions}>
					<button className={styles.approve} onClick={() => onApprove(item.id)}>
						{cta[item.kind]}
					</button>
					<button className={styles.dismiss} onClick={() => onDismiss(item.id)}>
						Dismiss
					</button>
				</div>
			</div>
		</li>
	);
}
