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
  MembershipRosterContextChangedError,
} = require("../application/membershipErrors");
const { isTransientDependencyError } = require("../../shared/application/transientDependencyError");
const { requireCanonicalActiveMembership } = require("./firestoreActiveMembershipIntegrity");

const SUMMARY_VERSION = 1;
const ENTRY_VERSION = 1;
const BUILD_PAGE_SIZE = 50;

function digest(domain, values) {
  const hash = crypto.createHash("sha256");
  hash.update(domain);
  for (const value of values) hash.update(`\0${Buffer.byteLength(String(value), "utf8")}:${value}`);
  return hash.digest("hex");
}

function searchProjectionSummaryId(groupId, seasonId) {
  return digest("sportexa:IUX-06C2-P02:active-roster-search-summary:v1", [groupId, seasonId]);
}

function searchProjectionEntryId(groupId, seasonId, membershipId) {
  return digest("sportexa:IUX-06C2-P02:active-roster-search-entry:v1", [groupId, seasonId, membershipId]);
}

function normalizeSearchText(value) {
  return String(value || "").normalize("NFD").replace(/\p{M}+/gu, "").toLocaleLowerCase("es-AR");
}

function searchWords(firstName, lastName) {
  return normalizeSearchText(`${firstName} ${lastName}`).split(/[^\p{L}\p{N}]+/gu).filter(Boolean);
}

function searchPrefixes(firstName, lastName) {
  const prefixes = new Set();
  for (const word of searchWords(firstName, lastName)) {
    const characters = Array.from(word);
    for (let size = 3; size <= characters.length; size += 1) prefixes.add(characters.slice(0, size).join(""));
  }
  return [...prefixes].sort();
}

function normalizeSearchQuery(value) {
  const words = searchWords(value, "");
  return words.length === 1 && Array.from(words[0]).length >= 3 ? words[0] : null;
}

function validTimestamp(value) {
  return value && typeof value.toDate === "function" && !Number.isNaN(value.toDate().getTime());
}

function hydrateSummary(snapshot, { groupId, seasonId }) {
  if (!snapshot.exists) return null;
  const data = snapshot.data();
  const expected = ["generation", "groupId", "schemaVersion", "seasonId", "status", "updatedAt"].sort();
  const keys = data && typeof data === "object" && !Array.isArray(data) ? Object.keys(data).sort() : [];
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])
    || snapshot.id !== searchProjectionSummaryId(groupId, seasonId) || data.groupId !== groupId || data.seasonId !== seasonId
    || !["BUILDING", "READY", "INCOMPATIBLE"].includes(data.status)
    || !Number.isSafeInteger(data.generation) || data.generation < 1
    || !validTimestamp(data.updatedAt) || data.schemaVersion !== SUMMARY_VERSION) {
    throw new MembershipIncompatibleStateError("Active roster search summary is incompatible");
  }
  return Object.freeze(data);
}

function createFirestoreActiveRosterSearchProjection({ db, membershipRepository, groupCapability, personCapability, now = () => Timestamp.now() }) {
  if (!db || !membershipRepository || !groupCapability || !personCapability || typeof now !== "function") {
    throw new TypeError("Active roster search projection dependencies are required");
  }

  const summaryReference = (groupId, seasonId) => db.collection("activeRosterSearchSummaries").doc(searchProjectionSummaryId(groupId, seasonId));
  const entryReference = (groupId, seasonId, membershipId) => db.collection("activeRosterSearchEntries").doc(searchProjectionEntryId(groupId, seasonId, membershipId));
  const summaryData = ({ groupId, seasonId, status, generation, updatedAt }) => ({ groupId, seasonId, status, generation, updatedAt, schemaVersion: SUMMARY_VERSION });

  async function entryData(transaction, membership, activationOrdinal, generation) {
    const person = await personCapability.getPresentation({ unitOfWork: transaction, personId: membership.personId });
    if (person?.status !== "available") throw new MembershipIncompatibleStateError("Person is unavailable for roster search projection");
    return {
      groupId: membership.groupId,
      seasonId: membership.seasonId,
      membershipId: membership.membershipId,
      personId: membership.personId,
      activationOrdinal,
      firstName: person.firstName,
      lastName: person.lastName,
      searchPrefixes: searchPrefixes(person.firstName, person.lastName),
      sortName: normalizeSearchText(`${person.firstName} ${person.lastName}`).trim(),
      generation,
      updatedAt: now(),
      schemaVersion: ENTRY_VERSION,
    };
  }

  async function prepareActivation(transaction, membership, activationOrdinal) {
    const ref = summaryReference(membership.groupId, membership.seasonId);
    const current = hydrateSummary(await transaction.get(ref), membership);
    const summary = current || summaryData({ groupId: membership.groupId, seasonId: membership.seasonId, status: "BUILDING", generation: 1, updatedAt: now() });
    const entry = await entryData(transaction, membership, activationOrdinal, summary.generation);
    return Object.freeze({
      commit() {
        if (!current) transaction.set(ref, summary);
        transaction.set(entryReference(membership.groupId, membership.seasonId, membership.membershipId), entry);
      },
    });
  }

  function prepareFinalization(transaction, membership) {
    return Object.freeze({ commit() { transaction.delete(entryReference(membership.groupId, membership.seasonId, membership.membershipId)); } });
  }

  async function ownedScope(transaction, userId, groupId) {
    const context = await groupCapability.getOwnedOpenSeasonContext({ unitOfWork: transaction, groupId, userId });
    if (context?.status === "not_accessible") throw new MembershipGroupNotAccessibleError();
    if (context?.status === "incompatible") throw new MembershipIncompatibleStateError("Group roster search context is incompatible");
    if (context?.status === "no_open_season") return Object.freeze({ status: "NO_OPEN_SEASON" });
    if (context?.status !== "open_season") throw new MembershipIncompatibleStateError("Group roster search context is invalid");
    return Object.freeze({ status: "OPEN_SEASON", groupId, seasonId: context.seasonId });
  }

  async function begin({ userId, groupId }) {
    return db.runTransaction(async (transaction) => {
      const scope = await ownedScope(transaction, userId, groupId);
      if (scope.status === "NO_OPEN_SEASON") return scope;
      const ref = summaryReference(groupId, scope.seasonId);
      const current = hydrateSummary(await transaction.get(ref), scope);
      if (current?.status === "READY") return Object.freeze({ ...scope, status: "READY", generation: current.generation });
      if (current?.status === "INCOMPATIBLE") return Object.freeze({ ...scope, status: "INCOMPATIBLE", generation: current.generation });
      const generation = current?.generation || 1;
      if (!current) transaction.set(ref, summaryData({ ...scope, status: "BUILDING", generation, updatedAt: now() }));
      return Object.freeze({ ...scope, status: "BUILDING", generation });
    });
  }

  async function contributeCandidate({ groupId, seasonId, generation, membershipId }) {
    await db.runTransaction(async (transaction) => {
      const summary = hydrateSummary(await transaction.get(summaryReference(groupId, seasonId)), { groupId, seasonId });
      if (!summary || summary.status !== "BUILDING" || summary.generation !== generation) return;
      const membership = await membershipRepository.getById(membershipId, transaction);
      const entryRef = entryReference(groupId, seasonId, membershipId);
      if (!membership || membership.estado !== "activa" || membership.groupId !== groupId || membership.seasonId !== seasonId) {
        transaction.delete(entryRef);
        return;
      }
      const canonical = await requireCanonicalActiveMembership({ db, transaction, membershipRepository, candidate: membership, groupId, seasonId });
      transaction.set(entryRef, await entryData(transaction, canonical, canonical.periodCount || 1, generation));
    });
  }

  async function scan(scope) {
    let lastId = null;
    do {
      let query = db.collection("memberships").where("groupId", "==", scope.groupId).where("seasonId", "==", scope.seasonId)
        .where("estado", "==", "activa").orderBy(FieldPath.documentId(), "asc").limit(BUILD_PAGE_SIZE);
      if (lastId) query = query.startAfter(lastId);
      const page = await query.get();
      for (const document of page.docs) await contributeCandidate({ ...scope, membershipId: document.id });
      lastId = page.size === BUILD_PAGE_SIZE ? page.docs.at(-1).id : null;
    } while (lastId);
  }

  async function complete(scope) {
    return db.runTransaction(async (transaction) => {
      const authorized = await ownedScope(transaction, scope.userId, scope.groupId);
      if (authorized.status !== "OPEN_SEASON" || authorized.seasonId !== scope.seasonId) return Object.freeze({ status: "UNAVAILABLE" });
      const ref = summaryReference(scope.groupId, scope.seasonId);
      const summary = hydrateSummary(await transaction.get(ref), scope);
      if (!summary || summary.status !== "BUILDING" || summary.generation !== scope.generation) return Object.freeze({ status: "UNAVAILABLE" });
      transaction.set(ref, summaryData({ ...summary, status: "READY", updatedAt: now() }));
      return Object.freeze({ ...scope, status: "READY" });
    });
  }

  async function markIncompatible(scope) {
    await db.runTransaction(async (transaction) => {
      const ref = summaryReference(scope.groupId, scope.seasonId);
      const summary = hydrateSummary(await transaction.get(ref), scope);
      if (summary?.generation === scope.generation) transaction.set(ref, summaryData({ ...summary, status: "INCOMPATIBLE", updatedAt: now() }));
    });
  }

  async function ensureReady({ userId, groupId }) {
    const started = await begin({ userId, groupId });
    if (["READY", "NO_OPEN_SEASON", "INCOMPATIBLE"].includes(started.status)) return started;
    const scope = { ...started, userId };
    try {
      await scan(scope);
      return await complete(scope);
    } catch (error) {
      if (error instanceof MembershipIncompatibleStateError || error instanceof InvalidMembershipStateError || error?.name === "InvalidMembershipValidityPeriodError") {
        await markIncompatible(scope);
        return Object.freeze({ status: "INCOMPATIBLE" });
      }
      throw error;
    }
  }

  async function searchPage({ userId, groupId, query, pageSize, position }) {
    try {
      const ready = await ensureReady({ userId, groupId });
      if (ready.status === "NO_OPEN_SEASON") return Object.freeze({ scopeStatus: "NO_OPEN_SEASON", projectionStatus: "READY", rows: Object.freeze([]), hasLookahead: false, cursorAnchor: null });
      if (ready.status !== "READY") return Object.freeze({ scopeStatus: "OPEN_SEASON", projectionStatus: "UNAVAILABLE", rows: Object.freeze([]), hasLookahead: false, cursorAnchor: null });
      if (position && position.seasonId !== ready.seasonId) throw new MembershipRosterContextChangedError();
      return await db.runTransaction(async (transaction) => {
        const authorized = await ownedScope(transaction, userId, groupId);
        if (authorized.status !== "OPEN_SEASON" || authorized.seasonId !== ready.seasonId) throw new MembershipRosterContextChangedError();
        const ownerPerson = await personCapability.getOwnerPersonReference({ unitOfWork: transaction, userId });
        let value = db.collection("activeRosterSearchEntries")
          .where("groupId", "==", groupId).where("seasonId", "==", ready.seasonId).where("generation", "==", ready.generation)
          .where("searchPrefixes", "array-contains", query).orderBy("sortName", "asc").orderBy(FieldPath.documentId(), "asc");
        if (position) value = value.startAfter(position.sortName, position.lastEntryId);
        const snapshot = await transaction.get(value.limit(pageSize + 1));
        const included = snapshot.docs.slice(0, pageSize); const rows = [];
        for (const document of included) {
          const data = document.data();
          const expectedKeys = ["activationOrdinal", "firstName", "generation", "groupId", "lastName", "membershipId", "personId", "schemaVersion", "searchPrefixes", "seasonId", "sortName", "updatedAt"].sort();
          const actualKeys = data && typeof data === "object" && !Array.isArray(data) ? Object.keys(data).sort() : [];
          if (actualKeys.length !== expectedKeys.length || actualKeys.some((key, index) => key !== expectedKeys[index])
            || data.groupId !== groupId || data.seasonId !== ready.seasonId || data.generation !== ready.generation
            || data.schemaVersion !== ENTRY_VERSION || !Array.isArray(data.searchPrefixes) || !data.searchPrefixes.includes(query)
            || !validTimestamp(data.updatedAt)) throw new MembershipIncompatibleStateError("Roster search entry is incompatible");
          const membership = await membershipRepository.getById(data.membershipId, transaction);
          if (!membership) throw new MembershipIncompatibleStateError("Roster search entry has no Membership");
          const canonical = await requireCanonicalActiveMembership({ db, transaction, membershipRepository, candidate: membership, groupId, seasonId: ready.seasonId });
          const person = await personCapability.getPresentation({ unitOfWork: transaction, personId: canonical.personId });
          if (person?.status !== "available") throw new MembershipIncompatibleStateError("Roster search Person is unavailable");
          if (data.personId !== canonical.personId || data.firstName !== person.firstName || data.lastName !== person.lastName
            || data.sortName !== normalizeSearchText(`${person.firstName} ${person.lastName}`).trim()
            || !searchPrefixes(person.firstName, person.lastName).includes(query)) throw new MembershipIncompatibleStateError("Roster search entry is stale");
          rows.push(Object.freeze({ membership: canonical, person, isOwner: ownerPerson?.status === "found" && ownerPerson.personId === canonical.personId }));
        }
        const last = included.at(-1);
        return Object.freeze({ scopeStatus: "OPEN_SEASON", projectionStatus: "READY", seasonId: ready.seasonId, rows: Object.freeze(rows), hasLookahead: snapshot.size > pageSize, cursorAnchor: last ? Object.freeze({ sortName: last.get("sortName"), lastEntryId: last.id }) : null });
      });
    } catch (error) {
      if (error instanceof MembershipError) throw error;
      if (isTransientDependencyError(error)) throw new MembershipDependencyUnavailableError({ cause: error });
      throw new MembershipInternalError({ cause: error });
    }
  }

  return Object.freeze({ prepareActivation, prepareFinalization, searchPage, summaryReference, entryReference });
}

module.exports = {
  createFirestoreActiveRosterSearchProjection,
  normalizeSearchQuery,
  normalizeSearchText,
  searchPrefixes,
  searchProjectionEntryId,
  searchProjectionSummaryId,
};
