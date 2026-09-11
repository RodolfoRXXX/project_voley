"use strict";
function iso(timestamp) { return timestamp.toDate().toISOString(); }
function toOwnGroupJoinRequestDto(request, decisionStatus) {
  return Object.freeze({ id: request.requestId, groupId: request.groupId, estado: request.estado, createdAt: iso(request.createdAt), ...(request.estado === "pendiente" ? { decisionStatus: decisionStatus || "PENDING" } : {}), ...(request.estado === "cancelada" ? { cancelledAt: iso(request.cancelledAt) } : {}), ...(["aprobada", "rechazada"].includes(request.estado) ? { decidedAt: iso(request.decidedAt) } : {}) });
}
function toOwnerItem(request, person, decisionStatus, approvalEffect) { return Object.freeze({ id: request.requestId, estado: "pendiente", decisionStatus, createdAt: iso(request.createdAt), person: Object.freeze({ firstName: person.firstName, lastName: person.lastName }), approvalEffect }); }
function toApprovalDto(outcome, request, membership) { return Object.freeze({ outcome, decision: Object.freeze({ requestId: request.requestId, estado: "aprobada", decidedAt: iso(request.decidedAt), membership: Object.freeze({ id: membership.membershipId, seasonId: membership.seasonId }) }) }); }
function toRejectionDto(outcome, request) { return Object.freeze({ outcome, decision: Object.freeze({ requestId: request.requestId, estado: "rechazada", decidedAt: iso(request.decidedAt) }) }); }
function toDecisionResultDto(result) {
  const request = result.request;
  const base = { id: request.requestId, estado: request.estado, createdAt: iso(request.createdAt) };
  if (result.status === "PENDING") return Object.freeze({ status: "PENDING", request: Object.freeze(base) });
  if (result.status === "APPROVAL_IN_PROGRESS") return Object.freeze({ status: result.status, request: Object.freeze(base), startedAt: iso(result.coordination.createdAt) });
  if (result.status === "CANCELLED") return Object.freeze({ status: result.status, request: Object.freeze({ ...base, cancelledAt: iso(request.cancelledAt) }) });
  if (result.status === "REJECTED") return Object.freeze({ status: result.status, request: Object.freeze({ ...base, decidedAt: iso(request.decidedAt) }) });
  return Object.freeze({ status: "APPROVED", request: Object.freeze({ ...base, decidedAt: iso(request.decidedAt) }), membership: Object.freeze({ id: result.membership.membershipId, seasonId: result.membership.seasonId }) });
}
function toPreview(group) { return Object.freeze({ id: group.id, nombre: group.nombre, deporte: group.deporte }); }
module.exports = { toApprovalDto, toDecisionResultDto, toOwnGroupJoinRequestDto, toOwnerItem, toPreview, toRejectionDto };
