"use strict";

const TIME_ZONE = "America/Argentina/Buenos_Aires";
const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;

function validationError(message) {
  const error = new Error(message);
  error.name = "RegisteredIncomeMovementValidationError";
  error.reason = "INVALID_DATE_RANGE";
  return error;
}

function isCivilDate(value) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function currentMonth(clock) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(clock()).filter((part) => part.type !== "literal")
    .map((part) => [part.type, part.value]));
  const from = `${parts.year}-${parts.month}-01`;
  const nextMonth = new Date(Date.UTC(Number(parts.year), Number(parts.month), 1));
  const to = new Date(nextMonth.valueOf() - 86400000).toISOString().slice(0, 10);
  return { from, to };
}

function validateRegisteredIncomeMovementQuery(data, { clock = () => new Date() } = {}) {
  if (!data || typeof data !== "object" || Array.isArray(data)
    || Object.keys(data).some((key) => !["groupId", "from", "to"].includes(key))
    || typeof data.groupId !== "string" || !data.groupId.trim()) {
    throw validationError("Expected { groupId, from?, to? }");
  }
  const hasFrom = data.from !== undefined;
  const hasTo = data.to !== undefined;
  if (hasFrom !== hasTo) throw validationError("from and to must be provided together");
  const range = hasFrom ? { from: data.from, to: data.to } : currentMonth(clock);
  if (!isCivilDate(range.from) || !isCivilDate(range.to) || range.from > range.to) {
    throw validationError("Invalid civil date range");
  }
  const start = Date.parse(`${range.from}T00:00:00.000Z`);
  const end = Date.parse(`${range.to}T00:00:00.000Z`);
  if ((end - start) / 86400000 + 1 > 92) {
    const error = validationError("The query exceeds 92 civil days");
    error.reason = "RANGE_TOO_WIDE";
    throw error;
  }
  return Object.freeze({ groupId: data.groupId.trim(), ...range });
}

module.exports = { TIME_ZONE, validateRegisteredIncomeMovementQuery };
