"use strict";

const { FieldPath, Timestamp } = require("firebase-admin/firestore");
const { InvalidGroupStateError } = require("../../groups/domain/group");
const { InvalidSeasonStateError } = require("../../groups/domain/season");
const { isTransientDependencyError } = require("../../shared/application/transientDependencyError");
const { membershipValidityPeriodId } = require("../application/membershipHashing");
const { decodeOwnGroupMembershipHistoryCursor } = require("../application/ownGroupMembershipHistoryCursor");
const {
  MembershipAccountRequiredError,
  MembershipCursorStaleError,
  MembershipDependencyNotConfiguredError,
  MembershipDependencyUnavailableError,
  MembershipError,
  MembershipIncompatibleStateError,
  MembershipInternalError,
  MembershipPersonIncompatibleError,
  MembershipPersonRequiredError,
} = require("../application/membershipErrors");
const { assertPeriodBoundary, hydrateMembership, InvalidMembershipStateError } = require("../domain/membership");
const { hydrateMembershipValidityPeriod, InvalidMembershipValidityPeriodError } = require("../domain/membershipValidityPeriod");

function isMissingIndexError(error) {
  return (error?.code === 9 || error?.code === "failed-precondition")
    && typeof error?.message === "string" && /(?:query requires an index|requires a COLLECTION_ASC index)/i.test(error.message);
}

function sameTimestamp(left, right) {
  return left && right && left.seconds === right.seconds && left.nanoseconds === right.nanoseconds;
}

function createFirestoreOwnGroupMembershipHistoryReader({ db, personCapability, contextCapability, onMetrics = () => {} }) {
  if (!db || !personCapability || !contextCapability) throw new TypeError("Own Membership history reader dependencies are required");

  function queryFor({ personId, pageSize, position }) {
    let query = db.collection("memberships")
      .where("personId", "==", personId)
      .orderBy("fechaIngreso", "desc")
      .orderBy(FieldPath.documentId(), "desc");
    if (position) {
      query = query.startAfter(
        new Timestamp(position.lastFechaIngreso.seconds, position.lastFechaIngreso.nanoseconds),
        position.membershipId
      );
    }
    return query.limit(pageSize + 1);
  }

  function hydrateRoot(snapshot, personId) {
    const membership = hydrateMembership(snapshot.id, snapshot.data());
    if (membership.personId !== personId) throw new InvalidMembershipStateError("Membership belongs to another Person");
    return membership;
  }

  function requireAuthority(result) {
    if (result.status === "account_missing" || result.status === "account_incompatible") throw new MembershipAccountRequiredError();
    if (result.status === "person_missing") throw new MembershipPersonRequiredError();
    if (result.status !== "ready") throw new MembershipPersonIncompatibleError();
    return result.personId;
  }

  async function requireAnchor(transaction, personId, position, metrics) {
    if (!position) return;
    metrics.anchor = 1;
    const snapshot = await transaction.get(db.collection("memberships").doc(position.membershipId));
    if (!snapshot.exists) throw new MembershipCursorStaleError();
    try {
      const membership = hydrateRoot(snapshot, personId);
      if (!sameTimestamp(membership.fechaIngreso, position.lastFechaIngreso)) throw new MembershipCursorStaleError();
    } catch (error) {
      if (error instanceof MembershipCursorStaleError) throw error;
      if (error instanceof InvalidMembershipStateError) throw new MembershipCursorStaleError({ cause: error });
      throw error;
    }
  }

  async function readPeriods(transaction, memberships, metrics) {
    const refs = new Map();
    for (const membership of memberships) {
      if (![3, 4].includes(membership.schemaVersion)) continue;
      const firstId = membershipValidityPeriodId(membership.membershipId, 1);
      const latestId = membershipValidityPeriodId(membership.membershipId, membership.periodCount);
      if (membership.latestPeriodId !== latestId) throw new InvalidMembershipStateError("Latest validity period id is inconsistent");
      for (const id of new Set([firstId, latestId])) {
        const ref = db.collection("memberships").doc(membership.membershipId).collection("validityPeriods").doc(id);
        refs.set(ref.path, ref);
      }
    }
    metrics.periods = refs.size;
    const snapshots = refs.size ? await transaction.getAll(...refs.values()) : [];
    const byPath = new Map(snapshots.map((snapshot) => [snapshot.ref.path, snapshot]));
    const counts = new Map();
    for (const membership of memberships) {
      if (![3, 4].includes(membership.schemaVersion)) { counts.set(membership.membershipId, 1); continue; }
      const firstId = membershipValidityPeriodId(membership.membershipId, 1);
      const latestId = membershipValidityPeriodId(membership.membershipId, membership.periodCount);
      const base = db.collection("memberships").doc(membership.membershipId).collection("validityPeriods");
      const firstSnapshot = byPath.get(base.doc(firstId).path);
      const latestSnapshot = byPath.get(base.doc(latestId).path);
      if (!firstSnapshot?.exists || !latestSnapshot?.exists) throw new InvalidMembershipStateError("Validity period boundary is absent");
      const first = hydrateMembershipValidityPeriod(firstSnapshot.id, firstSnapshot.data());
      const latest = latestId === firstId ? first : hydrateMembershipValidityPeriod(latestSnapshot.id, latestSnapshot.data());
      assertPeriodBoundary(membership, first, latest);
      if (!sameTimestamp(first.startedAt, membership.fechaIngreso)
        || (membership.estado === "finalizada" && !sameTimestamp(latest.endedAt, membership.fechaEgreso))) {
        throw new InvalidMembershipStateError("Validity period boundary timestamp is inconsistent");
      }
      counts.set(membership.membershipId, membership.periodCount);
    }
    return counts;
  }

  return Object.freeze({
    async listPage({ userId, pageSize, cursor }) {
      const metrics = { attempts: 0, authority: 0, anchor: 0, roots: 0, periods: 0, groups: 0, seasons: 0, lineage: 0, writes: 0, total: 0 };
      try {
        const result = await db.runTransaction(async (transaction) => {
          metrics.attempts += 1;
          const authority = await personCapability.resolve({ unitOfWork: transaction, userId });
          metrics.authority = authority.reads;
          const personId = requireAuthority(authority);
          const position = cursor ? decodeOwnGroupMembershipHistoryCursor(cursor, { uid: userId, personId }) : null;
          await requireAnchor(transaction, personId, position, metrics);
          const snapshot = await transaction.get(queryFor({ personId, pageSize, position }));
          metrics.roots = snapshot.docs.length;
          const roots = snapshot.docs.map((document) => hydrateRoot(document, personId));
          const delivered = roots.slice(0, pageSize);
          const periodCounts = await readPeriods(transaction, delivered, metrics);
          const groupIds = [...new Set(delivered.map((membership) => membership.groupId))];
          const seasonIds = [...new Set(delivered.map((membership) => membership.seasonId))];
          const contexts = await contextCapability.getMany({ unitOfWork: transaction, groupIds, seasonIds });
          metrics.groups = groupIds.length;
          metrics.seasons = seasonIds.length;
          const rows = delivered.map((membership) => {
            const group = contexts.groups.get(membership.groupId);
            const season = contexts.seasons.get(membership.seasonId);
            if (!group || !season || season.groupId !== membership.groupId
              || (membership.estado === "activa" && season.estado !== "abierta")) {
              throw new InvalidMembershipStateError("Membership external context is incompatible");
            }
            return Object.freeze({ membership, group, season, validityPeriodCount: periodCounts.get(membership.membershipId) });
          });
          const last = delivered.at(-1);
          return Object.freeze({
            personId,
            rows: Object.freeze(rows),
            hasMore: roots.length > pageSize,
            cursorAnchor: last ? Object.freeze({ lastFechaIngreso: last.fechaIngreso, membershipId: last.membershipId }) : null,
          });
        }, { readOnly: true });
        metrics.total = metrics.authority + metrics.anchor + metrics.roots + metrics.periods + metrics.groups + metrics.seasons;
        const ceiling = cursor ? 104 : 103;
        if (metrics.attempts !== 1 || metrics.total > ceiling) throw new MembershipInternalError();
        onMetrics(Object.freeze({ ...metrics }));
        return result;
      } catch (error) {
        metrics.total = metrics.authority + metrics.anchor + metrics.roots + metrics.periods + metrics.groups + metrics.seasons;
        onMetrics(Object.freeze({ ...metrics }));
        if (error instanceof MembershipError) throw error;
        if (error instanceof InvalidMembershipStateError || error instanceof InvalidMembershipValidityPeriodError
          || error instanceof InvalidGroupStateError || error instanceof InvalidSeasonStateError) {
          throw new MembershipIncompatibleStateError(undefined, { cause: error });
        }
        if (isMissingIndexError(error)) throw new MembershipDependencyNotConfiguredError({ cause: error });
        if (isTransientDependencyError(error)) throw new MembershipDependencyUnavailableError({ cause: error });
        throw new MembershipInternalError({ cause: error });
      }
    },
  });
}

module.exports = { createFirestoreOwnGroupMembershipHistoryReader, isMissingIndexError, sameTimestamp };
