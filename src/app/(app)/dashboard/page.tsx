import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { normaliseRole } from "@/lib/permissions";
import ShortStayApp from "@/components/ShortStayApp";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
	const user = await getSession();
	if (!user) redirect("/login");
	return <ShortStayApp userName={user.name} role={normaliseRole(user.role)} />;
}
