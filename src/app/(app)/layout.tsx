import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import TopBar from "@/components/TopBar";
import styles from "./layout.module.css";

// Every route under (app) requires a session. This guard covers them all, and
// re-resolves the full user (so a corrupt cookie that slipped past middleware
// can never render a protected page).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
	const user = await getSession();
	if (!user) redirect("/login");

	return (
		<>
			<TopBar user={user} />
			<main className={styles.shell}>{children}</main>
		</>
	);
}
