"use strict";

class GroupInvitationValidationError extends Error { constructor(message = "Invalid group invitation request") { super(message); this.name = "GroupInvitationValidationError"; this.reason = "VALIDATION_FAILED"; } }
function object(value) { if (!value || typeof value !== "object" || Array.isArray(value)) throw new GroupInvitationValidationError(); return value; }
function exact(value, required, optional = []) { object(value); const allowed = new Set([...required, ...optional]); if (required.some((key) => !Object.prototype.hasOwnProperty.call(value, key)) || Object.keys(value).some((key) => !allowed.has(key))) throw new GroupInvitationValidationError(); }
function id(value) { if (typeof value !== "string" || !value || value !== value.trim() || value.includes("/") || Buffer.byteLength(value) > 1500) throw new GroupInvitationValidationError(); return value; }
function key(value) { if (typeof value !== "string" || value.length < 16 || value.length > 128 || !/^[A-Za-z0-9_-]+$/.test(value)) throw new GroupInvitationValidationError("Invalid idempotency key"); return value; }
function pageSize(value) { if (value === undefined) return 10; if (!Number.isSafeInteger(value) || value < 1 || value > 10) throw new GroupInvitationValidationError("Page size must be between 1 and 10"); return value; }
function ownerInvitationPageSize(value) { if (value === undefined) return 5; if (!Number.isSafeInteger(value) || value < 1 || value > 5) throw new GroupInvitationValidationError("Owner invitation page size must be between 1 and 5"); return value; }
function cursor(value) { if (value === undefined) return undefined; if (typeof value !== "string" || value.length < 8 || value.length > 4096) throw new GroupInvitationValidationError("Invalid cursor"); return value; }
function query(value) { if (typeof value !== "string") throw new GroupInvitationValidationError("Invalid query"); const normalized = value.normalize("NFD").replace(/\p{M}/gu, "").trim().replace(/\s+/gu, " ").toLocaleLowerCase("es-AR"); const length = Array.from(normalized).length; if (length < 3 || length > 40) throw new GroupInvitationValidationError("Search requires 3 to 40 characters"); return normalized; }
function empty(value) { exact(value, []); return Object.freeze({}); }
function enabled(value) { exact(value, ["enabled"]); if (typeof value.enabled !== "boolean") throw new GroupInvitationValidationError(); return Object.freeze({ enabled: value.enabled }); }
function search(value) { exact(value, ["groupId", "query"], ["pageSize", "cursor"]); return Object.freeze({ groupId: id(value.groupId), query: query(value.query), pageSize: pageSize(value.pageSize), cursor: cursor(value.cursor) }); }
function create(value) { exact(value, ["groupId", "candidateRef", "idempotencyKey"]); return Object.freeze({ groupId: id(value.groupId), candidateRef: id(value.candidateRef), idempotencyKey: key(value.idempotencyKey) }); }
function groupPage(value) { exact(value, ["groupId"], ["pageSize", "cursor"]); return Object.freeze({ groupId: id(value.groupId), pageSize: ownerInvitationPageSize(value.pageSize), cursor: cursor(value.cursor) }); }
function ownPage(value) { exact(value, [], ["pageSize", "cursor"]); return Object.freeze({ pageSize: pageSize(value.pageSize), cursor: cursor(value.cursor) }); }
function invitation(value) { exact(value, ["invitationId"]); return Object.freeze({ invitationId: id(value.invitationId) }); }
function decision(value) { exact(value, ["invitationId", "idempotencyKey"]); return Object.freeze({ invitationId: id(value.invitationId), idempotencyKey: key(value.idempotencyKey) }); }

module.exports = { GroupInvitationValidationError, create, decision, empty, enabled, groupPage, invitation, ownPage, search };
