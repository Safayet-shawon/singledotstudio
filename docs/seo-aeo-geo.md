# SEO, AEO and GEO (Next.js site)

## What is in place

| Area | What the site does | Where |
| --- | --- | --- |
| Titles and descriptions | Unique title and description per page; title template `Page | Single Dot Studio` | each page's `metadata` |
| Canonical URLs | Every page declares its canonical URL on the production domain | `alternates.canonical`, `NEXT_PUBLIC_SITE_URL` |
| Open Graph and Twitter | Title, description, URL and a default image (`home-poster.jpg`); large-image Twitter card | `src/app/(site)/layout.tsx` |
| Sitemap and robots | `/sitemap.xml` lists every public page and project; `/robots.txt` allows crawling and blocks `/api/` and `/admin` | `src/app/sitemap.ts`, `robots.ts` |
| Structured data (JSON-LD) | `Organization` and `WebSite` (home); `Service`, `FAQPage` and `BreadcrumbList` (each service); `FAQPage` and `BreadcrumbList` (services index); `BreadcrumbList` (projects, about) | `src/lib/seo.ts`, `JsonLd.tsx` |
| Answer-ready content (AEO) | Plain-language "Common questions" on the Services page, each service's own FAQ, all marked up as FAQ data and visible on the page | `SITE_FAQ` in `src/lib/seo.ts` |
| AI-assistant summary (GEO) | `/llms.txt`: a short factual summary of the studio, services, key pages and projects, generated from the same content | `src/app/llms.txt/route.ts` |
| Content without scripts | Page text is rendered on the server and is in the HTML | Next.js server rendering |
| Images | Responsive `next/image` with `alt` text and explicit sizes | `Photo` component |
| Semantic HTML | One `h1` per page, ordered headings, landmarks, labelled forms | checked with the W3C validator |

Structured data contains only facts that are visible on the site. There is **no** address, phone, rating, review, price or opening
hours in the markup, because none has been verified. `Organization.sameAs` fills in automatically from `site.social` in
`src/config/site.ts` as soon as real profile URLs are added there.

## What you must supply for the best result

1. The real domain: set `NEXT_PUBLIC_SITE_URL` in Vercel (today `https://singledotstudio.vercel.app`) and redeploy.
2. Verified phone, email and address in the admin (Website, Text). Then add them to the structured data (a `LocalBusiness` or
   `HomeAndConstructionBusiness` block) together with the visible contact details, never one without the other.
3. Real social profile URLs in `site.social`.
4. Real project photos (admin: Website, Images). Stock photos are credited on `/credits`.

## Launch steps

1. Add the site in **Google Search Console** and **Bing Webmaster Tools**; verify the domain; submit `https://<domain>/sitemap.xml`.
2. Check each key page in Google's Rich Results Test and the Schema.org validator (FAQ, breadcrumb, organisation).
3. Run Lighthouse (mobile and desktop) on the live site and record the real scores; fix anything under 90 that matters.
4. Redirect every other host name (for example `www` or the `vercel.app` address) to the one canonical domain, and force HTTPS.

## Honest limits

No ranking and no AI-answer citation can be promised. Keyword stuffing is not used. Search and AI visibility grow from real, useful
content, real projects, a verified business profile and good links from other sites (see `docs/backlinks-and-listings.md`).
