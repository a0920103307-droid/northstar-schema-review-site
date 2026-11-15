# PostgreSQL Migration Review — Scope Request Template

Copy this template into your email or Upwork message. Do not include credentials, connection strings, customer rows, backups, production dumps, or production access.

## 1. Business context

- Product or feature:
- PostgreSQL version and provider:
- Migration runner or deployment tool:
- Target release date and timezone:
- Current stage: planning / staging / pre-production

## 2. Migration scope

- Number of SQL files:
- Approximate total lines:
- Affected tables or schemas:
- Destructive operations: DROP / TRUNCATE / type change / rename / none
- Existing-data backfill required: yes / no / unknown
- Largest affected table and approximate row count:
- Indexes, constraints, or enum changes:

## 3. Deployment and compatibility

- Can old and new application versions run at the same time?
- Is the migration expand/contract sequenced?
- Maintenance window or online-change requirement:
- Transaction behavior of the migration runner:
- Rollback method: reverse migration / restore / forward fix / undecided
- Backup and restore evidence:
- Staging rehearsal completed:

## 4. Requested output

- Prioritized Markdown findings report
- File and line references
- Destructive DDL and possible data-loss review
- Lock and table-rewrite questions
- Compatibility and sequencing questions
- Rollback concerns and evidence gaps
- One written clarification round

## 5. Confidentiality confirmation

State one of the following:

- The attached migration text is synthetic.
- The attached migration text is redacted and contains no credentials, customer rows, or production data.

Do not include:

- passwords, API keys, tokens, or connection strings;
- customer or employee records;
- database dumps, backups, screenshots containing private data;
- production access requests.

## 6. Decision requested

- Desired package: Basic / Extended / not sure
- Needed by:
- Questions for the reviewer:
