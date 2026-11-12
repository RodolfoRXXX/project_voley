"use strict";

const crypto = require("node:crypto");
const { FieldPath, Timestamp } = require("firebase-admin/firestore");
const { InvalidMembershipStateError } = require("../domain/membership");
const {
  MembershipDependencyUnavailableError,
  MembershipError,
  MembershipGroupNotAccessibleError,
  MembershipIncompatibleStateError,
  MembershipInternalError,
} = require("../application/membershipErrors");
const { isTransientDependencyError } = require("../../shared/application/transientDependencyError");
const { requireCanonicalActiveMembership } = require("./firestoreActiveMembershipIntegrity");

const SUMMARY_VERSION = 1;
const CONTRIBUTION_VERSION = 1;
const PAGE_SIZE = 50;

function digest(domain, values) {
  const hash = crypto.createHash("sha256");
  hash.update(domain);
  for (const value of values) hash.update(`\0${Buffer.byteLength(String(value), "utf8")}:${value}`);
  return hash.digest("hex");
}

function activeRosterSummaryId(groupId, seasonId) {
  return digest("sportexa:IUX-06C2-P01:active-roster-summary:v1", [groupId, seasonId]);
}

function activeRosterContributionId(groupId, seasonId, membershipId) {
  return digest("sportexa:IUX-06C2-P01:active-roster-contribution:v1", [groupId, seasonId, membershipId]);
}

function validTimestamp(value) {
  return value && typeof value.toDate === "function" && !Number.isNaN(value.toDate().getTime());
}

function hydrateSummary(snapshot, { groupId, seasonId }) {
  if (!snapshot.exists) return null;
  const data = snapshot.data();
  const expected = ["activeMembershipCount", "generation", "groupId", "schemaVersion", "seasonId", "status", "updatedAt"].sort();
  const keys = data && typeof data === "object" && !Array.isArray(data) ? Object.keys(data).sort() : [];
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])
    || snapshot.id !== activeRosterSummaryId(groupId, seasonId) || data.groupId !== groupId || data.seasonId !== seasonId
    || !["BUILDING", "READY", "INCOMPATIBLE"].includes(data.status)
    || !Number.isSafeInteger(data.activeMembershipCount) || data.activeMembershipCount < 0
    || !Number.isSafeInteger(data.generation) || data.generation < 1
    || !validTimestamp(data.updatedAt) || data.schemaVersion !== SUMMARY_VERSION) {
    throw new MembershipIncompatibleStateError("Active roster summary is incompatible");
  }
  return Object.freeze(data);
}

function hydrateContribution(snapshot, { groupId, seasonId, membershipId }) {
  if (!snapshot.exists) return null;
  const data = snapshot.data();
  const expected = ["activationOrdinal", "generation", "groupId", "membershipId", "personId", "schemaVersion", "seasonId", "updatedAt"].sort();
  const keys = data && typeof data === "object" && !Array.isArray(data) ? Object.keys(data).sort() : [];
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])
    || snapshot.id !== activeRosterContributionId(groupId, seasonId, membershipId)
    || data.groupId !== groupId || data.seasonId !== seasonId || data.membershipId !== membershipId
    || typeof data.personId !== "string" || !data.personId || data.personId.includes("/")
    || !Number.isSafeInteger(data.activationOrdinal) || data.activationOrdinal < 1
    || !Number.isSafeInteger(data.generation) || data.generation < 1
    || !validTimestamp(data.updatedAt) || data.schemaVersion !== CONTRIBUTION_VERSION) {
    throw new MembershipIncompatibleStateError("Active roster contribution is incompatible");
  }
  return Object.freeze(data);
}

function createFirestoreActiveRosterCounter({ db, membershipRepository, groupCapability, now = () => Timestamp.now() }) {
  if (!db || !membershipRepository || !groupCapability || typeof now !== "function") {
    throw new TypeError("Active roster counter dependencies are required");
  }

  function summaryReference(groupId, seasonId) {
    return db.collection("activeRosterSummaries").doc(activeRosterSummaryId(groupId, seasonId));
  }
  function contributionReference(groupId, seasonId, membershipId) {
    return db.collection("activeRosterContributions").doc(activeRosterContributionId(groupId, seasonId, membershipId));
  }
  function summaryData({ groupId, seasonId, status, activeMembershipCount, generation, updatedAt }) {
    return { groupId, seasonId, status, activeMembershipCount, generation, updatedAt, schemaVersion: SUMMARY_VERSION };
  }

  async function prepareActivation(transaction, membership, activationOrdinal) {
    const { groupId, seasonId, membershipId, personId } = membership;
    const summaryRef = summaryReference(groupId, seasonId);
    const contributionRef = contributionReference(groupId, seasonId, membershipId);
    const summary = hydrateSummary(await transaction.get(summaryRef), { groupId, seasonId });
    const contribution = hydrateContribution(await transaction.get(contributionRef), { groupId, seasonId, membershipId });
    const timestamp = now();
    const current = summary || summaryData({ groupId, seasonId, status: "BUILDING", activeMembershipCount: 0, generation: 1, updatedAt: timestamp });
    const alreadyCounted = contribution?.generation === current.generation;
    const next = summaryData({ ...current, activeMembershipCount: current.activeMembershipCount + (alreadyCounted ? 0 : 1), updatedAt: timestamp });
    const contributionData = { groupId, seasonId, membershipId, personId, activationOrdinal, generation: current.generation, updatedAt: timestamp, schemaVersion: CONTRIBUTION_VERSION };
    return Object.freeze({
      counted: !alreadyCounted,
      commit() {
        transaction.set(summaryRef, next);
        transaction.set(contributionRef, contributionData);
      },
    });
  }

  async function prepareFinalization(transaction, membership) {
    const { groupId, seasonId, membershipId } = membership;
    const summaryRef = summaryReference(groupId, seasonId);
    const contributionRef = contributionReference(groupId, seasonId, membershipId);
    const summary = hydrateSummary(await transaction.get(summaryRef), { groupId, seasonId });
    if (!summary) return Object.freeze({ counted: false, commit() {} });
    const contribution = hydrateContribution(await transaction.get(contributionRef), { groupId, seasonId, membershipId });
    const counted = contribution?.generation === summary.generation;
    if (counted && summary.activeMembershipCount < 1) throw new MembershipIncompatibleStateError("Active roster counter would become negative");
    const next = counted ? summaryData({ ...summary, activeMembershipCount: summary.activeMembershipCount - 1, updatedAt: now() }) : summary;
    return Object.freeze({
      counted,
      commit() {
        if (!counted) return;
        transaction.set(summaryRef, next);
        transaction.delete(contributionRef);
      },
    });
  }

  async function ownedScope(transaction, userId, groupId) {
    const context = await groupCapability.getOwnedOpenSeasonContext({ unitOfWork: transaction, groupId, userId });
    if (context?.status === "not_accessible") throw new MembershipGroupNotAccessibleError();
    if (context?.status === "incompatible") throw new MembershipIncompatibleStateError("Group roster context is incompatible");
    if (context?.status === "no_open_season") return Object.freeze({ status: "NO_OPEN_SEASON" });
    if (context?.status !== "open_season") throw new MembershipIncompatibleStateError("Group roster context is invalid");
    return Object.freeze({ status: "OPEN_SEASON", groupId, seasonId: context.seasonId });
  }

  async function begin({ userId, groupId, force }) {
    return db.runTransaction(async (transaction) => {
      const scope = await ownedScope(transaction, userId, groupId);
      if (scope.status === "NO_OPEN_SEASON") return scope;
      const ref = summaryReference(groupId, scope.seasonId);
      const current = hydrateSummary(await transaction.get(ref), scope);
      if (!force && current?.status === "READY") return Object.freeze({ ...scope, status: "READY", total: current.activeMembershipCount, generation: current.generation });
      if (!force && current?.status === "INCOMPATIBLE") return Object.freeze({ ...scope, status: "INCOMPATIBLE", generation: current.generation });
      const generation = current?.status === "BUILDING" && !force ? current.generation : (current?.generation || 0) + 1;
      if (current?.status !== "BUILDING" || force) {
        transaction.set(ref, summaryData({ groupId, seasonId: scope.seasonId, status: "BUILDING", activeMembershipCount: 0, generation, updatedAt: now() }));
      }
      return Object.freeze({ ...scope, status: "BUILDING", generation });
    });
  }

  async function contributeCandidate({ groupId, seasonId, generation, membershipId }) {
    return db.runTransaction(async (transaction) => {
      const summaryRef = summaryReference(groupId, seasonId);
      const summary = hydrateSummary(await transaction.get(summaryRef), { groupId, seasonId });
      if (!summary || summary.generation !== generation || summary.status !== "BUILDING") return;
      const membership = await membershipRepository.getById(membershipId, transaction);
      if (!membership || membership.estado !== "activa" || membership.groupId !== groupId || membership.seasonId !== seasonId) return;
      const canonical = await requireCanonicalActiveMembership({ db, transaction, membershipRepository, candidate: membership, groupId, seasonId });
      const plan = await prepareActivation(transaction, canonical, canonical.periodCount || 1);
      plan.commit();
    });
  }

  async function scan({ groupId, seasonId, generation }) {
    let lastId = null;
    do {
      let query = db.collection("memberships")
        .where("groupId", "==", groupId).where("seasonId", "==", seasonId).where("estado", "==", "activa")
        .orderBy(FieldPath.documentId(), "asc").limit(PAGE_SIZE);
      if (lastId) query = query.startAfter(lastId);
      const page = await query.get();
      for (const document of page.docs) {
        await contributeCandidate({ groupId, seasonId, generation, membershipId: document.id });
      }
      lastId = page.size === PAGE_SIZE ? page.docs.at(-1).id : null;
    } while (lastId);
  }

  async function complete({ userId, groupId, seasonId, generation }) {
    return db.runTransaction(async (transaction) => {
      const scope = await ownedScope(transaction, userId, groupId);
      if (scope.status !== "OPEN_SEASON" || scope.seasonId !== seasonId) return Object.freeze({ status: "UNAVAILABLE" });
      const ref = summaryReference(groupId, seasonId);
      const summary = hydrateSummary(await transaction.get(ref), { groupId, seasonId });
      if (!summary || summary.generation !== generation || summary.status !== "BUILDING") return Object.freeze({ status: "UNAVAILABLE" });
      const ready = summaryData({ ...summary, status: "READY", updatedAt: now() });
      transaction.set(ref, ready);
      return Object.freeze({ status: "READY", total: ready.activeMembershipCount, seasonId });
    });
  }

  async function markIncompatible({ groupId, seasonId, generation }) {
    await db.runTransaction(async (transaction) => {
      const ref = summaryReference(groupId, seasonId);
      const summary = hydrateSummary(await transaction.get(ref), { groupId, seasonId });
      if (!summary || summary.generation !== generation) return;
      transaction.set(ref, summaryData({ ...summary, status: "INCOMPATIBLE", updatedAt: now() }));
    });
  }

  async function readOrBuild({ userId, groupId, force = false }) {
    try {
      const started = await begin({ userId, groupId, force });
      if (started.status === "NO_OPEN_SEASON") return Object.freeze({ status: "NO_OPEN_SEASON", total: 0 });
      if (started.status === "INCOMPATIBLE") return Object.freeze({ status: "UNAVAILABLE" });
      if (started.status === "READY") return Object.freeze({ status: "READY", total: started.total, seasonId: started.seasonId });
      try {
        await scan(started);
        return await complete({ userId, ...started });
      } catch (error) {
        if (error instanceof MembershipIncompatibleStateError || error instanceof InvalidMembershipStateError || error?.name === "InvalidMembershipValidityPeriodError") {
          await markIncompatible(started);
          return Object.freeze({ status: "UNAVAILABLE" });
        }
        throw error;
      }
    } catch (error) {
      if (error instanceof MembershipError) throw error;
      if (isTransientDependencyError(error)) throw new MembershipDependencyUnavailableError({ cause: error });
      throw new MembershipInternalError({ cause: error });
    }
  }

  return Object.freeze({
    contributionReference,
    hydrateContribution,
    hydrateSummary,
    prepareActivation,
    prepareFinalization,
    readOrBuild,
    summaryReference,
  });
}

module.exports = {
  activeRosterContributionId,
  activeRosterSummaryId,
  createFirestoreActiveRosterCounter,
  hydrateContribution,
  hydrateSummary,
};
