# Deployment

Nothing has been deployed, purchased or provisioned as part of this work, and no production credential was touched.
This document is the plan and the steps.

## Shape

```
visitors --> static host / CDN (frontend/)  --fetch-->  api.<your domain>  -->  Spring Boot (Java 25)  -->  PostgreSQL
                                                                                     |
                                                                                     +--> SMTP provider
```

* **Front end:** static files. Any static host or CDN works (no Node.js runtime is needed). Not migrated yet; until it is,
  the existing Next.js site continues to run where it is today.
* **API:** any host that runs a container or a Java 25 process. A `backend/Dockerfile` is provided (multi-stage, JRE only,
  non-root). It has **not** been built here because Docker is not installed on this machine.
* **Database:** managed PostgreSQL (the tests ran on PostgreSQL 14; use 14 or newer).
* **Domains:** serve the site on `www.example.com` and the API on `api.example.com`. The same registrable domain lets the
  staff session cookie work with `SameSite=Lax`. If you must use unrelated domains, set `COOKIE_SAMESITE=none` and keep
  `COOKIE_SECURE=true`, and accept the extra cross-site risk.
* **HTTPS everywhere.** Terminate TLS at the platform or proxy and forward `X-Forwarded-For`/`X-Forwarded-Proto`. Set
  `TRUSTED_PROXY_REGEX` to match your proxy so rate limits see real client addresses.

Verify current platform support and prices on the provider's own pages before choosing. Platforms that run containers or
Java apps and offer managed PostgreSQL include Railway, Render, Fly.io and the large clouds; a platform built for Node
serverless functions (such as Vercel) is **not** a place to run this Java API.

## Steps

1. Create a PostgreSQL database and a dedicated user that owns it.
2. Create the API service from `backend/` (use the Dockerfile, or `./mvnw -B package -DskipTests` then
   `java -jar target/singledotstudio-backend-1.0.0.jar`).
3. Set the variables in `docs/environment-variables.md`. With `SPRING_PROFILES_ACTIVE=prod` the service refuses to start if a
   required one is missing.
4. First start: Flyway creates the schema automatically (additive migrations only). Hibernate validates it.
5. Create the first administrator: locally run `java -jar target/singledotstudio-backend-1.0.0.jar --hash-password`, put the
   printed value in `APP_ADMIN_BOOTSTRAP_PASSWORD_HASH` with `APP_ADMIN_BOOTSTRAP_EMAIL`, restart once, then remove both.
6. Point the platform's health check at `GET /actuator/health`.
7. Send a test quotation request and a consultation from the live site; confirm both appear under the staff endpoints and the
   emails arrive.

## Database operations

* **Migrations.** Add new files `V3__...sql`, `V4__...sql`; never edit an applied one. Flyway cannot clean the database
  (`clean-disabled: true`). Review any migration that drops or rewrites data and take a backup first.
* **Backups.** Turn on the provider's automated daily backups with point-in-time recovery if offered. Also keep a periodic
  logical dump: `pg_dump --format=custom --file=sds-$(date +%F).dump "$DATABASE_URL_FOR_PSQL"`.
* **Restore (rehearse this before launch).** Create an empty database, then
  `pg_restore --clean --if-exists --no-owner --dbname=<new db> sds-YYYY-MM-DD.dump`. Start the API against it; Flyway sees the
  migrations already applied and does nothing.
* **Retention.** The tables hold names, emails, phone numbers and addresses. Decide how long to keep them and delete old rows
  on a schedule.

## Logging and monitoring

Logs go to standard output; let the platform collect them. Watch for HTTP 5xx, repeated 429s and 401s on `/api/v1/admin/`,
rows in `notification_deliveries` stuck at `FAILED`, and database connection saturation. Alert on `/actuator/health`
failing. These need to be configured with your provider; none are set up by this repository.

## Costs (structure, not quotes)

* Static front end: often free or very cheap on a static host or CDN.
* API: one small always-on container or VM, billed monthly.
* PostgreSQL: a managed database is usually the larger line item, billed monthly and growing with storage and backups.
* Email: many SMTP providers have a free tier that is enough for a studio's volume; paid tiers add reputation and logs.
* Domain and DNS: yearly.

Amounts change often. Get current prices from the chosen providers and choose the smallest sizes first.
