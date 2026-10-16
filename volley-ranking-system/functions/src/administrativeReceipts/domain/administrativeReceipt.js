"use strict";
const crypto = require("node:crypto");
const e = require("../application/administrativeReceiptErrors");

const MAX_LINES = 20; const MAX_NOTICES = 20; const CAPABILITY_ID = "GROUP_DIRECT_PAYMENT_RECORD";
const MAX_AMOUNT_MINOR = 999_999_999_999; const KEY = /^[A-Za-z0-9._:-]{16,128}$/;
const CONTROL = /[\p{Cc}\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u;
const plain = (v) => v && typeof v === "object" && !Array.isArray(v);
const exact = (v, keys) => plain(v) && Object.keys(v).sort().join("\0") === [...keys].sort().join("\0");
const stable = (v) => Array.isArray(v) ? `[${v.map(stable).join(",")}]` : plain(v) ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(",")}}` : JSON.stringify(v);
const hash = (v) => crypto.createHash("sha256").update(typeof v === "string" ? v : stable(v)).digest("hex");
const opaqueId = (...parts) => hash(parts.join("\u001f"));
const iso = (v) => v?.toDate?.().toISOString?.() || null;
function id(v) { if (typeof v !== "string" || !v || v !== v.trim() || v.includes("/") || v.length > 256) throw new e.AdministrativeReceiptValidationError(); return v; }
function key(v) { if (typeof v !== "string" || !KEY.test(v)) throw new e.AdministrativeReceiptValidationError(); return v; }
function amount(v) { if (!Number.isSafeInteger(v) || v < 1 || v > MAX_AMOUNT_MINOR) throw new e.AdministrativeReceiptValidationError(); return v; }
function revision(v) { if (!Number.isSafeInteger(v) || v < 1) throw new e.AdministrativeReceiptValidationError(); return v; }
function text(v) { if (typeof v !== "string" || CONTROL.test(v)) throw new e.AdministrativeReceiptValidationError(); const n = v.normalize("NFC").trim().replace(/\s+/gu, " "); if (!n || Array.from(n).length > 240 || Buffer.byteLength(n, "utf8") > 480) throw new e.AdministrativeReceiptValidationError(); return n; }
function civilDate(v, now = new Date()) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ""); if (!m) throw new e.AdministrativeReceiptValidationError(); const [y, mo, da] = m.slice(1).map(Number); const date = new Date(Date.UTC(y, mo - 1, da)); if (y < 1 || date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== da) throw new e.AdministrativeReceiptValidationError(); const current = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).format(now); if (v > current) throw new e.AdministrativeReceiptValidationError(); return v; }
function pageSize(v) { if (v === undefined) return 20; if (!Number.isSafeInteger(v) || v < 1 || v > 50) throw new e.AdministrativeReceiptValidationError(); return v; }
function cursor(v) { if (v === undefined) return undefined; if (typeof v !== "string" || v.length < 8 || v.length > 4096) throw new e.AdministrativeReceiptValidationError(); return v; }
const canonicalLines = (lines) => Object.freeze([...lines].sort((a,b) => a.paymentId.localeCompare(b.paymentId)).map(Object.freeze));
const canonicalDecisions = (items) => Object.freeze([...items].sort((a,b) => a.deliveryId.localeCompare(b.deliveryId)).map((x) => Object.freeze({ ...x, ...(x.correctedFields ? { correctedFields: [...x.correctedFields].sort() } : {}) })));
function requestHash(v) { return hash({ ...v, lines: v.lines ? canonicalLines(v.lines) : undefined, relatedNoticeDecisions: v.relatedNoticeDecisions ? canonicalDecisions(v.relatedNoticeDecisions) : undefined }); }
const receiptId = (actor, keyValue) => opaqueId("administrative-receipt", actor, keyValue);
const commandReceiptId = (actor, operation, keyValue) => opaqueId("administrative-receipt-command", actor, operation, keyValue);
const applicationId = (receipt, payment) => opaqueId("payment-delivery-application", receipt, payment);
const guardId = (group, membership) => opaqueId("payment-receipt-candidate-guard", group, membership);
const slotId = (group, account) => opaqueId("group-capability-slot", group, CAPABILITY_ID, account);
function candidateShape(delivery) { return { deliveryId: delivery.deliveryId, revision: delivery.revision, declaredPaidOn: delivery.declaredPaidOn, lines: delivery.lines.map((x) => ({ paymentId: x.paymentId, amountMinor: x.requestedAmountMinor })).sort((a,b) => a.paymentId.localeCompare(b.paymentId)) }; }
const candidateDigest = (deliveries) => hash([...deliveries].map(candidateShape).sort((a,b) => a.deliveryId.localeCompare(b.deliveryId)));
function dto(data, { person, own = false } = {}) { return Object.freeze({ receiptId: data.receiptId, origin: "ADMINISTRATIVE", groupId: data.groupId, seasonId: data.seasonId, membershipId: data.membershipId, receivedOn: data.receivedOn, totalMinor: data.totalMinor, applicationState: data.applicationState, recordedAt: iso(data.recordedAt), ...(data.reversedAt ? { reversedAt: iso(data.reversedAt), reversal: { reason: data.reversal.reason } } : {}), lines: data.lines.map((x) => ({ lineId: x.lineId, paymentId: x.paymentId, allocationMode: x.allocationMode, amountMinor: x.amountMinor, conceptName: x.conceptName, dueDate: x.dueDate })), ...(person ? { person } : {}), ...(!own ? { resolvedNoticeIds: data.resolvedNoticeIds || [] } : {}) }); }
module.exports = { MAX_LINES, MAX_NOTICES, CAPABILITY_ID, amount, applicationId, candidateDigest, candidateShape, canonicalDecisions, canonicalLines, civilDate, commandReceiptId, cursor, dto, exact, guardId, hash, id, iso, key, opaqueId, pageSize, receiptId, requestHash, revision, slotId, stable, text };
