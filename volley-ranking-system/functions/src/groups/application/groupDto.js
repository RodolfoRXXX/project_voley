"use strict";

const DTO_KEYS = Object.freeze(["id", "nombre", "deporte", "estado", "ownerUserId", "createdAt"]);

function toGroupDto(group) {
  const createdAt = group.createdAt.toDate().toISOString();
  return Object.freeze({
    id: group.groupId,
    nombre: group.nombre,
    deporte: group.deporte,
    estado: group.estado,
    ownerUserId: group.ownerId,
    createdAt,
  });
}

function toDashboardGroupDto(group) {
  return Object.freeze({ id: group.groupId, nombre: group.nombre, deporte: group.deporte, estado: group.estado });
}

module.exports = { DTO_KEYS, toDashboardGroupDto, toGroupDto };
