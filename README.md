# Interior design studio website

Premium multi-page website built with **Next.js (App Router, TypeScript)**. Designed for Vercel.

> Brand name, logo, owner details, contact details, statistics, photography, videos and all prices are
> **placeholders** until you supply real ones. Nothing in the site invents business facts.

## Quick start

```bash
npm install
cp .env.example .env.local   # all values optional; see "Configuration"
npm run dev                  # http://localhost:3000
npm run lint                 # type-check
npm test                     # pricing engine unit tests
npm run build && npm start   # production build
```

## Where to edit things

| What | File |
| --- | --- |
| Brand name, logo path, owner, contact, social links, statistics | `src/config/site.ts` |
| Services, service copy, FAQs, concept projects | `src/config/site.ts` |
| **All prices, rates, packages, extras, tax, Best-Fit rules** | `config/pricing.json` |
| Video art direction prompts | `src/config/video-prompts.ts` |
| Colours / spacing / type | `src/app/globals.css` (`:root` tokens) |

- **Logo:** put a file in `public/` and set `site.brand.logo = '/logo.svg'`. Until then a temporary monogram wordmark is shown.
- **Photos:** drop files into `public/media/img/` named by slot, e.g. `service-kitchen.jpg`, `project-kitchen-1.jpg`, `owner-portrait.jpg`, `why-us.jpg`, `about-studio.jpg`. Slots without a file render a clearly labelled placeholder.
- **Statistics:** set `value` in `site.stats`. `null` shows `XX` with a "Placeholder" tag.
- **Pricing:** `placeholder: true` in `pricing.json` adds "placeholder rates" notices to the calculator, service pages and PDF. Set it to `false` once real rates are in.

## Pages

`/`, `/services`, `/services/{kitchen,bedroom,bathroom,living-dining,office}`, `/about`, `/projects`,
`/projects/{slug}`, `/contact`, `/calculate-budget`, `/privacy`, `/terms`, plus custom 404, `sitemap.xml`, `robots.txt`.
Privacy and Terms are **draft templates** and need legal review.

## Budget calculator

Four steps (property, spaces, package, details) with a progress indicator, shared by the floating
"Calculate your budget" button (dialog) and `/calculate-budget` (inline). Same component, same saved draft.

- Maths lives in `src/lib/estimate.ts` (pure, unit-tested) and is **recomputed on the server** before the PDF is made.
- **Best Fit for You** is rule-based (size, number of spaces, BHK, optional target budget) and explains its reasoning. It is not AI.
- The automatic teaser prompt appears at most once per browser (`localStorage`: shown, dismissed, opened or completed). The floating button is always available.
- The visitor's in-progress answers persist across refreshes; "Start a new estimate" clears them.
- `POST /api/estimate` returns the estimate and the PDF (base64). The browser downloads it, so **PDF download works with no email set up**.
- Email: sent only if SMTP is configured; the UI reports `sent`, `not configured` or `failed` truthfully.
- WhatsApp: the share button appears only when `NEXT_PUBLIC_WHATSAPP_NUMBER` is set. It opens a prefilled `wa.me` link; that does not mean a message was sent.

## Configuration (environment variables)

See `.env.example`. Set the same names in **Vercel > Project > Settings > Environment Variables**.

| Variable | Purpose |
| --- | --- |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Email delivery (server only) |
| `NOTIFY_TO` | Inbox for consultation requests and estimate leads |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Enables WhatsApp sharing (public by nature) |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL, sitemap |
| `MUAPI_API_KEY` | Video generation (server/CLI only, never `NEXT_PUBLIC_`) |
| `VIDEO_ADMIN_TOKEN` | Enables the admin-only `/api/video`; leave empty on production |

**Leads on Vercel:** the filesystem is read-only there, so leads are delivered by email (`NOTIFY_TO`) only. With no inbox
configured, the consultation form tells the visitor honestly that online requests are not enabled instead of showing a false
success. In local development leads are also appended to `data/leads.jsonl` (git-ignored).

**Spam/abuse:** honeypot field, server validation, 20 KB body limit, and a best-effort in-memory rate limit per instance.
For strict limits on production, add a Vercel Firewall rate-limit rule for `/api/*`.

## Generating videos

Videos are generated through [Muapi.ai](https://muapi.ai) using the same request pattern as the local
`open-higgsfield-ai` project (`POST /api/v1/{model}` with `x-api-key`, then poll `/api/v1/predictions/{id}/result`).

```bash
# 1. Put MUAPI_API_KEY in .env.local
# 2. Preview the exact request without spending credits
node scripts/generate-video.ts --slot home --dry-run
# 3. Generate (SPENDS CREDITS), saving to public/media/video/home.mp4
node scripts/generate-video.ts --slot home
# optional poster still (public/media/img/home-poster.jpg)
node scripts/generate-video.ts --slot home --poster
# if the process stops, resume without paying twice
node scripts/generate-video.ts --slot home --resume <request_id>
```

Slots: `home kitchen bedroom bathroom living-dining office about services`. A page shows a video only if
`public/media/video/<slot>.mp4` exists; otherwise a labelled gradient placeholder. Hero slots used: home -> `home`,
about -> `about`, services -> `services`, each service page -> its own slug.

- Models are a strict allowlist in `src/lib/muapi.ts` (constraints copied from the Open Higgsfield catalog). Prompt, aspect ratio, duration and resolution are validated.
- The submit call is never auto-retried (it costs money); polling retries transient errors with backoff and times out after 10 minutes.
- Provider responses are not echoed to logs or clients.
- `POST/GET /api/video` exists for admin use, is **404 unless `VIDEO_ADMIN_TOKEN` is set**, needs a bearer token, and is rate limited. It never downloads files (read-only filesystem); use the CLI to save outputs.
- **Compress before committing**: keep hero videos small (aim for under ~4 MB, 1080p, H.264). Install ffmpeg, e.g. `ffmpeg -i in.mp4 -vf scale=1920:-2 -an -crf 28 -movflags +faststart public/media/video/home.mp4`.
- Verify each file plays in the browser before publishing. Check the model's cost in your Muapi dashboard first.

## Deployment (Vercel)

1. Push this repository to GitHub.
2. Import it in Vercel (framework: Next.js, root: repository root, no custom build settings).
3. Add the environment variables you need (see above). None are required for a working site.
4. Deploy. Every push to the production branch redeploys.

Or with the CLI: `npm i -g vercel && vercel login && vercel link && vercel --prod`.

## Testing

`npm run lint` (tsc), `npm test` (pricing engine), `npm run build`. Browser behaviour (gallery autoscroll, hover pause, drag, calculator flow, form validation, once-only prompt, mobile drawer) was checked with an automated Chrome script during development; that script is not part of the repository.
