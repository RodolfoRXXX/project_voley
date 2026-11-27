"use strict";

const { FieldPath } = require("firebase-admin/firestore");
const {
  IdentityIncompatibleStateError,
  buildMirroredSingleDocuments,
  classifyAccountIdentity,
  isExactAccountIdentity,
  isExactAssignment,
} = require("../domain/accountIdentity");

function encodeCursor(accountId) {
  return Buffer.from(JSON.stringify({ accountId, version: 1 })).toString("base64url");
}

function decodeCursor(cursor) {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (typeof parsed.accountId !== "string" || !parsed.accountId || parsed.version !== 1) throw new Error();
    return parsed.accountId;
  } catch {
    throw new TypeError("cursor is invalid");
  }
}

function createFirestoreAccountIdentityStore({ db }) {
  if (!db) throw new TypeError("db is required");
  const accountIdentities = db.collection("accountIdentities");
  const assignments = db.collection("personIdentityAssignments");
  const users = db.collection("users");

  async function readAccountMaterialization({ transaction = null, accountId, legacyPersonId }) {
    const read = (reference) => transaction ? transaction.get(reference) : reference.get();
    const identityRef = accountIdentities.doc(accountId);
    const assignmentRef = typeof legacyPersonId === "string" && legacyPersonId
      ? assignments.doc(legacyPersonId)
      : null;
    const [identitySnapshot, assignmentSnapshot] = await Promise.all([
      read(identityRef),
      assignmentRef ? read(assignmentRef) : Promise.resolve(null),
    ]);
    const accountIdentity = identitySnapshot.exists ? identitySnapshot.data() : null;
    const assignment = assignmentSnapshot?.exists ? assignmentSnapshot.data() : null;
    const status = classifyAccountIdentity({ accountId, legacyPersonId, accountIdentity, assignment });
    return Object.freeze({ accountId, legacyPersonId: legacyPersonId || null, status, accountIdentity, assignment });
  }

  function assertCompatible(context) {
    if (context.status === "INCOMPATIBLE") throw new IdentityIncompatibleStateError();
    return context;
  }

  return Object.freeze({
    async ensureMirroredSingleIdentity(transaction, { accountId, personId, source, occurredAt }) {
      if (!transaction) throw new TypeError("transaction is required");
      const documents = buildMirroredSingleDocuments({ accountId, personId, source, occurredAt });
      const [identitySnapshot, assignmentSnapshot] = await Promise.all([
        transaction.get(accountIdentities.doc(accountId)),
        transaction.get(assignments.doc(personId)),
      ]);
      if (identitySnapshot.exists || assignmentSnapshot.exists) {
        if (identitySnapshot.exists
          && assignmentSnapshot.exists
          && isExactAccountIdentity(identitySnapshot.data(), accountId, personId)
          && isExactAssignment(assignmentSnapshot.data(), accountId, personId)) {
          return "EXISTING";
        }
        throw new IdentityIncompatibleStateError();
      }
      transaction.create(accountIdentities.doc(accountId), documents.accountIdentity);
      transaction.create(assignments.doc(personId), documents.assignment);
      return "CREATED";
    },

    async assertAccountCompatibleInTransaction(transaction, { accountId, legacyPersonId }) {
      return assertCompatible(await readAccountMaterialization({ transaction, accountId, legacyPersonId }));
    },

    async assertAccountCompatible({ accountId, legacyPersonId }) {
      return assertCompatible(await readAccountMaterialization({ accountId, legacyPersonId }));
    },

    async materializeLegacyIdentity({ accountId, occurredAt }) {
      if (typeof accountId !== "string" || !accountId || !occurredAt) {
        throw new TypeError("accountId and occurredAt are required");
      }
      try {
        return await db.runTransaction(async (transaction) => {
          const userSnapshot = await transaction.get(users.doc(accountId));
          const legacyPersonId = userSnapshot.exists ? userSnapshot.data().personaId : null;
          const context = assertCompatible(await readAccountMaterialization({ transaction, accountId, legacyPersonId }));
          if (context.status === "MISSING") return "MISSING";
          if (context.status === "MIRRORED_SINGLE") return "EXISTING";
          const documents = buildMirroredSingleDocuments({
            accountId,
            personId: legacyPersonId,
            source: "LEGACY_MATERIALIZATION",
            occurredAt,
          });
          transaction.create(accountIdentities.doc(accountId), documents.accountIdentity);
          transaction.create(assignments.doc(legacyPersonId), documents.assignment);
          return "CREATED";
        });
      } catch (error) {
        const code = String(error?.code || "").toUpperCase();
        if (error instanceof IdentityIncompatibleStateError || code === "6" || code === "ALREADY_EXISTS") {
          throw new IdentityIncompatibleStateError();
        }
        throw error;
      }
    },

    async getAccountIdentityContext({ unitOfWork = null, accountId }) {
      const userSnapshot = unitOfWork ? await unitOfWork.get(users.doc(accountId)) : await users.doc(accountId).get();
      const legacyPersonId = userSnapshot.exists ? userSnapshot.data().personaId : null;
      return assertCompatible(await readAccountMaterialization({ transaction: unitOfWork, accountId, legacyPersonId }));
    },

    async resolveAccountForAssignedPerson({ unitOfWork = null, personId }) {
      if (typeof personId !== "string" || !personId) throw new TypeError("personId is required");
      const read = (target) => unitOfWork ? unitOfWork.get(target) : target.get();
      const assignmentSnapshot = await read(assignments.doc(personId));
      if (assignmentSnapshot.exists) {
        const assignment = assignmentSnapshot.data();
        const accountId = assignment.accountId;
        if (typeof accountId !== "string" || !accountId) throw new IdentityIncompatibleStateError();
        const identitySnapshot = await read(accountIdentities.doc(accountId));
        if (!identitySnapshot.exists
          || !isExactAccountIdentity(identitySnapshot.data(), accountId, personId)
          || !isExactAssignment(assignment, accountId, personId)) {
          throw new IdentityIncompatibleStateError();
        }
        return Object.freeze({ accountId, personId, status: "MIRRORED_SINGLE" });
      }

      const legacyQuery = users.where("personaId", "==", personId).limit(2);
      const legacy = await read(legacyQuery);
      if (legacy.size > 1) throw new IdentityIncompatibleStateError();
      if (legacy.empty) return Object.freeze({ accountId: null, personId, status: "MISSING" });
      const accountId = legacy.docs[0].id;
      const identitySnapshot = await read(accountIdentities.doc(accountId));
      if (identitySnapshot.exists) throw new IdentityIncompatibleStateError();
      return Object.freeze({ accountId, personId, status: "LEGACY_SINGLE" });
    },

    async inspectIdentityMaterialization({ pageSize = 100, cursor = null } = {}) {
      if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new TypeError("pageSize must be between 1 and 100");
      let query = users.orderBy(FieldPath.documentId()).limit(pageSize + 1);
      if (cursor) query = query.startAfter(decodeCursor(cursor));
      const snapshot = await query.get();
      const inspected = snapshot.docs.slice(0, pageSize);
      const items = await Promise.all(inspected.map(async (userSnapshot) => {
        const legacyPersonId = userSnapshot.data().personaId;
        const context = await readAccountMaterialization({ accountId: userSnapshot.id, legacyPersonId });
        return Object.freeze({ accountId: userSnapshot.id, personId: legacyPersonId || null, status: context.status });
      }));
      const hasMore = snapshot.size > pageSize;
      return Object.freeze({
        items: Object.freeze(items),
        ...(hasMore ? { nextCursor: encodeCursor(inspected.at(-1).id) } : {}),
        measurement: Object.freeze({ usersRead: snapshot.size, verificationReadBudget: items.length * 2, pageSize }),
      });
    },
  });
}

module.exports = { createFirestoreAccountIdentityStore };
