import "server-only";
import { cookies } from "next/headers";

// Cookie-based session. Today it carries a demo user so the whole app runs
// without a backend. When Xero OAuth + Supabase are wired, the callback route
// builds the same SessionUser shape and calls setSession() — nothing else changes.
//
// NOTE: this is base64url JSON, not a signed token. Before production, sign it with
// SESSION_SECRET (or store the session server-side in Supabase and keep only an id here).

const COOKIE = "shortstay_session";
const MAX_AGE = 60 * 60 * 8; // 8h

export interface XeroConnection {
	connected: boolean;
	tenantId?: string;
	tenantName?: string;
	/** access token lives server-side only in a real build; never ship it to the client. */
	expiresAt?: string;
}

export interface SessionUser {
	id: string;
	name: string;
	email: string;
	agency: string;
	role: string;
	xero: XeroConnection;
}

export async function getSession(): Promise<SessionUser | null> {
	const raw = (await cookies()).get(COOKIE)?.value;
	if (!raw) return null;
	try {
		const json = Buffer.from(raw, "base64url").toString("utf8");
		return JSON.parse(json) as SessionUser;
	} catch {
		return null;
	}
}

/** Writable only from Server Actions and Route Handlers (not during render). */
export async function setSession(user: SessionUser): Promise<void> {
	const raw = Buffer.from(JSON.stringify(user), "utf8").toString("base64url");
	(await cookies()).set(COOKIE, raw, {
		path: "/",
		httpOnly: true,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
		maxAge: MAX_AGE,
	});
}

export async function clearSession(): Promise<void> {
	(await cookies()).delete(COOKIE);
}

/** Stand-in user for local dev, until the Xero callback provides the real one. */
export function demoUser(): SessionUser {
	return {
		id: "usr_demo",
		name: "Priya Nandra",
		email: "priya@meridianlets.co.uk",
		agency: "Meridian Short Lets",
		role: "Operations",
		xero: {
			connected: true,
			tenantId: "demo-tenant",
			tenantName: "Meridian Short Lets Ltd",
		},
	};
}

export const SESSION_COOKIE = COOKIE;
