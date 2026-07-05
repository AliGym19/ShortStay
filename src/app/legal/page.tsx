import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { renderMarkdown } from "@/lib/markdown";

// Public legal & compliance documents — deliberately outside the (app) auth
// group so they are "clearly, directly and permanently" available
// (E-Commerce Regulations 2002). Source of truth: /legal/*.md in the repo.

export const metadata: Metadata = { title: "Legal & compliance" };

const DOCS: Record<string, { file: string; label: string }> = {
  "terms-of-service": { file: "terms-of-service.md", label: "Terms of Service" },
  "privacy-policy": { file: "privacy-policy.md", label: "Privacy Policy" },
  "cookie-policy": { file: "cookie-policy.md", label: "Cookie Policy" },
  "acceptable-use-policy": { file: "acceptable-use-policy.md", label: "Acceptable Use" },
  "data-processing-addendum": { file: "data-processing-addendum.md", label: "Data Processing Addendum" },
};

export default async function LegalPage({
  searchParams,
}: {
  searchParams: Promise<{ doc?: string }>;
}) {
  const { doc } = await searchParams;
  const slug = doc && DOCS[doc] ? doc : "terms-of-service";
  const md = await readFile(
    path.join(process.cwd(), "legal", DOCS[slug].file),
    "utf-8"
  );

  return (
    <div className="legal-root">
      <style>{`
        .legal-root{min-height:100vh;background:#F7F9FC;color:#16233D;
          font-family:'Instrument Sans',system-ui,sans-serif;padding:34px 20px 80px}
        .legal-inner{max-width:820px;margin:0 auto}
        .legal-brand{display:flex;align-items:baseline;gap:10px;margin-bottom:20px}
        .legal-brand a{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:19px;color:#0B1F4B;text-decoration:none}
        .legal-brand span{font-size:12px;color:#8A99B5}
        .legal-nav{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:22px}
        .legal-nav a{border:1px solid #D9E2F0;background:#fff;border-radius:20px;padding:6px 13px;
          font-size:13px;font-weight:500;color:#5A6B85;text-decoration:none}
        .legal-nav a.on{background:#0B1F4B;color:#fff;border-color:#0B1F4B}
        .legal-doc{background:#fff;border:1px solid #D9E2F0;border-radius:14px;padding:34px 38px;
          box-shadow:0 1px 2px rgba(11,31,75,.05), 0 8px 24px -14px rgba(11,31,75,.18);line-height:1.65}
        .legal-doc .md-h1{font-family:'Space Grotesk';font-size:26px;font-weight:600;letter-spacing:-.02em;margin:0 0 14px}
        .legal-doc .md-h2{font-family:'Space Grotesk';font-size:18px;font-weight:600;margin:26px 0 8px}
        .legal-doc .md-h3{font-family:'Space Grotesk';font-size:15px;font-weight:600;margin:20px 0 6px}
        .legal-doc .md-p{font-size:14px;color:#3A4A66;margin:8px 0}
        .legal-doc .md-list{font-size:14px;color:#3A4A66;padding-left:22px;margin:8px 0}
        .legal-doc .md-list li{margin:5px 0}
        .legal-doc .md-hr{border:none;border-top:1px solid #D9E2F0;margin:22px 0}
        .legal-doc .md-code{font-family:'Space Mono',monospace;font-size:12.5px;background:#EEF2F8;
          border-radius:4px;padding:1px 5px}
        .legal-doc .md-tablewrap{overflow-x:auto;margin:12px 0}
        .legal-doc .md-table{border-collapse:collapse;width:100%;font-size:13px}
        .legal-doc .md-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.07em;
          color:#8A99B5;padding:8px 10px;border-bottom:1px solid #D9E2F0}
        .legal-doc .md-table td{padding:8px 10px;border-bottom:1px solid #EEF2F8;color:#3A4A66;vertical-align:top}
        .legal-doc a{color:#1B3F9C}
        .legal-foot{margin-top:18px;font-size:12px;color:#8A99B5}
      `}</style>
      <div className="legal-inner">
        <div className="legal-brand">
          <Link href="/">ShortStay</Link>
          <span>Legal &amp; compliance</span>
        </div>
        <nav className="legal-nav">
          {Object.entries(DOCS).map(([s, d]) => (
            <Link key={s} href={`/legal?doc=${s}`} className={s === slug ? "on" : ""}>
              {d.label}
            </Link>
          ))}
        </nav>
        <article className="legal-doc">{renderMarkdown(md)}</article>
        <p className="legal-foot">
          Prototype documents — bracketed placeholders (company number, ICO registration, domain)
          are completed before any public launch. ShortStay never moves money: reads and drafts only.
        </p>
      </div>
    </div>
  );
}
