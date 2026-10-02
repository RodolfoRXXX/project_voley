"use strict";

const DTO_KEYS = Object.freeze(["id", "nombre", "deporte", "estado", "ownerUserId", "createdAt"]);
const ARCHIVED_DTO_KEYS = Object.freeze([...DTO_KEYS, "archivedAt"]);

function toGroupDto(group) {
  const createdAt = group.createdAt.toDate().toISOString();
  const dto = {
    id: group.groupId,
    nombre: group.nombre,
    deporte: group.deporte,
    estado: group.estado,
    ownerUserId: group.ownerId,
    createdAt,
  };
  if (group.estado === "archivado") dto.archivedAt = group.archivedAt.toDate().toISOString();
  return Object.freeze(dto);
}

function toDashboardGroupDto(group) {
  if (group.estado !== "activo") throw new TypeError("Dashboard Group must be active");
  return Object.freeze({ id: group.groupId, nombre: group.nombre, deporte: group.deporte, estado: group.estado });
}

module.exports = { ARCHIVED_DTO_KEYS, DTO_KEYS, toDashboardGroupDto, toGroupDto };
