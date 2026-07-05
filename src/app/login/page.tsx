import type { Metadata } from "next";
import { demoLogin } from "@/app/actions";
import styles from "./login.module.css";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
	return (
		<main className={styles.wrap}>
			{/* Left: brand story */}
			<section className={styles.story}>
				<div className={styles.brand}>
					<span className={styles.mark} aria-hidden="true">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
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
				</div>

				<h1>
					Every landlord&apos;s P&amp;L,
					<br />
					without the spreadsheet.
				</h1>
				<p className={styles.lede}>
					ShortStay is the back office for short-let agencies. Track profit and loss per landlord and per
					property, triage repairs and orders, and see your own agency finances — all from your Xero data.
				</p>

				<ul className={styles.feats}>
					<li>
						<span className={`${styles.fdot} ${styles.out}`} /> Costs, fees and payouts split per property
					</li>
					<li>
						<span className={`${styles.fdot} ${styles.fee}`} /> Repairs &amp; orders triaged in one queue
					</li>
					<li>
						<span className={`${styles.fdot} ${styles.in}`} /> Landlord statements drafted for your approval
					</li>
				</ul>

				<p className={styles.trust}>
					Read-only access plus drafts. <strong>ShortStay never moves your money</strong> — you approve every
					payout.
				</p>
			</section>

			{/* Right: sign in */}
			<section className={styles.signin}>
				<div className={styles.panel}>
					<p className="eyebrow">Welcome back</p>
					<h2>Sign in to your agency</h2>
					<p className={styles.hint}>Connect the Xero organisation you manage properties in.</p>

					{/* Real OAuth flow — see src/app/api/auth/connect/route.ts and
					     src/lib/oauth.ts. The callback bridges into setSession() below. */}
					<a className={styles["xero-btn"]} href="/api/auth/connect">
						<span className={styles.xlogo} aria-hidden="true">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
								<circle cx="12" cy="12" r="11" fill="#fff" opacity="0.16" />
								<path d="M8.4 12 6 9.6 7.1 8.5 9.5 10.9 11.9 8.5 13 9.6 10.6 12 13 14.4 11.9 15.5 9.5 13.1 7.1 15.5 6 14.4 8.4 12ZM15.5 8.9a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1Z" />
							</svg>
						</span>
						Sign in with Xero
					</a>

					<div className={styles.or}>
						<span>or</span>
					</div>

					<form action={demoLogin}>
						<button className={styles.demo} type="submit">
							Continue in demo mode
						</button>
					</form>
					<p className={styles.devnote}>Demo mode loads sample agency data — no Xero connection needed.</p>
				</div>

				<p className={styles.legal}>
					By continuing you agree to the{" "}
					<a href="/legal?doc=terms-of-service" style={{ textDecoration: "underline" }}>Terms of Service</a>. ShortStay
					requests read scopes plus a single draft-invoice scope. No payment scope is ever requested.{" "}
					<a href="/legal?doc=privacy-policy" style={{ textDecoration: "underline" }}>Privacy</a> ·{" "}
					<a href="/legal?doc=cookie-policy" style={{ textDecoration: "underline" }}>Cookies</a> ·{" "}
					<a href="/legal" style={{ textDecoration: "underline" }}>All legal documents</a>
				</p>
			</section>
		</main>
	);
}
