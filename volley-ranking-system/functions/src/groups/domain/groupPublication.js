"use strict";

const PUBLICATION_FIELDS = Object.freeze(["groupId", "publishedAt", "publicationVersion"]);
const PUBLICATION_VERSION = 1;

class InvalidGroupPublicationStateError extends Error {
  constructor(message) {
    super(message);
    this.name = "InvalidGroupPublicationStateError";
  }
}

function validId(value) {
  return typeof value === "string" && value && value === value.trim() && !value.includes("/")
    && Buffer.byteLength(value, "utf8") <= 1500;
}

function hydrateGroupPublication(snapshot) {
  if (!snapshot.exists) return null;
  const data = snapshot.data();
  const keys = data && typeof data === "object" && !Array.isArray(data) ? Object.keys(data).sort() : [];
  const expected = [...PUBLICATION_FIELDS].sort();
  const valid = keys.length === expected.length
    && !keys.some((key, index) => key !== expected[index])
    && validId(data.groupId)
    && snapshot.id === data.groupId
    && data.publishedAt && typeof data.publishedAt.toDate === "function"
    && !Number.isNaN(data.publishedAt.toDate().getTime())
    && data.publicationVersion === PUBLICATION_VERSION;
  if (!valid) throw new InvalidGroupPublicationStateError("Group publication is invalid");
  return Object.freeze({ groupId: data.groupId, publishedAt: data.publishedAt });
}

module.exports = {
  InvalidGroupPublicationStateError,
  PUBLICATION_FIELDS,
  PUBLICATION_VERSION,
  hydrateGroupPublication,
};
