const IDEMPOTENCY_CONFLICT = "IDEMPOTENCY_CONFLICT";

function requireGroupId(groupId) {
  if (typeof groupId !== "string" || groupId.length === 0) {
    throw new TypeError("Membership intent requires a groupId");
  }
}

export function createMembershipIntent(initialGroupId, generateKey) {
  requireGroupId(initialGroupId);
  if (typeof generateKey !== "function") {
    throw new TypeError("Membership intent requires a key generator");
  }

  let groupId = initialGroupId;
  let key = null;
  let conflict = false;
  let confirmedAbsent = false;

  function snapshot() {
    return Object.freeze({ groupId, key, conflict, confirmedAbsent });
  }

  return Object.freeze({
    setGroupId(nextGroupId) {
      requireGroupId(nextGroupId);
      if (nextGroupId !== groupId) {
        groupId = nextGroupId;
        key = null;
        conflict = false;
        confirmedAbsent = false;
      }
      return snapshot();
    },

    keyForExplicitAttempt() {
      if (conflict) {
        throw new Error("Idempotency conflict requires an explicit new intent");
      }
      key ??= generateKey();
      return key;
    },

    recordFailure(reason) {
      if (reason === IDEMPOTENCY_CONFLICT) {
        conflict = true;
        confirmedAbsent = false;
      }
      return snapshot();
    },

    confirmMembershipAbsent() {
      if (!conflict) {
        throw new Error("Absence confirmation is only valid after an idempotency conflict");
      }
      confirmedAbsent = true;
      return snapshot();
    },

    beginNewIntent() {
      if (!conflict || !confirmedAbsent) {
        throw new Error("A new intent requires an explicit absence confirmation");
      }
      key = generateKey();
      conflict = false;
      confirmedAbsent = false;
      return key;
    },

    resolve() {
      key = null;
      conflict = false;
      confirmedAbsent = false;
      return snapshot();
    },

    snapshot,
  });
}
