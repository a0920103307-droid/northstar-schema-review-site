(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.NorthstarScanner = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const SEVERITY_RANK = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };
  const SEVERITY_WEIGHT = { critical: 40, high: 20, medium: 8, low: 2, info: 0 };

  function readDollarTag(text, index) {
    if (text[index] !== "$") return null;
    const match = text.slice(index).match(/^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/);
    return match ? match[0] : null;
  }

  function stripSqlComments(sql) {
    const output = [];
    let i = 0, inSingle = false, inDouble = false, dollarTag = null;
    while (i < sql.length) {
      const char = sql[i], tail = sql.slice(i);
      if (dollarTag) {
        if (tail.startsWith(dollarTag)) { output.push(dollarTag); i += dollarTag.length; dollarTag = null; }
        else { output.push(char); i += 1; }
        continue;
      }
      if (inSingle) {
        output.push(char);
        if (char === "'" && sql[i + 1] === "'") { output.push("'"); i += 2; continue; }
        if (char === "'") inSingle = false;
        i += 1; continue;
      }
      if (inDouble) {
        output.push(char);
        if (char === '"' && sql[i + 1] === '"') { output.push('"'); i += 2; continue; }
        if (char === '"') inDouble = false;
        i += 1; continue;
      }
      if (char === "'") { inSingle = true; output.push(char); i += 1; continue; }
      if (char === '"') { inDouble = true; output.push(char); i += 1; continue; }
      if (char === "$") {
        const tag = readDollarTag(sql, i);
        if (tag) { dollarTag = tag; output.push(tag); i += tag.length; continue; }
      }
      if (tail.startsWith("--")) {
        while (i < sql.length && sql[i] !== "\r" && sql[i] !== "\n") { output.push(" "); i += 1; }
        continue;
      }
      if (tail.startsWith("/*")) {
        let depth = 1; output.push(" ", " "); i += 2;
        while (i < sql.length && depth > 0) {
          if (sql.startsWith("/*", i)) { depth += 1; output.push(" ", " "); i += 2; }
          else if (sql.startsWith("*/", i)) { depth -= 1; output.push(" ", " "); i += 2; }
          else { output.push(sql[i] === "\n" || sql[i] === "\r" ? sql[i] : " "); i += 1; }
        }
        continue;
      }
      output.push(char); i += 1;
    }
    return output.join("");
  }

  function splitSqlStatements(sql) {
    const clean = stripSqlComments(sql);
    const statements = [];
    let buffer = [], i = 0, inSingle = false, inDouble = false, dollarTag = null;
    function pushStatement(endIndex) {
      const candidate = buffer.join("");
      if (!candidate.trim()) return;
      const leading = candidate.length - candidate.trimStart().length;
      const startIndex = endIndex - candidate.length + leading;
      const line = clean.slice(0, startIndex).split("\n").length;
      statements.push({ text: candidate.trim(), line });
      buffer = [];
    }
    while (i < clean.length) {
      const char = clean[i], tail = clean.slice(i);
      if (dollarTag) {
        if (tail.startsWith(dollarTag)) { buffer.push(dollarTag); i += dollarTag.length; dollarTag = null; }
        else { buffer.push(char); i += 1; }
        continue;
      }
      if (inSingle) {
        buffer.push(char);
        if (char === "'" && clean[i + 1] === "'") { buffer.push("'"); i += 2; continue; }
        if (char === "'") inSingle = false;
        i += 1; continue;
      }
      if (inDouble) {
        buffer.push(char);
        if (char === '"' && clean[i + 1] === '"') { buffer.push('"'); i += 2; continue; }
        if (char === '"') inDouble = false;
        i += 1; continue;
      }
      if (char === "'") inSingle = true;
      else if (char === '"') inDouble = true;
      else if (char === "$") {
        const tag = readDollarTag(clean, i);
        if (tag) { dollarTag = tag; buffer.push(tag); i += tag.length; continue; }
      } else if (char === ";") { pushStatement(i); i += 1; continue; }
      buffer.push(char); i += 1;
    }
    pushStatement(clean.length);
    return statements;
  }

  function stateAfter(text) {
    const upper = text.trim().toUpperCase();
    if (/^(BEGIN|START\s+TRANSACTION)\b/.test(upper)) return "begin";
    if (/^(COMMIT|END|ROLLBACK)\b/.test(upper)) return "end";
    return null;
  }
  function evidence(text, limit) {
    const compact = text.replace(/\s+/g, " ").trim();
    return compact.length <= limit ? compact : compact.slice(0, limit - 3) + "...";
  }
  function add(findings, rule) {
    findings.push({ ruleId: rule.ruleId, title: rule.title, severity: rule.severity, category: rule.category, line: rule.statement.line, evidence: evidence(rule.statement.text, 240), why: rule.why, recommendation: rule.recommendation, confidence: rule.confidence || "high" });
  }

  function scanStatement(statement, findings) {
    const compact = statement.text.toUpperCase().replace(/\s+/g, " ").trim();
    const common = { statement };
    if (/^DROP\s+TABLE\b/.test(compact)) add(findings, { ...common, ruleId: "MIG001", title: "Table drop can cause irreversible data loss", severity: "critical", category: "data-loss", why: "Dropping a table removes its rows and may break code still running the previous application version.", recommendation: "Use a planned deprecation window, verified backup/restore, application dependency search, and a separate final removal after no reads or writes remain." });
    if (/^DROP\s+SCHEMA\b/.test(compact)) add(findings, { ...common, ruleId: "MIG002", title: "Schema drop can remove many objects at once", severity: "critical", category: "data-loss", why: "A schema drop can remove tables, functions, types, and dependent objects with broad impact.", recommendation: "Inventory all dependencies, confirm backup/restore, deploy application changes first, and remove the schema only after a monitored deprecation period." });
    if (compact.includes("ALTER TABLE") && /\bDROP\s+COLUMN\b/.test(compact)) add(findings, { ...common, ruleId: "MIG003", title: "Column drop can cause irreversible data loss", severity: "critical", category: "data-loss", why: "The column data disappears immediately and old application instances may still select it.", recommendation: "Stop reads and writes first, retain the column through at least one compatibility release, verify backups, then perform the final drop separately." });
    if (/^TRUNCATE\b/.test(compact)) add(findings, { ...common, ruleId: "MIG004", title: "Truncate removes rows", severity: "critical", category: "data-loss", why: "TRUNCATE removes table contents and can take strong locks; it is difficult to reverse without a verified recovery path.", recommendation: "Treat as a destructive data operation with explicit approval, backup/restore rehearsal, dependency checks, and a staged maintenance procedure." });
    if (/^UPDATE\b/.test(compact) && !/\bWHERE\b/.test(compact)) add(findings, { ...common, ruleId: "MIG005", title: "UPDATE without WHERE can rewrite every row", severity: "critical", category: "data-loss", why: "An unqualified UPDATE may rewrite the entire table, lock or bloat storage, and change data unintentionally.", recommendation: "Add an explicit predicate, validate the affected row count in staging, batch the backfill, and provide a rollback or reconciliation query." });
    if (/^DELETE\b/.test(compact) && !/\bWHERE\b/.test(compact)) add(findings, { ...common, ruleId: "MIG006", title: "DELETE without WHERE can remove every row", severity: "critical", category: "data-loss", why: "An unqualified DELETE may remove the full table contents and is often irreversible without a verified recovery path.", recommendation: "Add an explicit predicate, require backup/restore evidence, and execute destructive cleanup separately from schema deployment." });
    if (compact.includes("ALTER TABLE") && /\bALTER\s+COLUMN\b[^;]*\bTYPE\b/.test(compact)) add(findings, { ...common, ruleId: "MIG007", title: "Column type change may rewrite the table and break compatibility", severity: "high", category: "lock-rewrite", confidence: "medium", why: "Type conversion can require a table rewrite, hold a strong lock, and change API or application semantics.", recommendation: "Use an expand/contract plan with a new column, batched backfill, dual-read/dual-write compatibility, validation, and a later cutover." });
    if (compact.includes("ALTER TABLE") && /\bRENAME\b/.test(compact)) add(findings, { ...common, ruleId: "MIG008", title: "Rename can break rolling deployments", severity: "high", category: "compatibility", confidence: "medium", why: "Old application instances deployed during the migration may still reference the previous table or column name.", recommendation: "Prefer add-copy-compatible cutover, or explicitly coordinate a stop-the-world deployment and verify every consumer before renaming." });
    if (compact.includes("ALTER TABLE") && /\bADD\s+(?:COLUMN\s+)?[^;]*\bNOT\s+NULL\b/.test(compact) && !/\bDEFAULT\b/.test(compact) && !/\bGENERATED\b/.test(compact)) add(findings, { ...common, ruleId: "MIG009", title: "Adding NOT NULL without a value or default may fail on existing rows", severity: "high", category: "compatibility", why: "Existing rows need a value before the constraint can be satisfied; the statement may fail or require an unexpected backfill.", recommendation: "Add the column nullable, backfill in validated batches, then add a separately verified constraint after checking the data." });
    if (compact.includes("ALTER TABLE") && /\bSET\s+NOT\s+NULL\b/.test(compact)) add(findings, { ...common, ruleId: "MIG010", title: "SET NOT NULL can scan the table and take a strong lock", severity: "high", category: "lock-rewrite", confidence: "medium", why: "The database must verify existing rows while the table may be locked; unexpected NULLs can fail the deployment.", recommendation: "First add a validated NOT VALID check, backfill safely, then set NOT NULL using the appropriate PostgreSQL-safe sequence." });
    if (compact.includes("ALTER TABLE") && compact.includes("ADD CONSTRAINT") && compact.includes("FOREIGN KEY") && !compact.includes("NOT VALID")) add(findings, { ...common, ruleId: "MIG011", title: "Foreign key validation can lock referenced tables", severity: "high", category: "lock-rewrite", confidence: "medium", why: "Adding a fully validated foreign key may scan data and acquire locks that affect writes.", recommendation: "Add the foreign key with NOT VALID, remove invalid or orphaned data, then validate the constraint in a separate controlled migration." });
    if (compact.includes("ALTER TABLE") && compact.includes("ADD CONSTRAINT") && compact.includes("CHECK") && !compact.includes("NOT VALID")) add(findings, { ...common, ruleId: "MIG012", title: "Check constraint validation can scan the table", severity: "medium", category: "lock-rewrite", confidence: "medium", why: "Validating an existing CHECK constraint scans current rows and can fail on legacy data.", recommendation: "Add the CHECK constraint with NOT VALID, clean data, then VALIDATE CONSTRAINT separately while monitoring locks." });
    if (/\bCREATE\s+(?:UNIQUE\s+)?INDEX\b/.test(compact) && !compact.includes("CONCURRENTLY")) add(findings, { ...common, ruleId: "MIG013", title: "Non-concurrent index creation can block writes", severity: "medium", category: "lock-rewrite", confidence: "medium", why: "A normal index build can block writes for the duration of the build on a busy table.", recommendation: "For production tables, build with CREATE INDEX CONCURRENTLY outside a transaction and monitor invalid-index failure states." });
    if (/^DROP\s+INDEX\b/.test(compact) && !compact.includes("CONCURRENTLY")) add(findings, { ...common, ruleId: "MIG014", title: "Non-concurrent index drop can block queries and writes", severity: "medium", category: "lock-rewrite", confidence: "medium", why: "Dropping an index normally can take a strong lock and create a plan regression after removal.", recommendation: "Use DROP INDEX CONCURRENTLY outside a transaction after confirming the index is redundant and monitoring query plans." });
    if (/\bCREATE\s+(?:UNIQUE\s+)?INDEX\s+CONCURRENTLY\b/.test(compact) && statement.inTransaction) add(findings, { ...common, ruleId: "MIG015", title: "CREATE INDEX CONCURRENTLY cannot run inside a transaction block", severity: "high", category: "transaction", why: "PostgreSQL rejects concurrent index creation inside an explicit transaction; migration runners often wrap files automatically.", recommendation: "Run this statement outside any transaction wrapper, use a dedicated non-transactional migration, and verify the index is valid afterward." });
    if (/\bALTER\s+TYPE\b[^;]*\bADD\s+VALUE\b/.test(compact) && statement.inTransaction) add(findings, { ...common, ruleId: "MIG016", title: "Enum value use may be unavailable in the same transaction", severity: "medium", category: "transaction", confidence: "medium", why: "The new enum value may not be usable until the transaction commits, depending on PostgreSQL behavior and deployment sequencing.", recommendation: "Separate the enum addition from code or data that uses the new value, or verify the exact supported PostgreSQL version and transaction boundaries." });
    if (/^(VACUUM\s+FULL|CLUSTER)\b/.test(compact)) add(findings, { ...common, ruleId: "MIG017", title: "Vacuum full or cluster can rewrite and exclusively lock a table", severity: "high", category: "lock-rewrite", why: "These maintenance operations can double storage, hold strong locks, and be unsuitable for an online migration window.", recommendation: "Schedule as a separately approved maintenance operation with storage, lock, timeout, and rollback planning." });
    if (/^REINDEX\b/.test(compact) && !compact.includes("CONCURRENTLY")) add(findings, { ...common, ruleId: "MIG018", title: "Non-concurrent reindex can block access", severity: "medium", category: "lock-rewrite", confidence: "medium", why: "A normal REINDEX can lock the index or table while it rebuilds.", recommendation: "Use REINDEX CONCURRENTLY where supported, or schedule a controlled maintenance window with verified capacity." });
    if (compact.includes("ALTER TABLE") && /\bDROP\s+CONSTRAINT\b/.test(compact)) add(findings, { ...common, ruleId: "MIG019", title: "Constraint removal can expose invalid data", severity: "high", category: "data-integrity", confidence: "medium", why: "Removing a constraint may allow invalid or duplicate data and can be intentionally required during expand/contract work.", recommendation: "Document why the constraint is removed, verify application-side safeguards, and defer the final removal until all old writers are retired." });
    if (compact.includes("ALTER TABLE") && /\bADD\s+(?:COLUMN\s+)?[^;]*\bDEFAULT\b/.test(compact) && /\bDEFAULT\s+(?:GEN_RANDOM_UUID|UUID_GENERATE_V4|RANDOM|NOW|CLOCK_TIMESTAMP|NEXTVAL)\s*\(/.test(compact)) add(findings, { ...common, ruleId: "MIG020", title: "Volatile default on a new column may rewrite the table", severity: "medium", category: "lock-rewrite", confidence: "medium", why: "Some PostgreSQL versions must materialize a volatile default for every existing row, causing a rewrite and long lock.", recommendation: "Verify the PostgreSQL version and table size; otherwise add the column without the volatile default, backfill safely, then apply the default." });
  }

  function scanSql(sql) {
    const findings = [];
    let inTransaction = false;
    for (const statement of splitSqlStatements(sql)) {
      scanStatement({ ...statement, inTransaction }, findings);
      const transition = stateAfter(statement.text);
      if (transition === "begin") inTransaction = true;
      if (transition === "end") inTransaction = false;
    }
    return findings.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || a.line - b.line || a.ruleId.localeCompare(b.ruleId));
  }

  function summarize(findings) {
    const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    let riskScore = 0;
    for (const finding of findings) {
      counts[finding.severity] += 1;
      riskScore += SEVERITY_WEIGHT[finding.severity] || 0;
    }
    const status = counts.critical ? "BLOCK" : counts.high ? "REVIEW" : counts.medium ? "CAUTION" : "NO_AUTOMATED_FINDINGS";
    return { counts, riskScore: Math.min(100, riskScore), status };
  }

  return { stripSqlComments, splitSqlStatements, scanSql, summarize };
});
