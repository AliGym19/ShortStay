import { NextResponse, type NextRequest } from "next/server";

// Central auth gate. Presence of the session cookie is enough to route; the
// (app) layout still resolves the full user server-side and re-guards, so a
// corrupt cookie can never render a protected page.
const SESSION_COOKIE = "shortstay_session";
const PROTECTED = ["/dashboard", "/add-records"];

export function proxy(req: NextRequest) {
	const { pathname } = req.nextUrl;
	const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);

	// Entry point: send people where they belong.
	if (pathname === "/") {
		const url = req.nextUrl.clone();
		url.pathname = hasSession ? "/dashboard" : "/login";
		return NextResponse.redirect(url);
	}

	// Already signed in? Skip the login screen.
	if (pathname === "/login" && hasSession) {
		const url = req.nextUrl.clone();
		url.pathname = "/dashboard";
		return NextResponse.redirect(url);
	}

	// Protected areas require a session.
	if (PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/")) && !hasSession) {
		const url = req.nextUrl.clone();
		url.pathname = "/login";
		url.searchParams.set("next", pathname);
		return NextResponse.redirect(url);
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/", "/login", "/dashboard/:path*", "/add-records/:path*"],
};
