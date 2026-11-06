"use strict";

const { Timestamp } = require("firebase-admin/firestore");
const d = require("../domain/paymentDelivery");
const e = require("../application/paymentDeliveryErrors");

function createSubjectPaymentApplicationsCapability({ db }) {
  if (!db) throw new TypeError("Subject payment applications capability requires db");
  const payments = db.collection("payments"); const roots = db.collection("paymentDeliveries");
  const timestamp = (value) => value && typeof value.toMillis === "function" && Number.isFinite(value.toMillis());
  const scopeHash = (scope) => d.hash(scope);
  function encode(scope, anchors) { return Buffer.from(JSON.stringify({ v: 1, scope: scopeHash(scope), anchors })).toString("base64url"); }
  function decode(value, scope) {
    if (!value) return { informed: null, administrative: null };
    try {
      const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
      if (!d.exact(parsed, ["v", "scope", "anchors"]) || parsed.v !== 1 || parsed.scope !== scopeHash(scope) || !d.exact(parsed.anchors, ["informed", "administrative"])) throw new Error();
      for (const anchor of Object.values(parsed.anchors)) if (anchor !== null && (!d.exact(anchor, ["at", "id"]) || !Number.isSafeInteger(anchor.at) || typeof anchor.id !== "string" || !anchor.id)) throw new Error();
      return parsed.anchors;
    } catch (_) { throw new e.DeliveryConcurrentModificationError(); }
  }
  function application(snapshot, expectedOrigin) {
    if (!snapshot.exists) throw new e.DeliveryConcurrentModificationError(); const value = snapshot.data();
    const origin = value?.source?.kind === "ADMINISTRATIVE" ? "ADMINISTRATIVE" : value?.deliveryId ? "INFORMED" : null;
    const orderAt = origin === "ADMINISTRATIVE" ? value?.appliedAt : value?.confirmedAt;
    if (value?.applicationId !== snapshot.id || value.paymentId !== snapshot.ref.parent.parent.id || origin !== expectedOrigin || !timestamp(orderAt) || !Number.isSafeInteger(value.appliedAmountMinor) || value.appliedAmountMinor < 1 || !["APPLIED", "REVERSED"].includes(value.applicationState)) throw new e.DeliveryIncompatibleStateError();
    return { value, origin, orderAt };
  }
  function rootFor(snapshot, row, payment) {
    if (!snapshot.exists) throw new e.DeliveryIncompatibleStateError(); const root = snapshot.data();
    if (root.groupId !== payment.groupId || root.seasonId !== payment.seasonId || root.membershipId !== payment.membershipId || root.personId !== payment.personId || root.applicationState !== row.value.applicationState) throw new e.DeliveryIncompatibleStateError();
    if (row.origin === "INFORMED") {
      if (root.deliveryId !== snapshot.id || root.decisionState !== "CONFIRMED" || !timestamp(root.confirmedAt) || root.confirmedAt.toMillis() !== row.orderAt.toMillis() || !root.lines?.some((line) => line.lineId === row.value.lineId && line.paymentId === payment.paymentId && line.requestedAmountMinor === row.value.appliedAmountMinor)) throw new e.DeliveryIncompatibleStateError();
      return { effectiveOn: root.declaredPaidOn, appliedAt: d.iso(root.confirmedAt), ...(root.reversedAt ? { reversedAt: d.iso(root.reversedAt) } : {}) };
    }
    if (root.origin !== "ADMINISTRATIVE" || root.receiptId !== snapshot.id || !timestamp(root.recordedAt) || root.recordedAt.toMillis() !== row.orderAt.toMillis() || !root.lines?.some((line) => line.lineId === row.value.lineId && line.paymentId === payment.paymentId && line.amountMinor === row.value.appliedAmountMinor)) throw new e.DeliveryIncompatibleStateError();
    return { effectiveOn: root.receivedOn, appliedAt: d.iso(root.recordedAt), ...(root.reversedAt ? { reversedAt: d.iso(root.reversedAt) } : {}) };
  }
  async function list({ unitOfWork, accountId, personId, payment, pageSize, cursor }) {
    if (!unitOfWork || typeof accountId !== "string" || typeof personId !== "string" || payment?.personId !== personId) throw new e.DeliveryNotAccessibleError();
    const scope = { contractVersion: "subject-payment-applications-v1", accountId, personId, groupId: payment.groupId, seasonId: payment.seasonId, membershipId: payment.membershipId, paymentId: payment.paymentId, states: ["APPLIED", "REVERSED"], order: "appliedAt:desc,origin:asc,applicationId:desc", pageSize };
    const anchors = decode(cursor, scope); const collection = payments.doc(payment.paymentId).collection("deliveryApplications");
    let informedQuery = collection.orderBy("confirmedAt", "desc").orderBy("__name__", "desc");
    let administrativeQuery = collection.orderBy("appliedAt", "desc").orderBy("__name__", "desc");
    for (const [stream, anchor] of Object.entries(anchors)) if (anchor) {
      const row = application(await unitOfWork.get(collection.doc(anchor.id)), stream === "informed" ? "INFORMED" : "ADMINISTRATIVE");
      if (row.orderAt.toMillis() !== anchor.at) throw new e.DeliveryConcurrentModificationError();
      if (stream === "informed") informedQuery = informedQuery.startAfter(Timestamp.fromMillis(anchor.at), anchor.id);
      else administrativeQuery = administrativeQuery.startAfter(Timestamp.fromMillis(anchor.at), anchor.id);
    }
    const [informedSnapshot, administrativeSnapshot] = await Promise.all([
      unitOfWork.get(informedQuery.limit(pageSize + 1)), unitOfWork.get(administrativeQuery.limit(pageSize + 1)),
    ]);
    const rows = [
      ...informedSnapshot.docs.map((doc) => ({ stream: "informed", doc, ...application(doc, "INFORMED") })),
      ...administrativeSnapshot.docs.map((doc) => ({ stream: "administrative", doc, ...application(doc, "ADMINISTRATIVE") })),
    ].sort((left, right) => right.orderAt.toMillis() - left.orderAt.toMillis() || left.origin.localeCompare(right.origin) || right.doc.id.localeCompare(left.doc.id)).slice(0, pageSize);
    const seen = new Set(); const items = []; const next = { ...anchors };
    for (const row of rows) {
      const key = `${row.origin}\u0000${row.doc.id}`; if (seen.has(key)) continue; seen.add(key);
      const rootId = row.origin === "ADMINISTRATIVE" ? row.value.source.receiptId : row.value.deliveryId;
      const root = rootFor(await unitOfWork.get(roots.doc(rootId)), row, payment);
      items.push(Object.freeze({ applicationId: row.doc.id, origin: row.origin, amountMinor: row.value.appliedAmountMinor, currency: payment.conceptSnapshot.currency || "ARS", effectiveOn: root.effectiveOn, appliedAt: root.appliedAt, applicationState: row.value.applicationState, ...(root.reversedAt ? { reversedAt: root.reversedAt } : {}) }));
      next[row.stream] = { at: row.orderAt.toMillis(), id: row.doc.id };
    }
    const emittedInformed = rows.filter((row) => row.stream === "informed").length; const emittedAdministrative = rows.length - emittedInformed;
    const more = informedSnapshot.size > emittedInformed || administrativeSnapshot.size > emittedAdministrative;
    return Object.freeze({ items: Object.freeze(items), ...(more ? { nextCursor: encode(scope, next) } : {}) });
  }
  return Object.freeze({ list });
}

module.exports = { createSubjectPaymentApplicationsCapability };
