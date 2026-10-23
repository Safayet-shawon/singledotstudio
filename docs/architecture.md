# Architecture

Single Dot Studio is moving from a Next.js application (Node.js) to a Java back end plus a plain HTML/CSS/JavaScript front end.
This document describes the target and the exact state of the migration.

## Status

| Part | State |
| --- | --- |
| `backend/`: Spring Boot API with estimates, consultations, mail, PDF, staff login, leads view | **Done and tested** |
| `frontend/`: static site (25 pages), split CSS, ES-module JavaScript, calculator, forms, staff page | **Done and tested** |
| Studio OS admin (employees, projects, tasks, finance, documents) | **Not migrated** (agreed scope: public features and a leads login first) |
| CMS and admin before/after pair manager | **Not migrated.** The static site shows labelled sample before/after photos |
| Old Next.js app (`src/`, `config/`, `public/`, `package.json`) | **Still in the repository and still the live site.** Remove it only after cutover (see below) |

The old app was left untouched so the live site keeps working. The new site and API are verified locally but are **not deployed**.

## Runtime

```
browser --> static host/CDN (frontend/) --fetch, HTTPS--> Spring Boot API (backend/) --> PostgreSQL
                                                              |
                                                              +--> SMTP provider
```

## Back end

Java 25 LTS, Spring Boot 4.1.2, Spring MVC, Spring Security 7, Spring Data JPA (Hibernate 7), Flyway, PostgreSQL, OpenPDF 3,
Jakarta Mail through Spring. Maven with the Maven Wrapper. No PHP or Node.js.

| Package (`com.singledotstudio`) | Responsibility |
| --- | --- |
| `config` | Properties, Spring Security, session cookie, async mail pool, request-size and Origin filters, production start-up checks |
| `common` | The shared JSON error shape, exception handling, text helpers |
| `ratelimit` | PostgreSQL-backed request limiter shared by all instances |
| `estimates` | Price book, server-side calculator, persistence, PDF, public endpoint |
| `consultations` | Consultation requests: validation, de-duplication, persistence, public endpoint |
| `notifications` | Email templates, after-commit async sending, delivery log, retries |
| `security` | Staff accounts, login, lockout, session revocation, first-admin bootstrap |
| `admin` | Read-only lead views and the quotation PDF download for signed-in staff |

### Quotation flow

1. The calculator sends the customer's **choices** and contact details.
2. Bean Validation checks shape and length; business rules check every option against the price book.
3. `EstimateCalculator` works out every figure on the server. The response carries a reference only, never a price.
4. The estimate and its lines are saved in one transaction; a `LeadCreatedEvent` is published.
5. After commit, a small pool builds the PDF from stored data and sends two emails. Each send is logged in
   `notification_deliveries`; failures are retried (3 attempts, 10 minutes apart). A mail outage never loses an estimate.

### Price book

`backend/src/main/resources/pricing.json` is the single source of prices. **Every number is a placeholder** until the studio confirms
its rates. The Java engine reproduces the previous TypeScript engine exactly on seven representative inputs.

### Database

Flyway migrations in `backend/src/main/resources/db/migration`: `V1__core_schema.sql` (estimates, estimate_items, consultations,
notification_deliveries, rate_limit_counters, admin_users, with constraints and indexes) and `V2__spring_session.sql`. Hibernate runs
with `ddl-auto: validate`; Flyway cannot clean the database. Migrations are additive.

## Front end

Static HTML pages written for content first: the main text of every public page is in the HTML, with no script needed to read it.
JavaScript adds the splash, scroll reveal, hero carousel, services switcher, project gallery, before/after slider, calculator and
form submission. CSS lives in 29 small files (tokens, global, typography, layout, components, pages, animations, responsive) joined
into `bundle.css` by `frontend/tools/bundle-css.sh`. See `frontend/README.md`.

## Cutover from the old site

1. Deploy the API and the static site (`docs/deployment.md`); set `apiBase` in `frontend/assets/js/config.js`.
2. Point the domain at the static site; confirm both forms and the calculator against the live API; confirm emails arrive.
3. Only then remove the legacy app from the repository: `git rm -r src config public package.json package-lock.json next.config.ts tsconfig.json test scripts data skills-lock.json AGENTS.md`
   and the Vercel project. After that, no Node.js file remains in the repository.
4. Anything from the old Studio OS admin you still need (projects, finance, documents, CMS, before/after manager) has to be
   rebuilt in Java before step 3, or kept running separately.
