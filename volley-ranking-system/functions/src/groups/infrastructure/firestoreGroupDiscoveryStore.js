"use strict";

const { FieldPath, Timestamp } = require("firebase-admin/firestore");
const {
  GroupDependencyUnavailableError,
  GroupError,
  GroupIncompatibleError,
  GroupInternalError,
  GroupNotAccessibleError,
} = require("../application/groupErrors");
const { decodeGroupDiscoveryCursor, encodeGroupDiscoveryCursor } = require("../application/groupDiscoveryCursor");
const { InvalidGroupPublicationStateError, hydrateGroupPublication } = require("../domain/groupPublication");
const { isTransactionConflict, isUnavailable } = require("./firestoreGroupCreationGuard");

const COLLECTION = "groupExplorationPublications";

function createFirestoreGroupDiscoveryStore({ db, groupCapability, membershipCapability, joinRequestCapability, now = () => Timestamp.now() }) {
  if (!db || !groupCapability || !membershipCapability || !joinRequestCapability || typeof now !== "function") {
    throw new TypeError("Group discovery store dependencies are required");
  }
  const reference = (groupId) => db.collection(COLLECTION).doc(groupId);

  async function requireOwnedActive(transaction, groupId, userId) {
    const context = await groupCapability.getOwnedContext({ unitOfWork: transaction, groupId, userId });
    if (context?.status === "incompatible") throw new GroupIncompatibleError();
    if (context?.status !== "owned") throw new GroupNotAccessibleError();
  }

  return Object.freeze({
    reference,

    async getOwnState({ userId, groupId }) {
      try {
        return await db.runTransaction(async (transaction) => {
          await requireOwnedActive(transaction, groupId, userId);
          const publication = hydrateGroupPublication(await transaction.get(reference(groupId)));
          return Object.freeze({
            publicationState: publication ? "published" : "invite_only",
            publishedAt: publication ? publication.publishedAt.toDate().toISOString() : null,
          });
        });
      } catch (error) {
        if (error instanceof GroupError) throw error;
        if (error instanceof InvalidGroupPublicationStateError) throw new GroupIncompatibleError({ cause: error });
        if (isUnavailable(error)) throw new GroupDependencyUnavailableError(undefined, { cause: error });
        throw new GroupInternalError({ cause: error });
      }
    },

    async setOwnState({ userId, groupId, published }) {
      try {
        return await db.runTransaction(async (transaction) => {
          await requireOwnedActive(transaction, groupId, userId);
          const ref = reference(groupId);
          const current = hydrateGroupPublication(await transaction.get(ref));
          if (published && current) return Object.freeze({
            outcome: "NO_CHANGES",
            publicationState: "published",
            publishedAt: current.publishedAt.toDate().toISOString(),
          });
          if (!published && !current) return Object.freeze({
            outcome: "NO_CHANGES",
            publicationState: "invite_only",
            publishedAt: null,
          });
          if (!published) {
            transaction.delete(ref);
            return Object.freeze({ outcome: "UPDATED", publicationState: "invite_only", publishedAt: null });
          }
          const publishedAt = now();
          transaction.create(ref, { groupId, publishedAt, publicationVersion: 1 });
          return Object.freeze({
            outcome: "UPDATED",
            publicationState: "published",
            publishedAt: publishedAt.toDate().toISOString(),
          });
        });
      } catch (error) {
        if (error instanceof GroupError) throw error;
        if (error instanceof InvalidGroupPublicationStateError) throw new GroupIncompatibleError({ cause: error });
        if (isUnavailable(error)) throw new GroupDependencyUnavailableError(undefined, { cause: error });
        if (isTransactionConflict(error)) throw new GroupDependencyUnavailableError("Publication changed concurrently", { cause: error });
        throw new GroupInternalError({ cause: error });
      }
    },

    async listExplorePage({ userId, personId, pageSize, cursor }) {
      try {
        return await db.runTransaction(async (transaction) => {
          const position = cursor ? decodeGroupDiscoveryCursor(cursor) : null;
          let query = db.collection(COLLECTION)
            .orderBy("publishedAt", "desc")
            .orderBy(FieldPath.documentId(), "desc");
          if (position) query = query.startAfter(new Timestamp(position.seconds, position.nanoseconds), position.lastGroupId);
          const snapshot = await transaction.get(query.limit(pageSize + 1));
          const publications = snapshot.docs.map(hydrateGroupPublication);
          const delivered = publications.slice(0, pageSize);
          const items = [];
          for (const publication of delivered) {
            const context = await groupCapability.getCandidateContext({
              unitOfWork: transaction,
              groupId: publication.groupId,
              userId,
            });
            if (context?.status !== "available" || context.isOwner) continue;
            if (personId) {
              const membership = await membershipCapability.getActiveContext({
                unitOfWork: transaction,
                personId,
                groupId: publication.groupId,
              });
              if (membership?.status === "incompatible") throw new GroupIncompatibleError();
              if (membership?.status !== "absent") continue;
            }
            const ownRequest = personId
              ? await joinRequestCapability.getOwnPendingContext({ unitOfWork: transaction, personId, groupId: publication.groupId })
              : { status: "unavailable" };
            if (ownRequest.status === "incompatible") throw new GroupIncompatibleError();
            items.push(Object.freeze({
              ...context.group,
              ownRequestStatus: ownRequest.status === "pending" ? "pending" : ownRequest.status === "absent" ? "none" : "unavailable",
            }));
          }
          const last = delivered.at(-1);
          return Object.freeze({
            items: Object.freeze(items),
            nextCursor: snapshot.size > pageSize && last
              ? encodeGroupDiscoveryCursor({
                seconds: last.publishedAt.seconds,
                nanoseconds: last.publishedAt.nanoseconds,
                lastGroupId: last.groupId,
              })
              : null,
          });
        });
      } catch (error) {
        if (error instanceof GroupError) throw error;
        if (error instanceof InvalidGroupPublicationStateError) throw new GroupIncompatibleError({ cause: error });
        if (isUnavailable(error)) throw new GroupDependencyUnavailableError(undefined, { cause: error });
        throw new GroupInternalError({ cause: error });
      }
    },
  });
}

module.exports = { COLLECTION, createFirestoreGroupDiscoveryStore };
