"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const frontendRoot = process.cwd();
const baselinePath = path.join(frontendRoot, "eslint-baseline.json");
const allowedCategories = new Set([
  "funcional o potencialmente funcional",
  "seguridad",
  "tipado",
  "deuda histórica",
  "código obsoleto",
  "editorial/estilo",
  "tooling/configuración",
]);

function fail(message) {
  console.error(`[lint-baseline] ${message}`);
  process.exit(1);
}

function normalizeMessage(message) {
  return String(message || "")
    .split(/\n\s*\n/, 1)[0]
    .replace(/\s+/g, " ")
    .trim();
}

function findingKey(finding) {
  return JSON.stringify([
    finding.file,
    finding.severity,
    finding.ruleId,
    finding.message,
  ]);
}

function sortFindings(left, right) {
  return findingKey(left).localeCompare(findingKey(right));
}

function runEslint() {
  const eslintCli = path.join(
    frontendRoot,
    "node_modules",
    "eslint",
    "bin",
    "eslint.js"
  );
  const result = spawnSync(process.execPath, [eslintCli, ".", "--format", "json"], {
    cwd: frontendRoot,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });

  if (result.error) fail(`no se pudo ejecutar ESLint: ${result.error.message}`);
  if (result.status !== 0 && result.status !== 1) {
    fail(`ESLint terminó con exit ${result.status}: ${result.stderr.trim()}`);
  }

  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch (error) {
    fail(`ESLint no produjo JSON válido: ${error.message}`);
  }

  const grouped = new Map();
  for (const fileResult of report) {
    const relative = path.relative(frontendRoot, fileResult.filePath);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
      fail(`ESLint produjo una ruta fuera del frontend: ${fileResult.filePath}`);
    }

    const file = relative.split(path.sep).join("/");
    for (const message of fileResult.messages) {
      const finding = {
        file,
        severity: message.severity === 2 ? "error" : "warning",
        ruleId: message.ruleId || "eslint/fatal",
        message: normalizeMessage(message.message),
        count: 1,
      };
      const key = findingKey(finding);
      const current = grouped.get(key);
      if (current) current.count += 1;
      else grouped.set(key, finding);
    }
  }

  return [...grouped.values()].sort(sortFindings);
}

function readBaseline() {
  if (!fs.existsSync(baselinePath)) {
    fail("falta eslint-baseline.json; la actualización debe ser explícita");
  }

  try {
    return JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  } catch (error) {
    fail(`baseline inválido: ${error.message}`);
  }
}

function validateBaseline(baseline) {
  if (baseline.version !== 1 || !Array.isArray(baseline.findings)) {
    fail("el baseline no cumple el esquema versión 1");
  }
  if (!baseline.classifications || typeof baseline.classifications !== "object") {
    fail("el baseline no contiene clasificaciones por regla");
  }

  const errors = [];
  for (const finding of baseline.findings) {
    if (!finding.file || !finding.ruleId || !finding.message || !finding.count) {
      errors.push(`hallazgo incompleto: ${JSON.stringify(finding)}`);
      continue;
    }
    if (path.isAbsolute(finding.file) || finding.file.includes("\\")) {
      errors.push(`ruta no relativa/normalizada: ${finding.file}`);
    }

    const classification = baseline.classifications[finding.ruleId];
    if (!classification || !allowedCategories.has(classification.category)) {
      errors.push(`regla sin clasificación aprobada: ${finding.ruleId}`);
      continue;
    }
    if (typeof classification.accepted !== "boolean") {
      errors.push(`clasificación sin accepted booleano: ${finding.ruleId}`);
    }
    if (
      ["funcional o potencialmente funcional", "seguridad"].includes(
        classification.category
      ) && classification.accepted !== false
    ) {
      errors.push(`hallazgo funcional/seguridad marcado como aceptado: ${finding.ruleId}`);
    }
    if (classification.accepted === false && !classification.tracking) {
      errors.push(`hallazgo no aceptado sin referencia: ${finding.ruleId}`);
    }
  }

  if (errors.length) fail(errors.join("\n"));
}

function summarize(findings) {
  return findings.reduce(
    (summary, finding) => {
      summary[finding.severity] += finding.count;
      return summary;
    },
    { error: 0, warning: 0 }
  );
}

function check() {
  const baseline = readBaseline();
  validateBaseline(baseline);
  const current = runEslint();
  const expectedByKey = new Map(
    baseline.findings.map((finding) => [findingKey(finding), finding])
  );
  const currentByKey = new Map(current.map((finding) => [findingKey(finding), finding]));
  const regressions = [];

  for (const finding of current) {
    const expected = expectedByKey.get(findingKey(finding));
    const allowedCount = expected ? expected.count : 0;
    if (finding.count > allowedCount) {
      regressions.push({ ...finding, newCount: finding.count - allowedCount });
    }
  }

  if (regressions.length) {
    console.error("[lint-baseline] Se detectó deuda nueva:");
    for (const finding of regressions) {
      console.error(
        `- ${finding.file} | ${finding.severity} | ${finding.ruleId} | +${finding.newCount} | ${finding.message}`
      );
    }
    process.exit(1);
  }

  const resolved = baseline.findings.reduce((total, finding) => {
    const currentFinding = currentByKey.get(findingKey(finding));
    return total + Math.max(0, finding.count - (currentFinding?.count || 0));
  }, 0);
  const summary = summarize(current);
  const trackedRiskRules = Object.entries(baseline.classifications)
    .filter(([, classification]) => classification.accepted === false)
    .map(([ruleId, classification]) => `${ruleId} (${classification.tracking})`);

  console.log(
    `[lint-baseline] OK: ${summary.error} errores y ${summary.warning} warnings conocidos; ${resolved} hallazgos resueltos respecto del baseline.`
  );
  if (trackedRiskRules.length) {
    console.log(
      `[lint-baseline] Riesgos conocidos no aceptados como deuda segura: ${trackedRiskRules.join(", ")}.`
    );
  }
}

function update() {
  const reasonIndex = process.argv.indexOf("--reason");
  const reason = reasonIndex >= 0 ? process.argv[reasonIndex + 1]?.trim() : "";
  if (!reason) {
    fail('actualizar requiere --reason "justificación revisada"');
  }

  const previous = fs.existsSync(baselinePath) ? readBaseline() : {};
  const next = {
    version: 1,
    normalization: "ruta relativa + severidad + regla + primer párrafo del mensaje + multiplicidad",
    updateReason: reason,
    classifications: previous.classifications || {},
    findings: runEslint(),
  };
  fs.writeFileSync(baselinePath, `${JSON.stringify(next, null, 2)}\n`);
  console.log(
    "[lint-baseline] Baseline actualizado. Clasifica toda regla nueva y ejecuta lint:baseline antes de revisión."
  );
}

const mode = process.argv[2];
if (mode === "check") check();
else if (mode === "update") update();
else fail("uso: lint-baseline.js <check|update> [--reason texto]");
