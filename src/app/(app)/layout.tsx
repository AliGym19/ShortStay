import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

// Every route under (app) requires a session. This guard covers them all, and
// re-resolves the full user (so a corrupt cookie that slipped past middleware
// can never render a protected page). Page chrome is owned by the pages —
// the ShortStay app shell brings its own sidebar.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
	const user = await getSession();
	if (!user) redirect("/login");

	return <>{children}</>;
}
