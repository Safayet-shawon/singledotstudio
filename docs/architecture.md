# Architecture

Single Dot Studio is moving from a Next.js application (Node.js) to a Java back end plus a plain HTML/CSS/JavaScript
front end. This document describes the target and the current state of that migration.

## Status

| Part | State |
| --- | --- |
| `backend/` Spring Boot API: estimates, consultations, mail, PDF, staff login, leads view | **Done and tested** (see the test list in the README) |
| `frontend/` static site in HTML, CSS and browser JavaScript | **Not started yet.** The public site still lives in `src/` (Next.js) and is unchanged |
| Studio OS admin (employees, projects, tasks, finance, documents, CMS) | **Not migrated.** Agreed scope for this phase: public features and a leads/admin login only |

Until the front end is migrated, the Next.js site remains the live site and the Java API runs beside it, unused. Nothing
in `src/` was changed by the back-end work.

## Back end

```
browser (static site)  --HTTPS-->  Spring Boot API  -->  PostgreSQL
                                        |
                                        +--> SMTP provider (email, async, retried)
```

Java 25 LTS, Spring Boot 4.1.2, Spring MVC, Spring Security 7, Spring Data JPA (Hibernate 7), Flyway, PostgreSQL,
OpenPDF 3, Jakarta Mail through Spring. Maven with the Maven Wrapper. No PHP or Node.js is used to build or run it.

Packages under `com.singledotstudio`:

| Package | Responsibility |
| --- | --- |
| `config` | Properties, Spring Security, session cookie, async mail pool, request-size and Origin filters, production start-up checks |
| `common` | The shared JSON error shape, exception handling, small text helpers |
| `ratelimit` | PostgreSQL-backed request limiter shared by all instances |
| `estimates` | Price book, server-side calculator, persistence, PDF, public endpoint |
| `consultations` | Consultation requests: validation, de-duplication, persistence, public endpoint |
| `notifications` | Email templates, after-commit async sending, delivery log, retries |
| `security` | Staff accounts, login, lockout, session revocation, first-admin bootstrap |
| `admin` | Read-only lead views and the quotation PDF download for signed-in staff |

### Request flow: quotation

1. The form posts the customer's **choices** (property type, size, rooms, package, add-ons) and contact details.
2. Bean Validation checks shape and length; business rules then check every option against the price book.
3. `EstimateCalculator` works out every figure on the server. The response contains a reference only, never a price.
4. The estimate and its line items are saved in one transaction; a `LeadCreatedEvent` is published.
5. After the commit, a small thread pool builds the PDF from the stored data and sends two emails (customer and studio).
   Each send is logged in `notification_deliveries`. A failure marks the row `FAILED` and a scheduler retries it (up to
   3 attempts, 10 minutes apart). The estimate is never lost because of mail.

### Price book

`backend/src/main/resources/pricing.json` is the single source of prices. **Every number in it is a placeholder** until
the studio confirms its rates (the file says so). The Java engine was checked against the previous TypeScript engine for
seven representative inputs (home, villa, office, showroom, and three "best fit" cases); all figures match exactly.

### Database

Flyway migrations in `backend/src/main/resources/db/migration`:

* `V1__core_schema.sql`: `estimates`, `estimate_items`, `consultations`, `notification_deliveries`,
  `rate_limit_counters`, `admin_users`, with foreign keys, check constraints and indexes.
* `V2__spring_session.sql`: the staff session store.

Hibernate runs with `ddl-auto: validate`, so the application refuses to start if the schema and the code disagree.
`flyway.clean-disabled` is `true`. Migrations are additive.

## Front end (planned)

Static HTML pages, CSS split into tokens, global, layout, typography, components, pages, responsive and animation files,
and small browser-native JavaScript modules, all under `frontend/`. It will talk to the API over HTTPS with `fetch`.
Hosting is a static host or CDN; no Node.js process is needed.
