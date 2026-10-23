# Environment variables

Nothing secret is stored in the repository. Set these in your hosting provider's secret manager. `backend/.env.example` is a
template.

## Required in production (`SPRING_PROFILES_ACTIVE=prod`)

In the `prod` profile the application **refuses to start** if a required value is missing or unsafe. The error names the
variable and never prints a value.

| Variable | Purpose |
| --- | --- |
| `SPRING_PROFILES_ACTIVE` | Set to `prod` to turn the start-up safety checks on |
| `DATABASE_URL` | JDBC URL, for example `jdbc:postgresql://host:5432/singledotstudio?sslmode=require` |
| `DATABASE_USERNAME`, `DATABASE_PASSWORD` | Database login. Use a dedicated user that owns only this database |
| `APP_FRONTEND_ORIGINS` | Comma-separated website origin(s), **https only**, no trailing slash. Drives CORS and the Origin check |
| `APP_PUBLIC_BASE_URL` | The website's canonical https URL |
| `COOKIE_SECURE` | Keep `true`. The staff session cookie is then sent over HTTPS only |
| `APP_MAIL_FROM` | Sender address the SMTP account may send as |
| `APP_MAIL_LEAD_INBOX` | Where the studio receives quotation and consultation alerts |
| `SPRING_MAIL_HOST`, `SPRING_MAIL_PORT`, `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD` | SMTP provider (STARTTLS is required) |

To run without email, set `APP_MAIL_ENABLED=false`. Requests are still stored; mail rows are recorded as `SKIPPED`.

## Staff login

| Variable | Purpose |
| --- | --- |
| `APP_ADMIN_BOOTSTRAP_EMAIL` | Email of the first administrator |
| `APP_ADMIN_BOOTSTRAP_PASSWORD_HASH` | A bcrypt **hash**, never a password. Create it with `java -jar singledotstudio-backend.jar --hash-password` |

The account is created only when there are no administrators yet. Afterwards, remove both variables. There is no public
sign-up and no default account.

## Optional

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8080` | HTTP port |
| `COOKIE_SAMESITE` | `lax` | Use `lax` when the site and API share a registrable domain (`www.` and `api.`) |
| `SESSION_TIMEOUT` | `30m` | Idle time before a staff session expires |
| `DB_POOL_MAX` | `10` | Maximum database connections |
| `TRUSTED_PROXY_REGEX` | private ranges | Which proxy addresses may set `X-Forwarded-For`. Rate limits depend on this being right |
| `APP_COMPANY_NAME`, `_TAGLINE`, `_ADDRESS`, `_PHONE`, `_EMAIL`, `_WEBSITE` | blank or studio name | Printed on the quotation PDF. Leave blank until verified |
| `APP_COMPANY_QUOTE_VALID_DAYS` | `15` | "Valid until" date on quotations |
| `APP_COMPANY_PAYMENT_TERMS`, `APP_COMPANY_FOOTER` | blank | Printed on the PDF |

## If a credential was ever exposed

Rotate it at the provider (database password, SMTP password), update the secret in the host, and redeploy. To end all staff
sessions at once, run `DELETE FROM spring_session;` against the database. A search of this repository's Git history for
database URLs, Blob tokens, SMTP passwords and API keys found none committed, but the search is pattern-based, not a
guarantee: rotate anything you have ever pasted into a chat, ticket or file.
