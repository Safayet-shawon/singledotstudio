# SEO, AEO and GEO

## Status

SEO work belongs to the front-end migration (`frontend/`), which has **not started**. The current Next.js site already
renders its content on the server, has per-page titles and descriptions, a sitemap and `robots.txt`, structured data for
services, and a documented photo-credits page; those stay as they are until the static site replaces them.

The back end has no public HTML, so it has no SEO surface of its own. It serves only JSON and sends `Cache-Control: no-store`.

## Plan for the static site

* Semantic HTML pages whose main content is in the HTML itself (no client-side rendering needed for the main text).
* One unique title and meta description per page; a canonical URL on the real production domain; Open Graph tags.
* `sitemap.xml` and `robots.txt` generated from the actual list of pages and using the production domain, not a deployment URL.
* Structured data matching visible content only: `Organization` (or a LocalBusiness subtype once a verified address exists),
  `WebSite`, `BreadcrumbList`, and `Service` for each service page. Do not add an address, rating, review, price or opening
  hours that is not real and shown on the page.
* Answer real customer questions in each service page's FAQ, in plain language. Keep business identity and service
  descriptions consistent across pages.
* Images with descriptive `alt`, explicit width and height, lazy loading below the fold, and a prioritised hero image.

No ranking or AI-answer citation can be promised. Do not stuff keywords.

## How to validate

1. Validate the HTML (the W3C Nu validator can be run as a Java jar, so no Node.js is needed).
2. Check each page's title, description, canonical and Open Graph tags in the page source.
3. Test structured data with Google's Rich Results Test and the Schema.org validator.
4. Submit the sitemap in Google Search Console and Bing Webmaster Tools once the domain is final.
5. Run Lighthouse on mobile and desktop and record the real numbers; do not quote targets as results.
