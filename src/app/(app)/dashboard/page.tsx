import type { Metadata } from "next";
import ShortStayApp from "@/components/ShortStayApp";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
	return <ShortStayApp />;
}
