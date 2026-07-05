# Compliance Notes — read before publishing

What these docs are based on, what to fill in, and what to watch. This is a paper trail, not legal advice — if ShortStay takes on paying customers at scale, get a solicitor to review before launch.

## The five documents

| File | Purpose | Required by |
|---|---|---|
| `cookie-policy.md` | Discloses storage/access tech, opt-outs | PECR (as amended by DUAA 2025) |
| `privacy-policy.md` | Controller-side transparency | UK GDPR Arts. 13–14 |
| `terms-of-service.md` | SaaS contract, Xero clause, STR disclaimer | Contract law, CRA 2015 if B2C, DMCCA 2024 |
| `acceptable-use-policy.md` | Behavioural rules, referenced by ToS | Good practice |
| `data-processing-addendum.md` | Guest data processing | UK GDPR Art. 28(3) — mandatory |

## Placeholders to fill

`[COMPANY NAME]` · `[COMPANY NUMBER]` · `[COMPANY ADDRESS]` · `[EMAIL]` · `[DOMAIN]` · `[DATE]` · `[ICO REGISTRATION NUMBER]` · `[VAT NUMBER]` · hosting location (`[the UK / the EEA]`) · backup roll-off (`[35]` days) · support SLA (`[1 business day]`)

## Actions the documents assume you've taken

1. **ICO registration** — Tier 1 fee (£40/yr) as a data controller. The privacy policy cites a registration number; don't publish without one.
2. **E-Commerce Regulations 2002 disclosures** — full business name, geographic address, email, company number and VAT number must be "clearly, directly and permanently" available on the site (footer + legal page). The ToS header covers this once filled in.
3. **Sub-processor list** — the DPA and privacy policy both link to `[DOMAIN]/subprocessors`. Create it (Vercel/hosting, Supabase, payment provider, email provider).
4. **Analytics opt-out toggle** — the cookie policy promises Settings → Privacy → Analytics. The DUAA statistical exemption is only valid if the "simple means of objecting" actually exists. Build it before publishing.
5. **Cancel-in-app** — the ToS promises single-action cancellation. DMCCA 2024 "easy exit" rules make this mandatory for B2C anyway.

## Key legal anchors (as at July 2026)

**Cookies / DUAA:** the Data (Use and Access) Act 2025's PECR changes came into force 5 Feb 2026. New consent exemptions: first-party statistical analytics, appearance/functionality preferences, security/fraud/authentication, emergency assistance — the first two require clear information plus a free opt-out. Advertising and third-party sharing still require consent. PECR fines are now aligned with UK GDPR (up to £17.5m / 4% turnover). ICO finalised its storage-and-access-technologies guidance 29 April 2026. The DUAA complaints-handling duty (acknowledge within 30 days) applies from 19 June 2026 — already reflected in the privacy policy.

**Xero:** the Dec 2025 Developer Platform Terms (applying to existing developers from 2 March 2026) prohibit using API data to train AI/ML models, require industry-standard security with documented measures, incident notification to Xero, use of API data only within the approved use case, and a published privacy policy — which is partly why these docs exist. New commercial tiering (Starter/Core/Plus/Advanced/Enterprise) also took effect 2 March 2026; Custom Connections stay on their existing commercial terms. If ShortStay moves from Custom Connection to App Store listing, the Developer Platform Commercial Terms add certification, branding and support obligations.

**Short-term rental regulation** (why the ToS clause 5 disclaimer is worded the way it is):
- **England:** national registration scheme confirmed under the Levelling-up and Regeneration Act 2023, still pending launch — ministerial framing is "later in 2026", civil penalties up to £5,000 expected. C5 use class proposed. Don't hard-code launch dates into product copy.
- **London:** 90-night annual cap on entire-home lets without planning permission (Deregulation Act 2015). This is the marquee compliance feature for a London-adjacent CRM.
- **Scotland:** mandatory licensing live since Oct 2022; operating without one is criminal (fines to £2,500).
- **Wales:** registration with the Welsh Revenue Authority under the Visitor Accommodation (Register and Levy) Etc. (Wales) Act 2025, rolling out from 2026.
- **NI:** Tourism NI certification mandatory.
- **Everywhere:** Fire Safety Order 2005 risk assessment, gas CP12, EICR 5-yearly, EPC band E (Eng/Wales). FHL tax regime abolished 6 April 2025.

The ToS deliberately makes operators solely responsible for all of the above — ShortStay tracks, it doesn't certify.

## Watch list

- England registration scheme go-live: when secondary legislation lands, the compliance-tracking feature and ToS clause 5 example list should be refreshed.
- ICO enforcement under the new PECR fine regime: first cases will show how strictly the analytics exemption's "not shared with any other person" condition is read — relevant if you ever adopt a third-party analytics tool (Plausible/GA would need re-analysis; self-hosted is safest).
- DMCCA subscription rules: reminder-notice obligations for B2C renewals — if any customers are consumers, build renewal reminder emails.
