"use strict";

const { GroupJoinRequestValidationError } = require("./groupJoinRequestErrors");
const ID_PATTERN = /^[^/]+$/u;
const KEY_PATTERN = /^[A-Za-z0-9._:-]{16,128}$/;

function plain(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
function closed(data, required, optional = []) {
  if (!plain(data)) throw new GroupJoinRequestValidationError();
  const allowed = new Set([...required, ...optional]);
  if (Object.keys(data).some((key) => !allowed.has(key)) || required.some((key) => !Object.prototype.hasOwnProperty.call(data, key))) {
    throw new GroupJoinRequestValidationError();
  }
}
function id(value) {
  if (typeof value !== "string" || !value || value.trim() !== value || Buffer.byteLength(value, "utf8") > 1500 || !ID_PATTERN.test(value)) {
    throw new GroupJoinRequestValidationError();
  }
  return value;
}
function validateGroup(data) { closed(data, ["groupId"]); return Object.freeze({ groupId: id(data.groupId) }); }
function validateCreate(data) {
  closed(data, ["groupId", "idempotencyKey"]);
  if (typeof data.idempotencyKey !== "string" || !KEY_PATTERN.test(data.idempotencyKey)) throw new GroupJoinRequestValidationError();
  return Object.freeze({ groupId: id(data.groupId), idempotencyKey: data.idempotencyKey });
}
function validateCancel(data) { closed(data, ["groupId", "requestId"]); return Object.freeze({ groupId: id(data.groupId), requestId: id(data.requestId) }); }
function validateList(data) {
  closed(data, ["groupId"], ["pageSize", "cursor"]);
  const pageSize = data.pageSize === undefined ? 20 : data.pageSize;
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 20) throw new GroupJoinRequestValidationError();
  if (data.cursor !== undefined && (typeof data.cursor !== "string" || !data.cursor || data.cursor.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(data.cursor))) {
    throw new GroupJoinRequestValidationError();
  }
  return Object.freeze({ groupId: id(data.groupId), pageSize, ...(data.cursor === undefined ? {} : { cursor: data.cursor }) });
}

module.exports = { validateCancelGroupJoinRequestPayload: validateCancel, validateCreateGroupJoinRequestPayload: validateCreate, validateGroupJoinRequestGroupPayload: validateGroup, validateListGroupJoinRequestsPayload: validateList };
