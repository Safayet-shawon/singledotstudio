# Security

This describes the controls in the Java back end, the threats they address and what is **not** covered. No system is
completely secure; this is a record of what was done and tested, not a guarantee.

Reference points: OWASP Top 10 and the OWASP Application Security Verification Standard (ASVS).

## Threat model

| Asset | Threat | Control |
| --- | --- | --- |
| Customer contact details | Leak through errors, logs or the API | Safe JSON errors; logs carry exception types only; the public API never returns stored contact data or prices |
| Estimate prices | Client tampering with totals | Prices are calculated only on the server; the request type has no price field; unknown fields are ignored; test `aClientSuppliedTotalIsIgnored` |
| Staff accounts | Password guessing, credential stuffing | bcrypt (strength 12), per-account lockout, per-IP and per-account rate limits, one generic error, constant-time password check even for unknown accounts |
| Staff sessions | Theft, fixation, CSRF, cross-site requests | Opaque HttpOnly Secure SameSite cookie, session id changed on login, sessions stored in PostgreSQL so they can be revoked, CSRF token on every change, trusted-Origin check |
| The database | Injection | JPA and parameterised JDBC only; no string-built SQL; inputs validated by pattern and length |
| Availability | Spam, floods, large bodies, slow mail | Rate limits shared through PostgreSQL, honeypot field, de-duplication, 64 KB body cap (also for chunked bodies), server timeouts, mail on a separate bounded thread pool |
| Secrets | Commit or log exposure | Environment variables only; `.env*` ignored by Git; start-up check refuses unsafe production settings; admin bootstrap takes a hash, never a password |
| Email | Header injection, HTML injection | Control characters removed from names and subjects; every customer value HTML-escaped in the email body |

## Controls

**Input validation.** Jakarta Bean Validation on every request (types, lengths, patterns, a hard cap of 40 items, 10 add-ons),
then business rules against the price book (size range, BHK range, only spaces valid for that property type, quantity limits).
Negative, oversized or unknown values are rejected with a 400 and a safe message.

**Authentication and sessions.** Spring Security with a database-backed user table. No custom cryptography. No public
registration and no default administrator: the first account is created only from `APP_ADMIN_BOOTSTRAP_EMAIL` and a bcrypt
**hash** in `APP_ADMIN_BOOTSTRAP_PASSWORD_HASH`. Five wrong passwords lock an account for 15 minutes (kept in the database, so it
holds across instances). Sessions expire after 30 minutes idle and can be ended from the server
(`POST /api/v1/admin/auth/sessions/revoke-all`, or `DELETE FROM spring_session`).

**Authorisation.** Every route under `/api/v1/admin/**` requires the `ADMIN` role, enforced in the security filter chain and again
with `@PreAuthorize` on the controller. Everything not listed in the chain is denied by default. Tests prove the admin routes
return 401 without a session.

**CSRF and cross-site requests.** Public form endpoints carry no session, so they are exempt from CSRF but protected by the
Origin check, rate limit and honeypot. All staff changes require a CSRF token and an Origin that matches
`APP_FRONTEND_ORIGINS`. CORS allows only those origins, only `GET`, `POST`, `OPTIONS`, and only the headers the site needs.

**Rate limiting.** Counters live in PostgreSQL (fixed windows), so the limit is global across back-end instances. A client is
a hash of its IP address (the address itself is not stored). Behind a proxy, `X-Forwarded-For` is honoured only from
addresses matching `TRUSTED_PROXY_REGEX`; set it to your proxy. If the database is unavailable, requests fail closed.

**Headers.** `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, a restrictive `Permissions-Policy`, `Cache-Control: no-store`, and
HSTS (one year, subdomains) on HTTPS responses. The static site's own CSP and cache headers are in `frontend/_headers` (script and font sources limited to the site itself, `connect-src` limited to the site and the API origin, no framing).

**Errors and logging.** One JSON error shape. No stack traces, SQL or configuration in responses. Unexpected errors get a
short correlation id that appears in the log. Mail failures log only the exception class. Passwords, cookies, tokens and
form bodies are never logged.

**PDF.** Built in memory from stored data, with fixed fonts; customer text outside Latin characters is replaced by `?` rather
than being parsed. The staff download is sent as an attachment with `nosniff` and `no-store`.

**Dependencies.** Spring Boot 4.1.2 (stable) manages Spring, Hibernate, Tomcat, Jackson, Flyway and the PostgreSQL driver.
Dependabot (`.github/dependabot.yml`) opens weekly update pull requests for Maven and GitHub Actions. CI runs the whole test
suite on every push.

## Not covered / outstanding risks

* **No multi-factor authentication** for staff. Recommended next step: TOTP for the administrator role.
* **No password reset or staff management screens.** Additional staff accounts and password changes are done by an operator
  in the database; add an audited admin flow before inviting more people.
* **Rate limits use IP addresses.** Visitors behind one shared address share a budget; an attacker with many addresses can
  spread attempts (per-account login limits and lockout reduce the impact). A CDN or WAF in front adds a second layer.
* **The lockout can be used to lock the owner out** by sending wrong passwords. The lock is short (15 minutes) and a correct
  password never reveals itself during a lock.
* **Dependency scanning** here is Dependabot plus the test suite. A dedicated vulnerability scanner (for example OWASP
  Dependency-Check or GitHub code scanning) has **not** been run for this work.
* **Docker image** (`backend/Dockerfile`) has not been built or scanned in this environment (Docker was not available).
* **Backups, monitoring and alerting** are documented in `docs/deployment.md` but must be set up with the hosting provider.
* **Front end:** no secrets and no privileged logic live in `frontend/`. `config.js` holds only the public API address. The CSP in `_headers` allows inline `style` attributes (`style-src 'unsafe-inline'`) because the pages and the calculator use them; scripts are `self` only. The staff page shows only what the API returns to a signed-in session.
* **The studio OS admin** (employees, projects, finance, documents, CMS) still runs in the old Next.js code and has the
  controls described in that code's own history; it is not part of this back end yet.
* **Email addresses and phone numbers** are stored in plain columns. Disk encryption and access control are the database
  provider's responsibility; set a retention policy before launch.

## Reporting

Report security problems privately to the studio owner rather than in a public issue.
