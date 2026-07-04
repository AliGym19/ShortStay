import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

// Middleware already routes "/" to /dashboard or /login. This is a safety net
// if middleware is ever bypassed.
export default async function Home() {
	const user = await getSession();
	redirect(user ? "/dashboard" : "/login");
}
