# Deployment

Nothing has been deployed, purchased or provisioned as part of this work, and no production credential was touched.
This document is the plan and the steps.

## Shape

```
visitors --> static host / CDN (frontend/)  --fetch-->  api.<your domain>  -->  Spring Boot (Java 25)  -->  PostgreSQL
                                                                                     |
                                                                                     +--> SMTP provider
```

* **Front end:** the `frontend/` folder, uploaded as is to any static host or CDN (no Node.js runtime or build is needed). Set
  `apiBase` in `frontend/assets/js/config.js` to the API origin, and apply the headers in `frontend/_headers` (or the same headers in
  your host's settings). Try it locally with `jwebserver -d frontend -p 8000`.
* **API:** any host that runs a container or a Java 25 process. A `backend/Dockerfile` is provided (multi-stage, JRE only,
  non-root). It has **not** been built here because Docker is not installed on this machine.
* **Database:** managed PostgreSQL (the tests ran on PostgreSQL 14; use 14 or newer).
* **Domains:** serve the site on `www.example.com` and the API on `api.example.com`. The same registrable domain lets the
  staff session cookie work with `SameSite=Lax`. If you must use unrelated domains, set `COOKIE_SAMESITE=none` and keep
  `COOKIE_SECURE=true`, and accept the extra cross-site risk.
* **HTTPS everywhere.** Terminate TLS at the platform or proxy and forward `X-Forwarded-For`/`X-Forwarded-Proto`. Set
  `TRUSTED_PROXY_REGEX` to match your proxy so rate limits see real client addresses.

Verify current platform support and prices on the provider's own pages before choosing. Platforms that run containers or Java apps and
offer managed PostgreSQL include Railway, Render, Fly.io and the large clouds. **Vercel can also run this API**: since 2026 its
Container Runtime (Beta, all plans) runs any Dockerfile as a Vercel Function, and Vercel Services puts the static site and the API in one
project behind one domain. A plain Node-only Vercel project cannot run Java; the container runtime is what makes it possible. This is how
the first deployment was done (next section). Trade-offs: the beta status, and a Spring Boot container that has been idle for 5 minutes
scales to zero, so the first request after a quiet period waits for the JVM to start (expect several seconds).

## Deploying on Vercel (what was done)

One Vercel project with two services behind one domain (`deploy/vercel.json`):

* `frontend/` is served as static files.
* `backend/` is built from `backend/Dockerfile.vercel` and receives `/api/*` and `/actuator/*`.

Because both share one origin, the site calls the API with relative URLs (`apiBase` is empty in `config.js`), there is no CORS, and the
staff cookie is first-party.

```bash
sh deploy/stage.sh ~/deploy/singledotstudio-v2      # copies vercel.json + frontend + backend into a clean folder
cd ~/deploy/singledotstudio-v2
vercel link --yes --project singledotstudio-v2       # first time only
# set the variables in docs/environment-variables.md as sensitive Vercel variables, plus PORT=8080
vercel deploy --prod --yes
```

Variables specific to this setup: `PORT=8080` (the container must listen on it), `TRUSTED_PROXY_REGEX=.*` (Vercel's edge overwrites
`X-Forwarded-For`, and the container is reachable only through it; without this every visitor would share one rate-limit bucket),
`SPRING_FLYWAY_SCHEMAS` and `SPRING_FLYWAY_DEFAULT_SCHEMA` to keep this API's tables in their own schema (`sds_api`), and `currentSchema=sds_api`
on the JDBC URL. The database is Neon PostgreSQL; use the **unpooled** connection string, with a small pool (`DB_POOL_MAX=4`).

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
