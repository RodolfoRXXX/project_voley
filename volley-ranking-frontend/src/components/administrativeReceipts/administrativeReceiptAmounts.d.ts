export function administrativeAmountInput(minor: number): string;
export function resolveAdministrativeAmountMinor(balanceMinor: number, mode: "FULL" | "PARTIAL", input: string): number | null;
export function buildAdministrativeReceiptLine(
  obligation: { paymentId: string; balanceMinor: number; economicRevision: number },
  mode: "FULL" | "PARTIAL",
  input: string,
): {
  paymentId: string;
  allocationMode: "FULL" | "PARTIAL";
  amountMinor: number;
  expectedBalanceMinor: number;
  expectedEconomicRevision: number;
} | null;
