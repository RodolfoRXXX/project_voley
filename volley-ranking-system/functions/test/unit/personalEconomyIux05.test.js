"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const paymentContract = require("../../src/payments/application/paymentContract");
const deliveryContract = require("../../src/paymentDeliveries/application/paymentDeliveryContract");
const receiptContract = require("../../src/administrativeReceipts/application/administrativeReceiptContract");
const { createSubjectPendingNoticeEvidenceCapability } = require("../../src/paymentDeliveries/public/subjectPendingNoticeEvidenceCapability");

const root = path.resolve(__dirname, "../../../..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("IUX-05 cierra inputs contextuales y limita todas las páginas a 20", () => {
  assert.deepEqual(paymentContract.validateListMyMembershipObligations({ groupId: "group-1", membershipId: "membership-1", status: "OPEN", pageSize: 20 }), { groupId: "group-1", membershipId: "membership-1", status: "OPEN", pageSize: 20, cursor: undefined });
  assert.deepEqual(deliveryContract.validateMyMembershipNotices({ groupId: "group-1", membershipId: "membership-1", pageSize: 20 }), { groupId: "group-1", membershipId: "membership-1", pageSize: 20, cursor: undefined });
  assert.deepEqual(deliveryContract.validateMyPaymentApplications({ paymentId: "payment-1", pageSize: 20 }), { paymentId: "payment-1", pageSize: 20, cursor: undefined });
  assert.deepEqual(receiptContract.validateMyMembershipRegisteredPayments({ groupId: "group-1", membershipId: "membership-1", pageSize: 20 }), { groupId: "group-1", membershipId: "membership-1", pageSize: 20, cursor: undefined });
  for (const operation of [
    () => paymentContract.validateListMyMembershipObligations({ groupId: "group-1", membershipId: "membership-1", status: "OPEN", pageSize: 21 }),
    () => deliveryContract.validateMyMembershipNotices({ groupId: "group-1", membershipId: "membership-1", pageSize: 21 }),
    () => deliveryContract.validateMyPaymentApplications({ paymentId: "payment-1", pageSize: 21 }),
    () => receiptContract.validateMyMembershipRegisteredPayments({ groupId: "group-1", membershipId: "membership-1", pageSize: 21 }),
    () => paymentContract.validateListMyMembershipObligations({ groupId: "group-1", membershipId: "membership-1", status: "OPEN", pageSize: 20, cursor: null }),
    () => deliveryContract.validateMyMembershipNotices({ groupId: "group-1", membershipId: "membership-1", pageSize: 20, cursor: null }),
    () => receiptContract.validateMyMembershipRegisteredPayments({ groupId: "group-1", membershipId: "membership-1", pageSize: 20, cursor: null }),
  ]) assert.throws(operation);
});

test("IUX-05 omite opcionales ausentes antes de invocar cada callable", () => {
  const payments = read("volley-ranking-frontend/src/services/paymentsService.ts");
  const deliveries = read("volley-ranking-frontend/src/services/paymentDeliveriesService.ts");
  const receipts = read("volley-ranking-frontend/src/services/administrativeReceiptsService.ts");
  for (const service of [payments, deliveries, receipts]) {
    assert.match(service, /input\.pageSize\s*===\s*undefined\s*\?\s*\{\}\s*:\s*\{\s*pageSize:\s*input\.pageSize\s*\}/);
    assert.match(service, /input\.cursor\s*===\s*undefined\s*\?\s*\{\}\s*:\s*\{\s*cursor:\s*input\.cursor\s*\}/);
  }
  assert.doesNotMatch(payments, /listMyMembershipCall\(input\)/);
  assert.doesNotMatch(deliveries, /listMembershipNoticesCall\(input\)/);
  assert.doesNotMatch(receipts, /listMyMembershipRegisteredPayments"\)\(input\)/);
});

test("IUX-05 publica sólo readers y conserva contexto y detalle existentes", () => {
  const index = read("volley-ranking-system/functions/index.js");
  for (const name of ["listMyMembershipObligations", "listMyMembershipPaymentNotices", "listMyMembershipRegisteredPayments", "listMyPaymentObligationApplications"]) assert.match(index, new RegExp(`exports\\.${name}`));
  assert.match(index, /exports\.getMyCurrentGroupMembershipContext/);
  assert.match(index, /exports\.getMyPaymentObligationDetail/);
  for (const callable of ["listMyMembershipObligations", "listMyMembershipPaymentNotices", "listMyMembershipRegisteredPayments", "listMyPaymentObligationApplications"]) assert.doesNotMatch(read(`volley-ranking-system/functions/callables/${callable}.js`), /\.set\(|\.create\(|\.update\(|\.delete\(/);
});

test("IUX-05 versiona exactamente el índice informado adoptado", () => {
  const config = JSON.parse(read("volley-ranking-system/firestore.indexes.json"));
  const expected = [
    ["membershipId", "ASCENDING"], ["decisionState", "ASCENDING"], ["confirmedAt", "DESCENDING"], ["__name__", "DESCENDING"],
  ];
  assert.equal(config.indexes.filter((item) => item.collectionGroup === "paymentDeliveries" && JSON.stringify(item.fields.map((field) => [field.fieldPath, field.mode])) === JSON.stringify(expected)).length, 1);
});

test("IUX-05 mantiene anclas por stream, fecha original de reversión y DTO SUBJECT mínimo", () => {
  const receipts = read("volley-ranking-system/functions/src/administrativeReceipts/infrastructure/firestoreAdministrativeReceiptStore.js");
  const applications = read("volley-ranking-system/functions/src/paymentDeliveries/public/subjectPaymentApplicationsCapability.js");
  assert.match(receipts, /next\[row\.stream\]=\{at:row\.eventAt\.toMillis\(\),id:row\.doc\.id\}/);
  assert.match(receipts, /registeredAt:d\.iso\(x\.confirmedAt\)/);
  assert.match(receipts, /registeredAt:d\.iso\(x\.recordedAt\)/);
  assert.match(receipts, /applicationState:x\.applicationState/);
  assert.match(receipts, /function registeredLines\(x,origin\)/);
  assert.match(receipts, /conceptName:line\.conceptName/);
  assert.match(receipts, /dueDate:line\.dueDate/);
  assert.doesNotMatch(receipts.match(/function registeredLines[\s\S]*?function registeredDto/)?.[0] ?? "", /actor|AccountId|recordedBy|confirmedBy/);
  assert.match(applications, /next\[row\.stream\] = \{ at: row\.orderAt\.toMillis\(\), id: row\.doc\.id \}/);
  assert.doesNotMatch(applications, /actor|AccountId|reversalReason/);
});

test("IUX-05 integra pestañas, tabla responsive y descripciones históricas sin lecturas por fila", () => {
  const component = read("volley-ranking-frontend/src/components/payments/PersonalMembershipEconomy.tsx");
  const receipts = read("volley-ranking-system/functions/src/administrativeReceipts/infrastructure/firestoreAdministrativeReceiptStore.js");
  const types = read("volley-ranking-frontend/src/types/AdministrativeReceipt.ts");
  for (const label of ["Obligaciones", "Avisos", "Pagos", "Concepto y período", "Importe actual", "Saldo pendiente", "Período no informado", "Importe informado", "Aplicación confirmada", "Ver desglose"]) assert.match(component, new RegExp(label));
  assert.match(component, /grid grid-cols-3 border-b/);
  assert.match(component, /-mb-px/);
  assert.match(component, /table-fixed/);
  assert.match(component, /md:hidden/);
  assert.doesNotMatch(component, /overflow-x-auto|whitespace-nowrap/);
  assert.match(component, /role="tabpanel"/);
  assert.match(component, /aria-labelledby="economy-tab-/);
  assert.match(component, /\(item\.lines \?\? \[\]\)\.map/);
  assert.match(types, /OwnRegisteredPayment=.*lines:Array/);
  assert.match(receipts, /items\.push\(registeredDto\(x,row\.origin\)\)/);
  assert.doesNotMatch(receipts.match(/async function listMyMembershipRegisteredPayments[\s\S]*?async function listOwner/)?.[0] ?? "", /payments\.doc\(line\.paymentId\)|Promise\.all\(.*lines/);
});

test("IUX-05 UI navega bloques por URL, carga bajo demanda y no presenta agregado", () => {
  const component = read("volley-ranking-frontend/src/components/payments/PersonalMembershipEconomy.tsx");
  const page = read("volley-ranking-frontend/src/app/(protected)/dashboard/groups/[groupId]/personal-economy/page.tsx");
  const membership = read("volley-ranking-frontend/src/app/(protected)/dashboard/groups/[groupId]/membership/page.tsx");
  const navigation = read("volley-ranking-frontend/src/components/groups/GroupContextNavigation.tsx");
  const frame = read("volley-ranking-frontend/src/components/groups/GroupFrame.tsx");
  for (const label of ["Obligaciones pendientes", "Avisos informados", "Pagos registrados", "Ver todas mis obligaciones", "Cargar más pagos aplicados"]) assert.match(component, new RegExp(label));
  assert.match(component, /onClick=\{\(event\) => void openDetail/);
  assert.doesNotMatch(component, /saldo total|Total de Membresía|setInterval|onSnapshot/);
  assert.match(component, /generation\.current/);
  assert.match(component, /searchParams\.get\("economy"\)/);
  assert.match(component, /params\.set\("economy", tab\)/);
  assert.match(component, /role="tablist"/);
  assert.match(component, /ArrowRight/);
  assert.match(component, /tabIndex=\{activeTab === tab\.id \? 0 : -1\}/);
  assert.match(component, /md:hidden/);
  assert.match(component, /visited\.has\("obligations"\)/);
  assert.match(component, /firebaseUser\?\.uid/);
  assert.match(component, /No pudimos consultar las obligaciones/);
  assert.match(component, /No pudimos consultar los avisos/);
  assert.match(component, /No pudimos consultar los pagos registrados/);
  assert.match(page, /membershipContext: context/);
  assert.match(page, /<PersonalMembershipEconomy[^>]*showHeading=\{false\}/);
  assert.doesNotMatch(membership, /<PersonalMembershipEconomy/);
  assert.match(membership, /searchParams\.has\("economy"\)/);
  assert.match(membership, /personal-economy\$\{query \? `\?\$\{query\}` : ""\}\$\{hash\}/);
  assert.match(navigation, /label: "Economía personal"/);
  assert.match(navigation, /label: "Economía del Grupo"/);
  assert.match(frame, /membershipContext = await getMyCurrentGroupMembershipContext\(groupId\)/);
  assert.match(frame, /membershipContext: hasMembership \? membership\.value : null/);
  assert.match(frame, /\[firebaseUser\?\.uid, groupId, reloadVersion\]/);
  assert.doesNotMatch(frame, /usePathname|needsEconomicCapabilities/);
  assert.doesNotMatch(page + membership, /getMyCurrentGroupMembershipContext/);
  assert.match(frame, /getMyGroupTreasuryContext\(groupId\)\.then\(\(\) => true\)/);
  assert.doesNotMatch(frame, /then\(\(\) => true, \(\) => false\)/);
  assert.match(component, /href="\/dashboard\/obligations"[\s\S]*Ver todas mis obligaciones/);
  assert.equal((component.match(/Ver todas mis obligaciones/g) || []).length, 1);
  assert.match(component, /focus-visible:outline/);
});

test("IUX-05 presenta lenguaje propio, delega el aviso y normaliza Actualizar", () => {
  const component = read("volley-ranking-frontend/src/components/payments/PersonalMembershipEconomy.tsx");
  const presentation = read("volley-ranking-frontend/src/components/payments/paymentPresentation.ts");
  const obligations = read("volley-ranking-frontend/src/components/payments/MyObligationsView.tsx");
  const refresh = read("volley-ranking-frontend/src/components/ui/RefreshButton.tsx");
  const pending = read("volley-ranking-frontend/src/components/dashboard/PendingTasksSection.tsx");
  for (const label of ["Importe actual", "Saldo pendiente", "Pagos aplicados", "Ajustes de la obligación", "Deuda perdonada", "Informar un pago"]) assert.match(component, new RegExp(label));
  for (const rawLabel of ["Saldo canónico", "Principal vigente", "Aplicaciones de ingresos", "Correcciones y condonaciones"]) assert.doesNotMatch(component, new RegExp(rawLabel));
  assert.doesNotMatch(component, />\{detail\.estado\}</);
  for (const state of ["PENDING", "PARTIAL", "SETTLED", "VOIDED", "REPORTED", "CONFIRMED", "REJECTED", "RESOLVED_BY_ADMINISTRATIVE_RECEIPT", "APPLIED", "REVERSED"]) assert.match(presentation, new RegExp(state));
  assert.match(presentation, /Estado no disponible/);
  assert.match(component, /\/dashboard\/obligations\?\$\{params\.toString\(\)\}/);
  assert.match(component, /paymentId, groupId, membershipId, returnTo/);
  assert.match(obligations, /useSearchParams/);
  assert.match(obligations, /getMyPaymentObligationDetail\(requestedPaymentId\)/);
  assert.match(obligations, /Obligación seleccionada/);
  assert.match(obligations, /Volver a Economía personal/);
  assert.match(refresh, /aria-label=\{label\}/);
  assert.match(refresh, /title=\{label\}/);
  assert.match(refresh, />Actualizar<\/span>/);
  assert.match(refresh, /disabled=\{loading\}/);
  assert.match(component, /<RefreshButton/);
  assert.match(pending, /<RefreshButton/);
  assert.match(component, /if \(busy\.current\) return/);
});

test("IUX-05 conserva el acceso resuelto al cambiar sólo de sección", () => {
  const frame = read("volley-ranking-frontend/src/components/groups/GroupFrame.tsx");
  assert.match(frame, /resolveAccess\(groupId, true\)/);
  assert.match(frame, /\[firebaseUser\?\.uid, groupId, reloadVersion\]/);
  assert.doesNotMatch(frame, /usePathname|needsEconomicCapabilities/);
});

function pendingNoticeDoc(id, paymentIds, overrides = {}) {
  const lines = paymentIds.map((paymentId, index) => ({ lineId: `${id}-line-${index}`, paymentId, selectionMode: "PARTIAL", requestedAmountMinor: 100 + index, expectedBalanceMinor: 1000, expectedEconomicRevision: 1, conceptName: `Concepto ${index}`, dueDate: "2026-11-20" }));
  const data = { deliveryId: id, receiptId: id, origin: "INFORMED", groupId: "group-1", seasonId: "season-1", membershipId: "membership-1", personId: "person-1", reportedByAccountId: "account-1", declaredPaidOn: "2026-11-01", lines, declaredTotalMinor: lines.reduce((sum, line) => sum + line.requestedAmountMinor, 0), decisionState: "REPORTED", reportedAt: { toDate: () => new Date("2026-11-01T12:00:00.000Z") }, revision: 1, schemaVersion: 2, ...overrides };
  return { id, exists: true, data: () => data };
}

test("IUX-05 acredita FOUND/NONE sólo con cobertura explícita y no consume el lookahead", async () => {
  const state = { docs: [] };
  const chain = { where: () => chain, orderBy: () => chain, limit: () => chain };
  const capability = createSubjectPendingNoticeEvidenceCapability({ db: { collection: () => chain } });
  const input = { unitOfWork: { get: async () => ({ docs: state.docs }) }, personId: "person-1", groupId: "group-1", seasonId: "season-1", membershipId: "membership-1", paymentIds: ["payment-a", "payment-b"] };

  state.docs = [pendingNoticeDoc("notice-01", ["payment-a", "payment-b"])];
  const complete = await capability.find(input);
  assert.equal(complete.coverage, "COMPLETE");
  assert.equal(complete.evidence.get("payment-a").state, "FOUND");
  assert.equal(complete.evidence.get("payment-b").state, "FOUND");

  state.docs = Array.from({ length: 20 }, (_, index) => pendingNoticeDoc(`notice-${String(index).padStart(2, "0")}`, ["unrelated-payment"]));
  const exactlyTwenty = await capability.find(input);
  assert.equal(exactlyTwenty.coverage, "COMPLETE");
  assert.equal(exactlyTwenty.evidence.get("payment-a").state, "NONE");

  state.docs = [...state.docs, pendingNoticeDoc("notice-20", ["payment-a"])];
  const partial = await capability.find(input);
  assert.equal(partial.coverage, "PARTIAL");
  assert.deepEqual(partial.evidence.get("payment-a"), { state: "UNKNOWN", reason: "PARTIAL_COVERAGE" });
  assert.deepEqual(partial.evidence.get("payment-b"), { state: "UNKNOWN", reason: "PARTIAL_COVERAGE" });
});

test("IUX-05 falla cerrado el complemento sin perder la página principal", async () => {
  const chain = { where: () => chain, orderBy: () => chain, limit: () => chain };
  const capability = createSubjectPendingNoticeEvidenceCapability({ db: { collection: () => chain } });
  const result = await capability.find({ unitOfWork: { get: async () => { throw new Error("synthetic dependency failure"); } }, personId: "person-1", groupId: "group-1", seasonId: "season-1", membershipId: "membership-1", paymentIds: ["payment-a"] });
  assert.equal(result.coverage, "FAILED");
  assert.deepEqual(result.evidence.get("payment-a"), { state: "UNKNOWN", reason: "SUPPLEMENT_UNAVAILABLE" });
});

test("IUX-05 integra una consulta agrupada acotada y presenta cobertura sin N+1", () => {
  const store = read("volley-ranking-system/functions/src/payments/infrastructure/firestorePaymentStore.js");
  const capability = read("volley-ranking-system/functions/src/paymentDeliveries/public/subjectPendingNoticeEvidenceCapability.js");
  const component = read("volley-ranking-frontend/src/components/payments/PersonalMembershipEconomy.tsx");
  assert.match(store, /subjectPendingNotices\.find/);
  assert.match(capability, /MAX_EVIDENCE_NOTICES \+ LOOKAHEAD/);
  assert.match(capability, /where\("membershipId", "==", membershipId\)\.where\("decisionState", "==", "REPORTED"\)/);
  assert.doesNotMatch(capability, /for \(const paymentId[\s\S]*unitOfWork\.get/);
  for (const state of ["COMPLETE", "PARTIAL", "FAILED", "FOUND", "NONE", "UNKNOWN"]) assert.match(capability + store, new RegExp(state));
  for (const label of ["Pago informado · En revisión", "Consultá tus avisos de pago", "Reintentar comprobación", "Ver aviso informado"]) assert.match(component, new RegExp(label));
  assert.match(component, /getMyPaymentDelivery\(selectedNoticeId\)/);
  assert.match(component, /params\.set\("notice", deliveryId\)/);
});

test("IUX-05 localiza un aviso sin duplicarlo ni alterar la paginación", () => {
  const component = read("volley-ranking-frontend/src/components/payments/PersonalMembershipEconomy.tsx");
  assert.match(component, /const loaded = new Map<string, NoticeListItem>/);
  assert.match(component, /if \(!loaded\.has\(item\.deliveryId\)\) loaded\.set\(item\.deliveryId, item\)/);
  assert.match(component, /if \(selected && selectedNoticeId\) loaded\.set\(selectedNoticeId, selected\)/);
  assert.match(component, /if \(selected && !selectedIsLoaded\) rendered\.unshift\(\{ item: selected, localized: true \}\)/);
  assert.match(component, /Resultado localizado fuera de la página cargada/);
  assert.match(component, /aria-current=\{selected \? "true" : undefined\}/);
  assert.match(component, /scrollIntoView\(\{ block: "center" \}\)/);
  assert.match(component, /key=\{item\.deliveryId\}/);
  assert.doesNotMatch(component, /selectedNoticeId \? <div className="mt-3 rounded-xl border-2/);
});
