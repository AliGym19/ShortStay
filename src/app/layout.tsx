import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: { default: "ShortStay", template: "%s · ShortStay" },
	description:
		"The back office for short-let agencies — per-landlord P&L, triage and agency finances, from your Xero data.",
};

export const viewport: Viewport = {
	themeColor: "#12241c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
}
