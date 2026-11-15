"use strict";

(function () {
  const input = document.getElementById("sql-input");
  const scanButton = document.getElementById("scan-button");
  const sampleButton = document.getElementById("sample-button");
  const clearButton = document.getElementById("clear-button");
  const copyButton = document.getElementById("copy-button");
  const inputError = document.getElementById("input-error");
  const emptyState = document.getElementById("empty-state");
  const results = document.getElementById("results");
  const status = document.getElementById("result-status");
  const countCritical = document.getElementById("count-critical");
  const countHigh = document.getElementById("count-high");
  const countMedium = document.getElementById("count-medium");
  const countTotal = document.getElementById("count-total");
  const findingsList = document.getElementById("findings-list");
  const summaryText = document.getElementById("summary-text");

  const sampleSql = `-- Synthetic example only. Do not paste customer data.\nDROP TABLE legacy_orders;\n\nALTER TABLE customers DROP COLUMN old_phone;\n\nALTER TABLE orders ADD COLUMN tenant_id uuid NOT NULL;\n\nALTER TABLE orders ALTER COLUMN status TYPE varchar(32);\n\nCREATE INDEX idx_orders_status ON orders(status);\n\nALTER TABLE orders DROP CONSTRAINT fk_orders_customer;\n\nBEGIN;\nCREATE INDEX CONCURRENTLY idx_orders_created_at ON orders(created_at);\nCOMMIT;`;

  let currentFindings = [];
  let currentSummary = null;

  function statusLabel(value) {
    return ({
      BLOCK: "Critical patterns detected",
      REVIEW: "High-priority patterns detected",
      CAUTION: "Medium-priority patterns detected",
      NO_AUTOMATED_FINDINGS: "No automated patterns matched"
    })[value] || value;
  }

  function explainStatus(value) {
    return ({
      BLOCK: "The scanner matched a critical pattern. Verify it with a qualified engineer and staging evidence.",
      REVIEW: "The scanner matched a high-severity pattern. This is not a release approval.",
      CAUTION: "The scanner matched medium-severity patterns. This is not a release approval.",
      NO_AUTOMATED_FINDINGS: "No pattern from this small rule set matched. That does not mean the migration is safe."
    })[value];
  }

  function makeText(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = text;
    return node;
  }

  function render(findings, summary) {
    currentFindings = findings;
    currentSummary = summary;
    emptyState.hidden = true;
    results.hidden = false;
    status.textContent = statusLabel(summary.status);
    status.dataset.status = summary.status;
    countCritical.textContent = summary.counts.critical;
    countHigh.textContent = summary.counts.high;
    countMedium.textContent = summary.counts.medium;
    countTotal.textContent = findings.length;
    summaryText.textContent = explainStatus(summary.status);
    findingsList.replaceChildren();

    if (!findings.length) {
      const empty = document.createElement("div");
      empty.className = "tool-empty-findings";
      empty.append(
        makeText("strong", "", "No automated findings matched."),
        makeText("p", "", "Review transaction behavior, table size, application compatibility, backups, and staging results manually.")
      );
      findingsList.append(empty);
    } else {
      findings.forEach((finding, index) => {
        const article = document.createElement("article");
        article.className = `finding ${finding.severity}`;
        const meta = makeText("p", "finding-meta", `${String(index + 1).padStart(2, "0")} · ${finding.severity.toUpperCase()} · ${finding.ruleId} · line ${finding.line}`);
        article.append(meta, makeText("h3", "", finding.title), makeText("code", "finding-evidence", finding.evidence));
        const why = document.createElement("p");
        why.append(makeText("strong", "", "Why it matters: "), document.createTextNode(finding.why));
        article.append(why);
        const recommendation = document.createElement("p");
        recommendation.append(makeText("strong", "", "Review direction: "), document.createTextNode(finding.recommendation));
        article.append(recommendation);
        findingsList.append(article);
      });
    }
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function scan() {
    inputError.textContent = "";
    const sql = input.value.trim();
    if (!sql) {
      inputError.textContent = "Paste at least one PostgreSQL statement before scanning.";
      input.focus();
      return;
    }
    if (sql.length > 200000) {
      inputError.textContent = "Input exceeds the 200,000 character browser limit. Scan a smaller migration set.";
      input.focus();
      return;
    }
    const findings = window.NorthstarScanner.scanSql(sql);
    render(findings, window.NorthstarScanner.summarize(findings));
  }

  function reportText() {
    if (!currentSummary) return "";
    const lines = [
      "Northstar Schema Review - browser preflight",
      `Heuristic status (not release approval): ${statusLabel(currentSummary.status)}`,
      `Findings: ${currentFindings.length} (critical ${currentSummary.counts.critical}, high ${currentSummary.counts.high}, medium ${currentSummary.counts.medium})`,
      "",
      "This is a static browser scan, not a safety guarantee.",
      ""
    ];
    currentFindings.forEach((finding, index) => {
      lines.push(`${index + 1}. [${finding.severity.toUpperCase()}] ${finding.title}`);
      lines.push(`   ${finding.ruleId} | line ${finding.line} | ${finding.evidence}`);
      lines.push(`   Why: ${finding.why}`);
      lines.push(`   Direction: ${finding.recommendation}`);
      lines.push("");
    });
    return lines.join("\n");
  }

  scanButton.addEventListener("click", scan);
  sampleButton.addEventListener("click", () => {
    input.value = sampleSql;
    inputError.textContent = "";
    scan();
  });
  clearButton.addEventListener("click", () => {
    input.value = "";
    currentFindings = [];
    currentSummary = null;
    inputError.textContent = "";
    results.hidden = true;
    emptyState.hidden = false;
    input.focus();
  });
  copyButton.addEventListener("click", async () => {
    const text = reportText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      copyButton.textContent = "Copied locally";
      window.setTimeout(() => { copyButton.textContent = "Copy text report"; }, 1800);
    } catch (_error) {
      copyButton.textContent = "Select report text manually";
    }
  });
  input.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") scan();
  });
})();
