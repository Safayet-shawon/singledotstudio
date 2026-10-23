# API reference (v1)

Base URL: your API origin, for example `https://api.example.com`. All bodies are JSON (`Content-Type: application/json`).
Errors always use one shape:

```json
{ "error": "Please check the highlighted details and try again.", "fields": [{ "field": "email", "message": "must be a valid email address" }], "correlationId": "a1b2c3d4" }
```

`fields` appears for validation errors; `correlationId` only for unexpected 500s (it is also in the server log).

| Status | Meaning |
| --- | --- |
| 400 | Validation or business-rule failure |
| 401 | Staff sign-in required |
| 403 | CSRF token missing or wrong, or a request from an untrusted origin |
| 404 | Not found |
| 413 | Request body over the limit (64 KB by default) |
| 415 | Body was not JSON |
| 429 | Rate limit reached; `Retry-After` gives the seconds to wait |
| 500 | Unexpected error; nothing internal is returned |

## Public

### `POST /api/v1/estimates`

Requests a quotation. The price is calculated on the server, emailed to the customer and the studio, and **not**
returned.

```json
{
  "estimateInput": {
    "propertyType": "apartment",
    "sqft": 1450,
    "bhk": 3,
    "items": { "master": 1, "child": 2, "family": 1, "kitchen": 1 },
    "package": "premium",
    "extras": ["smart"],
    "sizeLabel": "1350-1499"
  },
  "name": "Asha Rahman", "phone": "+8801700000000", "email": "asha@example.com",
  "address": "Dhaka", "whatsapp": true, "consent": true, "website": ""
}
```

* `propertyType`: `apartment`, `villa`, `office` or `showroom`. `bhk` applies to apartment and villa only.
* `package`: `essential`, `premium`, `luxury` or `bestfit`.
* `items` keys must be spaces in the price book for that property type; quantities are limited per space.
* `website` is a honeypot: it must be empty.
* Unknown JSON fields (for example a client-calculated `total`) are ignored.

Response `200`:

```json
{ "reference": "QUO-20261023-A1B2", "customerEmail": "queued", "teamNotified": true, "duplicate": false }
```

`customerEmail` is `queued`, or `not_configured` when the server has no mail settings. Sending the same options again
within 15 minutes returns the original reference with `"duplicate": true` and does not create a second estimate or email.

### `POST /api/v1/consultations`

```json
{ "name": "Rafi Ahmed", "phone": "01711000000", "email": "rafi@example.com", "address": "Gulshan, Dhaka",
  "segment": "showroom", "service": "showroom", "budget": "10-20 lakh", "message": "We need a showroom.",
  "consent": true, "website": "" }
```

`segment`: `home`, `office` or `showroom`. Response: `{ "reference": "CON-20261023-C3D4", "duplicate": false }`.

Both public endpoints are limited to 8 requests per client per 10 minutes.

### `GET /actuator/health`

`{"status":"UP"}` plus the standard group list. No details are shown. Use it for load-balancer and platform health checks.

## Staff (session cookie `SDS_SESSION`, HttpOnly)

Every request below needs the session cookie. Every `POST` also needs the header `X-CSRF-TOKEN` from `GET .../csrf`,
and an `Origin` header that matches `APP_FRONTEND_ORIGINS`. Browsers must send `credentials: "include"`.

| Method and path | Purpose |
| --- | --- |
| `GET /api/v1/admin/auth/csrf` | Returns `{ headerName, token }`; call before login and keep the token |
| `POST /api/v1/admin/auth/login` | Body `{ email, password }`; `200 { email }`, or `401` with one generic message |
| `GET /api/v1/admin/auth/me` | Current staff email |
| `POST /api/v1/admin/auth/logout` | Ends this session |
| `POST /api/v1/admin/auth/sessions/revoke-all` | Ends every session of this account (lost device) |
| `GET /api/v1/admin/estimates?page=0&size=25` | Paged estimates, newest first, with price and mail status |
| `GET /api/v1/admin/consultations?page=0&size=25` | Paged consultation requests with mail status |
| `GET /api/v1/admin/estimates/{id}/pdf` | The quotation PDF, as a download; never cached |

Login is limited to 10 attempts per client and per account per 15 minutes; 5 wrong passwords lock the account for 15 minutes.
