"use strict";

const crypto = require("crypto");
const { DashboardTaskInvalidCursorError, DashboardTaskExpiredCursorError } = require("./dashboardTaskQueryErrors");

const VERSION = 1;
const ORDER = "actionableAt_DESC,kind_ASC,resourceId_ASC";

function stable(value) { return JSON.stringify(value); }
function signature(secret, encoded) { return crypto.createHmac("sha256", secret).update(encoded).digest("base64url"); }
function safeEqual(left, right) {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function createDashboardTaskCursorCodec({ secret }) {
  if (typeof secret !== "string" || secret.length < 32) throw new TypeError("Dashboard task cursor secret must contain at least 32 characters");
  return Object.freeze({
    encode({ accountId, coverage, generationId, anchor }) {
      const encoded = Buffer.from(stable({ v: VERSION, accountId, coverage, generationId, order: ORDER, anchor }), "utf8").toString("base64url");
      return `${encoded}.${signature(secret, encoded)}`;
    },
    decode(cursor, { accountId, coverage, generationId }) {
      if (!cursor) return null;
      try {
        const parts = cursor.split(".");
        if (parts.length !== 2 || !safeEqual(parts[1], signature(secret, parts[0]))) throw new DashboardTaskInvalidCursorError();
        const value = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
        if (value?.v !== VERSION || value.accountId !== accountId || value.coverage !== coverage || value.order !== ORDER
          || !value.anchor || !Number.isSafeInteger(value.anchor.seconds) || !Number.isSafeInteger(value.anchor.nanoseconds)
          || value.anchor.seconds < 0 || value.anchor.nanoseconds < 0 || value.anchor.nanoseconds > 999999999
          || !["N20", "N31"].includes(value.anchor.kind) || typeof value.anchor.resourceId !== "string" || !value.anchor.resourceId) {
          throw new DashboardTaskInvalidCursorError();
        }
        if (value.generationId !== generationId) throw new DashboardTaskExpiredCursorError();
        return Object.freeze(value.anchor);
      } catch (cause) {
        if (cause instanceof DashboardTaskInvalidCursorError || cause instanceof DashboardTaskExpiredCursorError) throw cause;
        throw new DashboardTaskInvalidCursorError({ cause });
      }
    },
  });
}

module.exports = { ORDER, VERSION, createDashboardTaskCursorCodec };
