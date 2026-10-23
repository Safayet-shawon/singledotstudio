# SEO, AEO and GEO

## What is in place (static site, `frontend/`)

* **Content without JavaScript.** The main text of every public page is in the HTML. Scripts only add motion and interaction. With
  scripts off, content stays visible and the forms say that JavaScript is needed.
* **Per-page metadata:** a unique `<title>` and meta description, a canonical URL, Open Graph tags (title, description, URL, image) and
  `twitter:card`. `404.html` and `/admin/` are `noindex`.
* **Semantic structure:** one `h1` per page, ordered headings (checked by the W3C validator), landmarks, labelled forms, descriptive
  `alt` text, and `width`/`height` on images to prevent layout shift.
* **`robots.txt`** allows crawling, disallows `/admin/` and names the sitemap. **`sitemap.xml`** lists the 23 indexable pages.
* **Structured data (JSON-LD), only for content that is visible on the page:**
  `Organization` and `WebSite` (home), `Service` and `FAQPage` (each service page, from its visible FAQ), `BreadcrumbList` (inner
  pages). No address, rating, review, price, opening hours or phone number is published, because none has been verified. When the
  studio supplies verified details, add them to `Organization` (or a LocalBusiness subtype) and to the footer together.
* **Internal links** are plain crawlable `<a href>` links; the header, footer and cards link to every service and project.
* **AEO/GEO:** each service page answers real questions in plain language in its FAQ and describes approach, materials, lighting and
  planning under descriptive headings. Business identity (name, tagline, services) is identical on every page.
* **Images:** responsive WebP (480, 960, 1600 px) with JPEG fallbacks, lazy loading below the fold, a prioritised hero image.
* **Fonts:** self-hosted, `font-display: swap`, the two main faces preloaded.

## The domain

Canonical URLs, the sitemap and `robots.txt` currently use `https://singledotstudio.vercel.app`, the domain the site is on today.
When a custom domain is chosen, run the replace command in `frontend/README.md` and resubmit the sitemap. Redirect every other
host name to the one canonical host, and force HTTPS, at the hosting layer.

## Validation process

1. HTML: `java -jar vnu.jar --skip-non-html frontend` (the W3C Nu validator). Result at the time of writing: no errors, no warnings.
2. Look at each page's source for the title, description, canonical and Open Graph tags.
3. Test structured data with Google's Rich Results Test and the Schema.org validator.
4. Submit `sitemap.xml` in Google Search Console and Bing Webmaster Tools after launch.
5. Run Lighthouse on mobile and desktop against the deployed site and record the real numbers.

No ranking or AI-answer citation can be promised, and keywords are not stuffed.

## Not done

* Real-network Core Web Vitals (the site is not deployed).
* A custom 404 on hosts that do not serve `404.html` automatically (most static hosts do).
* The photographs are stand-ins (see `/credits/`); the studio's own project photography will improve both SEO and trust.
