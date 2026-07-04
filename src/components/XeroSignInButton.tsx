import Script from "next/script";

// Official "Sign In with Xero" button (branding-compliant, standalone usage):
// xero-sso.js renders the button into the data-xero-sso span and follows
// data-href — which points at our own OAuth route, so the security lives
// entirely server-side. Plain-link fallback for script-blocked browsers.
export default function XeroSignInButton() {
  return (
    <div className="flex flex-col items-start gap-2">
      <span
        data-xero-sso
        data-href="/api/auth/connect"
        data-label="Sign In with Xero"
      ></span>
      <Script
        src="https://edge.xero.com/platform/sso/xero-sso.js"
        strategy="afterInteractive"
      />
      <a
        href="/api/auth/connect"
        className="text-xs text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
      >
        or connect directly
      </a>
    </div>
  );
}
