import { parseArsMinor } from "../../services/arsMoney.mjs";
export const administrativeAmountInput = (minor) => (minor / 100).toFixed(2);
export function resolveAdministrativeAmountMinor(balanceMinor, mode, input) {
  if (mode === "FULL") return balanceMinor;
  const amountMinor = parseArsMinor(input);
  return amountMinor !== null && amountMinor <= balanceMinor ? amountMinor : null;
}

export function buildAdministrativeReceiptLine(obligation, mode, input) {
  const amountMinor = resolveAdministrativeAmountMinor(obligation.balanceMinor, mode, input);
  return amountMinor === null
    ? null
    : {
        paymentId: obligation.paymentId,
        allocationMode: mode,
        amountMinor,
        expectedBalanceMinor: obligation.balanceMinor,
        expectedEconomicRevision: obligation.economicRevision,
      };
}
