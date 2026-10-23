# Ready to publish? (Next.js site)

Status of `https://singledotstudio.vercel.app` against what a public launch needs. **Done** means built and checked. **Needs you**
means only the studio can supply it; nothing is invented in its place.

## Done

| Area | State |
| --- | --- |
| Features | Home, services (home, office, showroom), projects, about, contact, budget calculator, consultation form, branded quotation PDF, staff area (Studio OS) all working |
| Security | Security headers (CSP, HSTS, no framing, no sniffing), same-origin checks, database-backed rate limits, validation, hardened staff login (lockout, scrypt hashing, sessions in the database), two-code ownership transfer, no secrets in the repository. `npm audit` for production dependencies: 0 vulnerabilities |
| Tests | 16 unit tests (price engine and quotation), type-check, production build |
| HTML | Checked with the W3C validator; heading order, tab/panel roles, form autocomplete values and landmarks fixed |
| SEO, AEO, GEO | Titles, descriptions, canonicals, Open Graph, Twitter card, sitemap, robots, structured data, visible FAQs, `/llms.txt` (see `docs/seo-aeo-geo.md`) |
| API | Documented in `docs/api-site.md`; `/api/health` for monitoring; `/.well-known/security.txt` ready |
| Backlinks | A practical plan and the footer and structured-data hooks for profile links (see `docs/backlinks-and-listings.md`) |

## Needs you before launch

1. **Email.** No SMTP is configured on the project, so quotation and consultation emails are not delivered (requests are still saved and
   shown in the staff area). Set in Vercel: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `NOTIFY_TO`.
   Ownership transfer codes also need this.
2. **Real prices** in `config/pricing.json` (then `"placeholder": false`), plus tax, payment terms and quotation validity
   (`docs/calculator-quotation-info-checklist.md`).
3. **Contact details** (phone, email, address, hours), **studio numbers** and **founder details** in the admin (Website, Text).
4. **Real photos** and before/after pairs (Website, Images and Before / after). Stock photos are credited on `/credits`.
5. **Domain.** Set `NEXT_PUBLIC_SITE_URL` to the real domain, attach the domain in Vercel, redirect other host names to it.
6. **Legal pages.** Privacy Policy and Terms are drafts: have them reviewed and completed.
7. **Profiles and listings** (`docs/backlinks-and-listings.md`), then put the real URLs in `site.social`.
8. **Search tools.** Add the domain to Google Search Console and Bing Webmaster Tools, submit the sitemap.
9. **Security contact.** Set `SECURITY_CONTACT` (an email or https URL) to publish `/.well-known/security.txt`.
10. **Staff safety.** Delete the local `SETUP-KEY.txt`, make sure the owner account uses a strong password, and review staff accounts.
11. **Real-world checks** after the domain is live: Lighthouse on mobile and desktop, one test quotation end to end with real email,
    and a look on a real phone.

## Known limits

* Pricing, statistics and some copy are placeholders until supplied. The site says so instead of showing made-up figures.
* The before/after sliders show labelled stock-photo samples until real pairs are uploaded.
* Image-generation credits (Runway) were not available, so the "before" photos are stock photos, not the same rooms.
