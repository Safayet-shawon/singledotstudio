# Database map (Next.js site)

How the planned tables (hand-drawn diagram) map to the real Postgres schema in `src/server/schema.ts`. The schema is applied
automatically and safely (idempotent) the first time the database is used; the current version is 6.

| Planned table | Where it lives | Notes |
| --- | --- | --- |
| Quotation (ID, name, email, phone, address, carpet area, configuration) | `quotations` | One row per website quotation request: reference, contact, property type, `carpet_sqft`, `bhk`, package, tier, `configuration` (JSON: add-ons, size label), low and high estimate. Written when the request arrives (best effort; the lead record and emails remain the source of truth) |
| Spaces (quotation ID, name, count, design name, design specification) | `quotation_spaces` | One row per selected space with its count. `design_name` and `design_spec` are ready for the studio to fill in later |
| Packages (name, specification, variables) | `config/pricing.json` | Kept as one tested file used by the price engine, the calculator and the PDF. A second copy in the database would risk two prices for one package |
| Users (name, email, password, role and permission) | `users` | Scrypt password hash. Access is a list of individually granted permissions (`perms`), not fixed roles; presets only pre-fill the list |
| Designs, Images | Website portfolio in `cms` (published and draft) and `media` | Managed in the admin under Website, Portfolio and Images, with draft, preview and publish |
| Completed projects (location, date, client, comments, images, space type) | Website portfolio in `cms` and `media`; internal records in `projects` with `status = completed` | The public gallery entries are content, so they are edited in the CMS with versions and rollback |
| Project (name, description, location, dates, status, assigned staff) | `projects`, `project_members`, `milestones`, `tasks` | |
| Updates (project ID, ...) | `project_updates` | Title, details, optional progress percent, author and time. Posted from the project page by anyone with `project.updates` |
| Employee (user ID, designation, salary, payroll, leave) | `users` (position, department, employee code), `salary_records` (payroll), `leave_requests` (leave) | |
| Attendance (fingerprint ID, ...) | `attendance` and `users.fingerprint_id` | One row per person per day (Dhaka date): check-in, check-out and source (`web`, `fingerprint`, `manual`) |

## Attendance

* Staff check in and out on the **Attendance** page; HR can correct a day and map each person to their fingerprint ID.
* A fingerprint device (or a small bridge script next to it) sends one request per scan:

```
POST /api/attendance/punch
Authorization: Bearer <ATTENDANCE_DEVICE_KEY>
Content-Type: application/json

{ "fid": "12", "at": "2026-10-24T09:02:00+06:00" }
```

* The first scan of the day is the check-in; later scans move the check-out forward. A repeat scan within one minute is ignored.
* The route is **off** until `ATTENDANCE_DEVICE_KEY` (at least 24 random characters) is set in Vercel. Times older than two days or in the future are
  replaced by the server time. Requests are rate limited and the key is compared in constant time.

## Leave

Anyone can request leave (casual, sick, annual, unpaid). People with `hr.leave_approve` get a notification, approve or reject, and the
requester is notified. Nobody can decide their own request (the owner excepted).

## Permissions added

`project.updates`, `hr.attendance_view`, `hr.attendance_edit`, `hr.leave_approve`. Grant them per person in Employees, Permissions.
