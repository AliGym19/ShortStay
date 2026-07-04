"use client";

import { useState } from "react";
import type { Approval } from "@/lib/types";
import ApprovalItem from "./ApprovalItem";
import styles from "./ApprovalsPanel.module.css";

export default function ApprovalsPanel({ approvals }: { approvals: Approval[] }) {
	// Local, optimistic queue. In the wired app these call server actions that
	// draft/flag in Xero + Supabase — never auto-execute money movement.
	const [items, setItems] = useState<Approval[]>([...approvals]);
	const [cleared, setCleared] = useState(0);

	const remove = (id: string) => {
		setItems((prev) => prev.filter((i) => i.id !== id));
		setCleared((c) => c + 1);
	};

	return (
		<aside className={`${styles.approvals} card`}>
			<header className={styles.head}>
				<div>
					<p className={`eyebrow ${styles.act}`}>Needs you</p>
					<h2>Approvals</h2>
				</div>
				<span className={styles.badge} aria-label={`${items.length} pending`}>
					{items.length}
				</span>
			</header>

			<p className={styles.sub}>Nothing is actioned until you approve it here.</p>

			{items.length > 0 ? (
				<ul className={styles.list}>
					{items.map((item) => (
						<ApprovalItem key={item.id} item={item} onApprove={remove} onDismiss={remove} />
					))}
				</ul>
			) : (
				<div className={styles.empty}>
					<span className={styles.tick} aria-hidden="true">
						<svg
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M20 6 9 17l-5-5" />
						</svg>
					</span>
					<p className={styles.etitle}>You&apos;re all caught up</p>
					<p className={styles.etext}>
						{cleared} item{cleared === 1 ? "" : "s"} cleared this session.
					</p>
				</div>
			)}

			<footer className={styles.soon}>
				<span className="eyebrow">Coming soon</span>
				<span>Tax review · Project tracking</span>
			</footer>
		</aside>
	);
}
