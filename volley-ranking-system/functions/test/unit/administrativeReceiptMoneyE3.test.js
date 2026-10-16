"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { test } = require("node:test");

const frontendRoot = path.resolve(__dirname, "../../../../volley-ranking-frontend/src");

async function importFrontendModule(relativePath) {
  return import(pathToFileURL(path.join(frontendRoot, relativePath)).href);
}

test("E3-04 presenta $45.000,00 y conserva 4.500.000 centavos en FULL", async () => {
  const { formatArs } = await importFrontendModule("services/arsMoney.mjs");
  const { administrativeAmountInput, buildAdministrativeReceiptLine, resolveAdministrativeAmountMinor } = await importFrontendModule(
    "components/administrativeReceipts/administrativeReceiptAmounts.mjs",
  );

  assert.match(formatArs(4_500_000).replace(/\s/g, ""), /^\$45\.000,00$/);
  assert.equal(administrativeAmountInput(4_500_000), "45000.00");
  assert.equal(resolveAdministrativeAmountMinor(4_500_000, "FULL", "45000.00"), 4_500_000);

  const commandLine = buildAdministrativeReceiptLine(
    { paymentId: "payment-45000", balanceMinor: 4_500_000, economicRevision: 7 },
    "FULL",
    "45000.00",
  );
  assert.deepEqual(commandLine, {
    paymentId: "payment-45000",
    allocationMode: "FULL",
    amountMinor: 4_500_000,
    expectedBalanceMinor: 4_500_000,
    expectedEconomicRevision: 7,
  });
});

test("E3-04 convierte parciales decimales con los parsers vigentes", async () => {
  const { parseArsMinor } = await importFrontendModule("services/arsMoney.mjs");
  const { resolveAdministrativeAmountMinor } = await importFrontendModule(
    "components/administrativeReceipts/administrativeReceiptAmounts.mjs",
  );

  assert.equal(parseArsMinor("45000"), 4_500_000);
  assert.equal(parseArsMinor("22500,50"), 2_250_050);
  assert.equal(parseArsMinor("22500.50"), 2_250_050);
  assert.equal(resolveAdministrativeAmountMinor(4_500_000, "PARTIAL", "22500,50"), 2_250_050);
  assert.equal(resolveAdministrativeAmountMinor(4_500_000, "PARTIAL", "45000.01"), null);
  assert.equal(resolveAdministrativeAmountMinor(4_500_000, "PARTIAL", "22500,500"), null);
});
