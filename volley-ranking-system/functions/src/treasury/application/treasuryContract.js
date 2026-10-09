"use strict";

const { exact, validId } = require("../domain/treasury");
const { TreasuryValidationError } = require("./treasuryErrors");
function id(value) { if (!validId(value)) throw new TreasuryValidationError(); return value; }
function key(value) { if (typeof value !== "string" || value.length < 16 || value.length > 128 || /[\u0000-\u001f\u007f]/u.test(value)) throw new TreasuryValidationError(); return value; }
function cursor(value) { if (value === undefined) return undefined; if (typeof value !== "string" || value.length < 8 || value.length > 4096) throw new TreasuryValidationError(); return value; }
function pageSize(value) { if (value === undefined) return 20; if (!Number.isSafeInteger(value) || value < 1 || value > 50) throw new TreasuryValidationError(); return value; }
function requireExact(data, fields) { if (!exact(data, fields)) throw new TreasuryValidationError(); }
function validateGrant(data) { requireExact(data, ["groupId", "membershipId", "idempotencyKey"]); return Object.freeze({ groupId: id(data.groupId), membershipId: id(data.membershipId), idempotencyKey: key(data.idempotencyKey) }); }
function validateRevoke(data) { requireExact(data, ["groupId", "grantId", "idempotencyKey"]); return Object.freeze({ groupId: id(data.groupId), grantId: id(data.grantId), idempotencyKey: key(data.idempotencyKey) }); }
function validateGroup(data) { requireExact(data, ["groupId"]); return Object.freeze({ groupId: id(data.groupId) }); }
function validateList(data) { requireExact(data, ["groupId", ...(data?.pageSize === undefined ? [] : ["pageSize"]), ...(data?.cursor === undefined ? [] : ["cursor"])]); return Object.freeze({ groupId: id(data.groupId), pageSize: pageSize(data.pageSize), cursor: cursor(data.cursor) }); }
module.exports = { validateGrant, validateGroup, validateList, validateRevoke };
