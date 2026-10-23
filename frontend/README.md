# Front end (static site)

Plain HTML, CSS and browser JavaScript (ES modules). **No Node.js, no bundler, no build step is required to run or deploy it**:
upload the contents of this folder to any static host or CDN.

```
frontend/
  index.html, about/, services/, projects/, contact/, calculate-budget/, privacy/, terms/, credits/, 404.html
  admin/index.html            staff sign-in and leads list (noindex)
  robots.txt, sitemap.xml
  _headers                    security and cache headers (Netlify / Cloudflare Pages format; translate for other hosts)
  assets/
    css/   tokens, global, typography, layout, components/, pages/, animations, responsive ... + order.txt + bundle.css
    js/    config.js, main.js, navigation.js, animations.js, forms.js, calculator.js, admin.js, api-client.js
    images/  responsive WebP (480/960/1600 px) with JPEG fallbacks
    fonts/   self-hosted Cormorant Garamond, Nunito Sans, DM Sans (Latin), SIL Open Font License
    data/calculator.json      the calculator's room and package lists (no prices)
  tools/bundle-css.sh
```

## Run it locally

Any static file server works. The JDK you already need for the back end includes one:

```bash
jwebserver -d frontend -p 8000        # http://localhost:8000
```

Start the API on port 8080 (see the root README). For a throw-away database without installing PostgreSQL:
`cd backend && ./mvnw test -Dtest=LocalDevServer -DdevServer=true`. The default `APP_FRONTEND_ORIGINS` is `http://localhost:8000`.

## Point the site at your API

Edit `assets/js/config.js`: set `apiBase` to your API origin (https in production, no trailing slash). The API must list the site's
origin in `APP_FRONTEND_ORIGINS`.

## Editing

* Pages are plain HTML. The header, footer and calculator button are repeated in each page; use find and replace across the folder
  when you change them.
* CSS is split into small files, listed in load order in `assets/css/order.txt`. Pages load one file, `assets/css/bundle.css`
  (fewer requests). After editing any CSS file run `sh tools/bundle-css.sh` and commit both.
* Calculator lists: `assets/data/calculator.json` mirrors the spaces and packages in `backend/src/main/resources/pricing.json`
  (without prices). The server is authoritative: it refuses a space or option that is not in its own price book, so a stale copy
  can never produce a wrong price, only a rejected request. Update both files together.
* Prices shown in the cost tables on the service pages are placeholders copied from `pricing.json`.

## Changing the domain

Canonical URLs, Open Graph URLs, the sitemap and `robots.txt` use `https://singledotstudio.vercel.app` today. When the real domain
is decided:

```bash
grep -rl "https://singledotstudio.vercel.app" --include="*.html" --include="*.xml" --include="*.txt" . \
  | xargs sed -i 's#https://singledotstudio.vercel.app#https://www.your-domain.com#g'
```

## Checks that were run

* **HTML:** the W3C Nu validator (`vnu.jar`, a Java program) reports no errors and no warnings across every page.
* **Links and assets:** every internal link, image, srcset entry, stylesheet and anchor resolves (2,036 references).
* **Accessibility:** axe-core 4.10 (WCAG 2.0, 2.1 and 2.2 A and AA rules) reports no violations on the pages and calculator steps tested.
* **Overflow:** no horizontal scrolling on 18 pages at 320, 375, 430, 600, 768, 1024, 1280 and 1440 px.
* **End to end:** the calculator and consultation form posted to the Java API, and staff sign-in, lead list and PDF download worked
  across origins (site on :8000, API on :8080).

Not run: Lighthouse and Core Web Vitals on a real network, and a real-device mobile test. Measure those after deployment.

## Motion

Everything respects `prefers-reduced-motion` (splash, hero carousel, marquee, reveal, calculator animation). Essential actions do
not need hover. The hero's WebGL ripple layer from the old site was not carried over; the photo carousel and slow push-in remain.
