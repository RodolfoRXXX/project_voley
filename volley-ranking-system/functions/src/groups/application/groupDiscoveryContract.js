"use strict";

const { GroupValidationError } = require("./groupErrors");

function plain(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
function closed(data, required, optional = []) {
  if (!plain(data)) throw new GroupValidationError();
  const allowed = new Set([...required, ...optional]);
  if (Object.keys(data).some((key) => !allowed.has(key))
    || required.some((key) => !Object.prototype.hasOwnProperty.call(data, key))) throw new GroupValidationError();
}
function groupId(value) {
  if (typeof value !== "string" || !value || value !== value.trim() || value.includes("/")
    || Buffer.byteLength(value, "utf8") > 1500) throw new GroupValidationError("Group id is invalid");
  return value;
}
function validateGetOwnGroupPublicationPayload(data) {
  closed(data, ["groupId"]);
  return Object.freeze({ groupId: groupId(data.groupId) });
}
function validateSetOwnGroupPublicationPayload(data) {
  closed(data, ["groupId", "published"]);
  if (typeof data.published !== "boolean") throw new GroupValidationError("Publication state is invalid");
  return Object.freeze({ groupId: groupId(data.groupId), published: data.published });
}
function validateListExploreGroupsPayload(data) {
  if (data == null) data = {};
  closed(data, [], ["pageSize", "cursor"]);
  const pageSize = data.pageSize === undefined ? 12 : data.pageSize;
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 20) throw new GroupValidationError("Page size is invalid");
  if (data.cursor !== undefined && (typeof data.cursor !== "string" || !data.cursor || data.cursor.length > 2048
    || !/^[A-Za-z0-9_-]+$/.test(data.cursor))) throw new GroupValidationError("Cursor is invalid");
  return Object.freeze({ pageSize, ...(data.cursor === undefined ? {} : { cursor: data.cursor }) });
}

module.exports = {
  validateGetOwnGroupPublicationPayload,
  validateListExploreGroupsPayload,
  validateSetOwnGroupPublicationPayload,
};
