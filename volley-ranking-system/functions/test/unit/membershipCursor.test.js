"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  CURSOR_CONTRACT,
  CURSOR_ORDER,
  canonicalJson,
  decodeMyGroupsCursor,
  decodeUtf8Strict,
  encodeMyGroupsCursor,
} = require("../../src/memberships/application/membershipCursor");
const { MembershipValidationError } = require("../../src/memberships/application/membershipErrors");

const position = { seconds: 1788177600, nanoseconds: 123456789, lastMembershipId: "membership-z" };

test("cursor v1 es Base64URL canónico, sin padding ni identidad", () => {
  const token = encodeMyGroupsCursor(position);
  assert.match(token, /^[A-Za-z0-9_-]+$/);
  assert.doesNotMatch(token, /=/);
  assert.deepEqual(decodeMyGroupsCursor(token), position);
  const envelope = JSON.parse(Buffer.from(token, "base64url").toString("utf8"));
  assert.equal(envelope.payload.contract, CURSOR_CONTRACT);
  assert.equal(envelope.payload.order, CURSOR_ORDER);
  assert.equal("personId" in envelope.payload, false);
  assert.equal(Buffer.from(canonicalJson(envelope), "utf8").toString("base64url"), token);
});

test("cursor exige UTF-8 byte-exacto antes de interpretar JSON", () => {
  assert.equal(decodeUtf8Strict(Buffer.from("válido 😀", "utf8")), "válido 😀");
  for (const bytes of [
    Buffer.from([0xff]),
    Buffer.from([0xe2, 0x82]),
    Buffer.from([0xc0, 0xaf]),
    Buffer.from([0xed, 0xa0, 0x80]),
  ]) {
    assert.throws(() => decodeUtf8Strict(bytes), MembershipValidationError);
  }
  const unicode = { ...position, lastMembershipId: "membresía-😀" };
  assert.deepEqual(decodeMyGroupsCursor(encodeMyGroupsCursor(unicode)), unicode);
});

test("cursor rechaza corrupción, truncamiento, claves y versiones ajenas", () => {
  const valid = encodeMyGroupsCursor(position);
  const envelope = JSON.parse(Buffer.from(valid, "base64url").toString("utf8"));
  const tokens = [
    "***", valid.slice(0, -2), `${valid}=`, "x".repeat(2049),
    Buffer.from("not-json").toString("base64url"),
    Buffer.from(JSON.stringify(envelope, null, 2)).toString("base64url"),
    Buffer.from(JSON.stringify({ ...envelope, extra: true })).toString("base64url"),
    Buffer.from(JSON.stringify({ ...envelope, checksum: "0".repeat(64) })).toString("base64url"),
    Buffer.from(JSON.stringify({ ...envelope, payload: { ...envelope.payload, v: 2 } })).toString("base64url"),
  ];
  for (const token of tokens) assert.throws(() => decodeMyGroupsCursor(token), MembershipValidationError);
});

test("cursor rechaza timestamps e IDs fuera de contrato", () => {
  for (const invalid of [
    { ...position, seconds: 253402300800 }, { ...position, nanoseconds: -1 },
    { ...position, nanoseconds: 1e9 }, { ...position, lastMembershipId: "" },
    { ...position, lastMembershipId: "a/b" },
  ]) assert.throws(() => encodeMyGroupsCursor(invalid), MembershipValidationError);
});
