"use server";

import { redirect } from "next/navigation";
import { clearSession, demoUser, setSession } from "@/lib/session";
import { tokenStore } from "@/lib/tokenStore";

// DEV login — bypasses real Xero OAuth (src/lib/oauth.ts, src/app/api/auth/*)
// for UI iteration without hitting the live API every time. Loads a fake
// SessionUser; no real Xero token is stored, so any Xero-data section on the
// dashboard should treat "demo" tenantId as not-really-connected.
// The persona comes from the login picker's hidden field (cleaner /
// operations / accountant) and drives lib/permissions.
export async function demoLogin(form: FormData): Promise<void> {
	const persona = String(form.get("persona") ?? "operations");
	await setSession(demoUser(persona));
	redirect("/dashboard");
}

export async function logout(): Promise<void> {
	tokenStore.clear();
	await clearSession();
	redirect("/login");
}
