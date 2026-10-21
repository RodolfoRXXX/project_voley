"use strict";

const { FieldPath, Timestamp } = require("firebase-admin/firestore");
const { createGroupTreasuryAuthorizationCapability } = require("../../treasury/public/groupTreasuryAuthorizationCapability");
const movement = require("../domain/registeredIncomeMovement");

const TIME_ZONE = "America/Argentina/Buenos_Aires";
const ZONED_PARTS = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE,
  year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  second: "2-digit", hourCycle: "h23" });

function startOfCivilDay(value) {
  const [year, month, day] = value.split("-").map(Number);
  const desiredUtc = Date.UTC(year, month - 1, day);
  let instant = desiredUtc;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = Object.fromEntries(ZONED_PARTS.formatToParts(new Date(instant))
      .filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
    const representedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day,
      parts.hour, parts.minute, parts.second);
    instant = desiredUtc - (representedAsUtc - instant);
  }
  return Timestamp.fromMillis(instant);
}

function periodFromCivilRange(input) {
  const nextDay = new Date(Date.parse(`${input.to}T00:00:00.000Z`) + 86400000)
    .toISOString().slice(0, 10);
  return Object.freeze({ startInclusive: startOfCivilDay(input.from),
    endExclusive: startOfCivilDay(nextDay) });
}

function createFirestoreRegisteredIncomeMovementReader({ db, instrumentation, testHooks = Object.freeze({}) }) {
  if (!db) throw new TypeError("db is required");
  const treasuryAuthorization = createGroupTreasuryAuthorizationCapability({ db });
  const roots = db.collection("paymentDeliveries");

  function timestamp(value) {
    return Boolean(value && typeof value.toMillis === "function" && Number.isFinite(value.toMillis()));
  }

  function tupleKey(value) {
    const tuple = movement.timestampTuple(value);
    return `${tuple.seconds}:${tuple.nanoseconds}`;
  }

  function recordReadTime(metrics, snapshot) {
    metrics.readTimeSamples += 1;
    if (snapshot?.readTime) metrics.snapshotReadTimes.add(tupleKey(snapshot.readTime));
    else metrics.missingReadTimeSnapshots += 1;
  }

  function timestampFromTuple(value) {
    if (!value || !Number.isSafeInteger(value.seconds) || !Number.isSafeInteger(value.nanoseconds)
      || value.nanoseconds < 0 || value.nanoseconds > 999999999) {
      throw new movement.RegisteredIncomeMovementError("DATA_INCOMPATIBLE", "Invalid canonical timestamp");
    }
    return new Timestamp(value.seconds, value.nanoseconds);
  }

  function compareTimestamp(left, right) {
    return left.seconds - right.seconds || left.nanoseconds - right.nanoseconds;
  }

  function validateInput(accountId, input) {
    const startOrdinal = Date.parse(`${input?.from}T00:00:00.000Z`);
    const endOrdinal = Date.parse(`${input?.to}T00:00:00.000Z`);
    if (typeof accountId !== "string" || !accountId || !input || typeof input.groupId !== "string"
      || !input.groupId || typeof input.from !== "string" || typeof input.to !== "string"
      || !/^\d{4}-\d{2}-\d{2}$/.test(input.from) || !/^\d{4}-\d{2}-\d{2}$/.test(input.to)
      || !Number.isFinite(startOrdinal) || !Number.isFinite(endOrdinal) || startOrdinal > endOrdinal
      || Object.keys(input).some((key) => !["groupId", "from", "to"].includes(key))) {
      throw new movement.RegisteredIncomeMovementError("INVALID_QUERY", "Invalid registered-income query");
    }
    if ((endOrdinal - startOrdinal) / 86400000 + 1 > 92) {
      throw new movement.RegisteredIncomeMovementError("RANGE_TOO_WIDE", "The query exceeds 92 civil days");
    }
  }

  function validateGroup(snapshot) {
    if (!snapshot.exists) throw new movement.RegisteredIncomeMovementError("GROUP_NOT_ACCESSIBLE");
    const data = snapshot.data();
    const compatible = (data.estado === "activo" && [1, 3].includes(data.schemaVersion))
      || (data.estado === "archivado" && [2, 4].includes(data.schemaVersion));
    const legacy = [1, 2].includes(data.schemaVersion);
    const ownershipRevision = legacy && !Object.hasOwn(data, "ownershipRevision")
      ? 1 : data.ownershipRevision;
    if (!compatible || typeof data.ownerId !== "string" || !data.ownerId || !["activo", "archivado"].includes(data.estado)
      || (legacy && Object.hasOwn(data, "ownershipRevision"))
      || !Number.isSafeInteger(ownershipRevision) || ownershipRevision < 1) {
      throw new movement.RegisteredIncomeMovementError("DATA_INCOMPATIBLE", "Invalid group context");
    }
    return Object.freeze({ ownerId: data.ownerId, estado: data.estado, ownershipRevision });
  }

  async function authorize(transaction, groupSnapshot, accountId, groupId, metrics) {
    const group = validateGroup(groupSnapshot);
    const counted = Object.create(transaction);
    counted.get = async (reference) => {
      const snapshot = await transaction.get(reference);
      metrics.authorizationDocumentResults += snapshot?.docs ? snapshot.size : 1;
      recordReadTime(metrics, snapshot);
      return snapshot;
    };
    const accountSnapshot = await counted.get(db.collection("users").doc(accountId));
    if (!accountSnapshot.exists || typeof accountSnapshot.data()?.email !== "string"
      || !accountSnapshot.data().email.trim()) {
      throw new movement.RegisteredIncomeMovementError("ACCOUNT_REQUIRED");
    }
    if (group.ownerId === accountId) return Object.freeze({ audience: "OWNER", group });
    if (group.estado !== "activo") {
      throw new movement.RegisteredIncomeMovementError("GROUP_TREASURY_NOT_AUTHORIZED");
    }
    const authorization = await treasuryAuthorization.evaluate({ unitOfWork: counted, accountId, groupId });
    if (authorization.status !== "AUTHORIZED") {
      throw new movement.RegisteredIncomeMovementError("GROUP_TREASURY_NOT_AUTHORIZED");
    }
    return Object.freeze({ audience: "TREASURY", group });
  }

  function queryFor(stream, groupId, startInclusive, upperExclusive, limit) {
    let query = roots.where("groupId", "==", groupId);
    let field;
    if (stream === "INFORMED") {
      field = "confirmedAt";
      query = query.where("decisionState", "==", "CONFIRMED");
    } else if (stream === "ADMINISTRATIVE") {
      field = "recordedAt";
      query = query.where("origin", "==", "ADMINISTRATIVE");
    } else {
      field = "reversedAt";
    }
    return query.where(field, ">=", startInclusive).where(field, "<", upperExclusive)
      .orderBy(field, "desc").orderBy(FieldPath.documentId(), "desc").limit(limit);
  }

  async function readStream(transaction, stream, query, metrics) {
    const snapshot = await transaction.get(query);
    metrics.querySnapshots += 1;
    metrics.movementDocumentResults[stream.toLowerCase()] += snapshot.size;
    metrics.movementDocumentResults.total += snapshot.size;
    recordReadTime(metrics, snapshot);
    return snapshot.docs;
  }

  async function list(accountId, input) {
    validateInput(accountId, input);
    const period = periodFromCivilRange(input);
    const baseScope = Object.freeze({ contract: movement.CONTRACT, actorId: accountId,
      groupId: input.groupId, periodStartInclusive: movement.timestampTuple(period.startInclusive),
      periodEndExclusive: movement.timestampTuple(period.endExclusive) });
    const metrics = {
      transactionMode: "READ_ONLY",
      transactionAttempts: 0,
      authorizationDocumentResults: 0,
      presentationDocumentResults: 0,
      querySnapshots: 0,
      readTimeSamples: 0,
      missingReadTimeSnapshots: 0,
      snapshotReadTimes: new Set(),
      movementDocumentResults: { informed: 0, administrative: 0, reversal: 0, total: 0 },
    };
    try {
      const response = await db.runTransaction(async (transaction) => {
        metrics.transactionAttempts += 1;
        const groupSnapshot = await transaction.get(db.collection("groups").doc(input.groupId));
        metrics.authorizationDocumentResults += 1;
        recordReadTime(metrics, groupSnapshot);
        const authorization = await authorize(transaction, groupSnapshot, accountId, input.groupId, metrics);
        const scope = Object.freeze({ ...baseScope, audience: authorization.audience });
        const cutoffExclusive = groupSnapshot.readTime;
        if (!timestamp(cutoffExclusive)) {
          throw new movement.RegisteredIncomeMovementError("DEPENDENCY_UNAVAILABLE", "Server readTime is unavailable");
        }
        if (typeof testHooks.afterCutoffRead === "function") {
          await testHooks.afterCutoffRead({ cutoffExclusive });
        }
        const periodEnd = movement.timestampTuple(period.endExclusive);
        const cutoff = movement.timestampTuple(cutoffExclusive);
        const upperExclusive = compareTimestamp(periodEnd, cutoff) <= 0
          ? period.endExclusive : cutoffExclusive;
        let remaining = movement.DETECTION_LIMIT;
        const informed = await readStream(transaction, "INFORMED",
          queryFor("INFORMED", input.groupId, period.startInclusive, upperExclusive, remaining), metrics);
        remaining -= informed.length;
        if (remaining === 0) throw new movement.RegisteredIncomeMovementError("MOVEMENT_LIMIT_EXCEEDED");
        const administrative = await readStream(transaction, "ADMINISTRATIVE",
          queryFor("ADMINISTRATIVE", input.groupId, period.startInclusive, upperExclusive, remaining), metrics);
        remaining -= administrative.length;
        if (remaining === 0) throw new movement.RegisteredIncomeMovementError("MOVEMENT_LIMIT_EXCEEDED");
        const reversals = await readStream(transaction, "REVERSAL",
          queryFor("REVERSAL", input.groupId, period.startInclusive, upperExclusive, remaining), metrics);
        if (informed.length + administrative.length + reversals.length >= movement.DETECTION_LIMIT) {
          throw new movement.RegisteredIncomeMovementError("MOVEMENT_LIMIT_EXCEEDED");
        }
        const manifest = movement.buildManifest({ scope: { ...scope,
          periodStartInclusive: period.startInclusive, periodEndExclusive: period.endExclusive },
        cutoffExclusive, informed, administrative, reversals });
        const people = new Map();
        for (const personId of new Set(manifest.facts.map((fact) => fact.personId))) {
          const snapshot = await transaction.get(db.collection("personas").doc(personId));
          people.set(personId, snapshot);
          metrics.presentationDocumentResults += 1;
          recordReadTime(metrics, snapshot);
        }
        const items = [];
        for (const fact of manifest.facts) {
          const personSnapshot = people.get(fact.personId);
          const data = personSnapshot?.data();
          const subject = personSnapshot?.exists && typeof data?.nombre === "string" && typeof data?.apellido === "string"
            ? { status: "AVAILABLE", firstName: data.nombre, lastName: data.apellido }
            : { status: "UNAVAILABLE" };
          items.push(Object.freeze({
            movementId: fact.movementId,
            ...(authorization.audience === "OWNER" ? { receiptId: fact.receiptId } : {}),
            kind: fact.kind,
            origin: fact.origin,
            amountMinor: fact.amountMinor,
            eventAt: timestampFromTuple(fact.eventAt).toDate().toISOString(),
            effectiveOn: fact.effectiveOn,
            receiptStateAtCutoff: fact.receiptStateAtCutoff,
            subject,
          }));
        }
        return Object.freeze({ audience: authorization.audience,
          scope: { groupId: input.groupId, from: input.from, to: input.to,
            timeZone: TIME_ZONE, currency: "ARS" },
          view: { readCutoffExclusive: cutoffExclusive.toDate().toISOString(),
            manifestDigest: manifest.manifestDigest }, totals: manifest.totals, items });
      }, { readOnly: true });
      instrumentation?.onRequest?.(Object.freeze({ ...metrics,
        snapshotReadTimes: [...metrics.snapshotReadTimes],
        commonReadTimeObserved: metrics.missingReadTimeSnapshots === 0 && metrics.snapshotReadTimes.size === 1 }));
      return response;
    } catch (error) {
      instrumentation?.onRequest?.(Object.freeze({ ...metrics, snapshotReadTimes: [...metrics.snapshotReadTimes],
        commonReadTimeObserved: metrics.missingReadTimeSnapshots === 0 && metrics.snapshotReadTimes.size === 1,
        errorReason: error?.reason || error?.code || "UNKNOWN" }));
      throw error;
    }
  }

  return Object.freeze({ list });
}

module.exports = { createFirestoreRegisteredIncomeMovementReader };
