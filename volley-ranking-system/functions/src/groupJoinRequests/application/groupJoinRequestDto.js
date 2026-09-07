"use strict";
function iso(timestamp) { return timestamp.toDate().toISOString(); }
function toOwnGroupJoinRequestDto(request) {
  return Object.freeze({ id: request.requestId, groupId: request.groupId, estado: request.estado, createdAt: iso(request.createdAt), ...(request.estado === "cancelada" ? { cancelledAt: iso(request.cancelledAt) } : {}) });
}
function toOwnerItem(request, person) { return Object.freeze({ id: request.requestId, estado: "pendiente", createdAt: iso(request.createdAt), person: Object.freeze({ firstName: person.firstName, lastName: person.lastName }) }); }
function toPreview(group) { return Object.freeze({ id: group.id, nombre: group.nombre, deporte: group.deporte }); }
module.exports = { toOwnGroupJoinRequestDto, toOwnerItem, toPreview };
