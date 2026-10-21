export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "2026-10-01";
  const to = url.searchParams.get("to") ?? "2026-10-31";
  const requestNumber = Number(url.searchParams.get("request") ?? "1");
  if (from === "2026-09-01") await new Promise((resolve) => setTimeout(resolve, 600));
  const items = Array.from({ length: 1000 }, (_, index) => ({
    movementId: `${from}:movement:${String(index).padStart(4, "0")}`,
    receiptId: `receipt-${index}`,
    kind: index % 5 === 0 ? "RECORD_REVERSAL" : "INCOME_RECORDED",
    origin: index % 2 === 0 ? "INFORMED" : "ADMINISTRATIVE",
    amountMinor: 10000 + index,
    eventAt: `2026-10-${String(1 + (index % 28)).padStart(2, "0")}T12:00:00.000Z`,
    effectiveOn: `2026-10-${String(1 + (index % 28)).padStart(2, "0")}`,
    receiptStateAtCutoff: index % 5 === 0 ? "REVERSED" : "APPLIED",
    subject: { status: "AVAILABLE", firstName: from, lastName: `Persona ${index}` },
  }));
  return Response.json({
    audience: "OWNER",
    scope: { groupId: "browser-group", from, to,
      timeZone: "America/Argentina/Buenos_Aires", currency: "ARS" },
    view: { readCutoffExclusive: `2026-10-21T15:00:${String(requestNumber % 60).padStart(2, "0")}.000Z`,
      manifestDigest: `${from}-${to}-${requestNumber}` },
    totals: { grossRecordedIncomeMinor: 12345, reversedRecordsMinor: 2345,
      netRegisteredIncomeMinor: 10000, movementCount: 1000 },
    items,
  });
}
