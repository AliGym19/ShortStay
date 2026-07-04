"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SessionUser } from "@/lib/session";
import { logout } from "@/app/actions";
import styles from "./TopBar.module.css";

function initials(name: string): string {
	return name
		.split(" ")
		.map((p) => p[0])
		.slice(0, 2)
		.join("")
		.toUpperCase();
}

export default function TopBar({ user }: { user: SessionUser }) {
	const path = usePathname();

	return (
		<header className={styles.bar}>
			<div className={styles.inner}>
				<Link className={styles.brand} href="/dashboard" aria-label="ShortStay home">
					<span className={styles.mark} aria-hidden="true">
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
							<path
								d="M4 11.5 12 5l8 6.5"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
							<path
								d="M6 10.5V19h12v-8.5"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
							<path
								d="M10 19v-4h4v4"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</span>
					<span className={styles.word}>ShortStay</span>
				</Link>

				<nav className={styles.nav} aria-label="Primary">
					<Link
						className={`${styles.link} ${path.startsWith("/dashboard") ? styles.active : ""}`}
						href="/dashboard"
					>
						Dashboard
					</Link>
					<Link
						className={`${styles.link} ${path.startsWith("/add-records") ? styles.active : ""}`}
						href="/add-records"
					>
						Add records
					</Link>
				</nav>

				<div className={styles.right}>
					<span className={styles.xero} title={user.xero.tenantName ?? "Xero"}>
						<span className={`${styles.ping} ${user.xero.connected ? styles.live : ""}`} />
						Xero{user.xero.connected ? "" : " — reconnect"}
					</span>
					<div className={styles.who}>
						<div className={styles.agency}>{user.agency}</div>
						<div className={styles.me}>{user.name}</div>
					</div>
					<span className={styles.avatar} aria-hidden="true">
						{initials(user.name)}
					</span>
					<form action={logout}>
						<button className={styles.signout} type="submit">
							Sign out
						</button>
					</form>
				</div>
			</div>
		</header>
	);
}
