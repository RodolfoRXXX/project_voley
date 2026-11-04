"use strict";

const { COVERAGE } = require("./dashboardTaskModel");
const { DashboardTaskValidationError } = require("./dashboardTaskQueryErrors");

function plain(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function validateDashboardTaskQuery(data) {
  if (!plain(data)) throw new DashboardTaskValidationError();
  const keys = Object.keys(data).sort();
  const expected = ["coverage", ...(data.cursor === undefined ? [] : ["cursor"]), ...(data.groupId === undefined ? [] : ["groupId"])].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index]) || data.coverage !== COVERAGE) {
    throw new DashboardTaskValidationError();
  }
  if (data.cursor !== undefined && (typeof data.cursor !== "string" || data.cursor.length < 20
    || data.cursor.length > 2048 || !/^[A-Za-z0-9_.-]+$/u.test(data.cursor))) throw new DashboardTaskValidationError();
  if (data.groupId !== undefined && (typeof data.groupId !== "string" || !data.groupId
    || data.groupId !== data.groupId.trim() || data.groupId.length > 128 || data.groupId.includes("/"))) {
    throw new DashboardTaskValidationError();
  }
  return Object.freeze({ coverage: COVERAGE, ...(data.groupId === undefined ? {} : { groupId: data.groupId }),
    ...(data.cursor === undefined ? {} : { cursor: data.cursor }) });
}

module.exports = { validateDashboardTaskQuery };
