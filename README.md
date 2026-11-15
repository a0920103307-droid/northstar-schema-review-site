# Northstar Schema Review

File-only PostgreSQL migration preflight for small SaaS teams preparing schema changes for production.

This repository hosts the public static overview, technical guides, browser-only scanner, and synthetic review samples for **Northstar Schema Labs** (working name).

## Live site

- [Service overview](https://a0920103307-droid.github.io/northstar-schema-review-site/)
- [Technical guides](https://a0920103307-droid.github.io/northstar-schema-review-site/writing.html)
- [Free browser-only PostgreSQL preflight](https://a0920103307-droid.github.io/northstar-schema-review-site/preflight.html)
- [Synthetic migration report](https://a0920103307-droid.github.io/northstar-schema-review-site/sample-report.html)
- [Synthetic Supabase SECURITY DEFINER and RLS review](https://a0920103307-droid.github.io/northstar-schema-review-site/supabase-rls-sample-report.html)
- [Upwork service](https://www.upwork.com/services/product/2121960555841830491)

## What the review covers

- destructive DDL and likely data-loss paths;
- locking and table-rewrite risk from migration text;
- transaction and migration-runner incompatibilities;
- old/new application compatibility and expand/contract sequencing;
- rollback questions and evidence gaps;
- Supabase RLS, grants, security-definer functions, and deny-path questions when explicitly scoped.

The paid service accepts redacted SQL or schema text and returns a prioritized Markdown report with file and line references, risk reasoning, verification questions, and one written clarification round.

Public service packages:

- **USD 49 Basic** — up to 20 SQL files or 1,000 lines, two-day delivery, one revision.
- **USD 149 Extended** — USD 49 Basic plus a USD 100 add-on for up to 75 SQL files or 5,000 lines and expanded rollout detail.

Payment, project terms, and delivery remain on Upwork.

## Safety boundaries

This service is intentionally narrow:

- no production database connection;
- no credentials or connection strings;
- no customer rows, backups, or production data;
- no migration execution or production changes;
- no zero-downtime or zero-data-loss guarantee;
- no legal, compliance, penetration-test, or security certification.

The browser scanner runs locally and does not upload SQL. Its automated output is a set of heuristic signals for a qualified engineer to verify, not an engineering approval.

## Synthetic samples

- [PostgreSQL migration preflight report](https://a0920103307-droid.github.io/northstar-schema-review-site/sample-report.html)
- [Supabase RLS and SECURITY DEFINER review](https://a0920103307-droid.github.io/northstar-schema-review-site/supabase-rls-sample-report.html)

No client case, customer data, production verification, certification, or revenue is represented by these samples.

## Technical guides

- [PostgreSQL Migration Safety Checklist Before Production](https://a0920103307-droid.github.io/northstar-schema-review-site/postgresql-migration-safety-checklist.html)
- [Supabase RLS Review Without Production Access](https://a0920103307-droid.github.io/northstar-schema-review-site/supabase-rls-migration-review-without-production-access.html)
- [Prisma-Generated PostgreSQL Migration Risks](https://a0920103307-droid.github.io/northstar-schema-review-site/prisma-postgresql-migration-risks.html)

## Local preview

The site is static HTML, CSS, and browser-only JavaScript. From this directory, run any static file server, for example:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000/`.

There is no analytics, cookie, form, upload endpoint, payment flow, or external runtime dependency.

## Repository layout

- `index.html` — service overview and packages
- `preflight.html` / `scanner.js` / `preflight.js` — browser-only scanner
- `writing.html` — technical guide index
- `*.html` — static guides and synthetic samples
- `article.css`, `styles.css`, `preflight.css` — presentation
- `sitemap.xml`, `robots.txt` — crawler discovery
- `llms.txt` — concise service and canonical-page context for AI crawlers
- `73b57f7a9173411f9f24a98a933dc96f.txt` — IndexNow verification key

## Contact

Public pilot inquiries: [A0920103307@gmail.com](mailto:A0920103307@gmail.com)

Send a short, redacted scope first. Do not send credentials, customer rows, production dumps, backups, or a database connection.
