# HTTP endpoints of the site

The site's own server routes (Next.js). The staff area uses server actions behind a login and is not a public API.

| Method and path | Purpose | Notes |
| --- | --- | --- |
| `POST /api/estimate` | Quotation request from the calculator | Validates input, recalculates the price on the server, stores the lead, emails the branded PDF to the customer and the studio. The response contains a reference and email status, **not the price** |
| `POST /api/consultation` | Consultation request | Validates, stores the lead and emails the studio |
| `GET /api/health` | Uptime probe | `{"status":"ok"}`, no configuration details, never cached |
| `GET /cms-media/{id}` | An image uploaded in the admin | Public, served from private storage |
| `GET /llms.txt` | Summary for AI assistants | Generated from site content |
| `GET /sitemap.xml`, `/robots.txt` | Search engines | |
| `GET /.well-known/security.txt` | Security contact (RFC 9116) | Returns 404 until the `SECURITY_CONTACT` variable (an email or https URL) is set |

## Request body: `POST /api/estimate`

```json
{ "estimateInput": { "propertyType": "apartment", "sqft": 1450, "bhk": 3, "items": { "master": 1, "kitchen": 1 },
                     "package": "premium", "extras": ["smart"], "sizeLabel": "1350-1499" },
  "name": "Asha Rahman", "phone": "+8801700000000", "whatsapp": true, "email": "asha@example.com",
  "address": "Dhaka", "consent": true, "website": "" }
```

`propertyType`: `apartment`, `villa`, `office` or `showroom`. `package`: `essential`, `premium`, `luxury` or `bestfit`.
`website` is a honeypot and must stay empty.

## Protections on the public routes

Same-origin check, database-backed rate limit (8 requests per 10 minutes per client), 20 KB body limit, strict validation, no
internal error details in responses, security headers (CSP, HSTS, no framing, no sniffing) on every response.

Errors are `{ "error": "message" }` with 400 (invalid), 403 (wrong origin), 429 (rate limit) or 500 (unexpected).

The separate Java API (branch `feature/java-backend`) has its own reference in `docs/api.md` on that branch.
