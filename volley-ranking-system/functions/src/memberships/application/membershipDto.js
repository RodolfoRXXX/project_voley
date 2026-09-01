"use strict";

const MEMBERSHIP_DTO_KEYS = Object.freeze(["id", "personId", "groupId", "seasonId", "estado", "fechaIngreso"]);

function toMembershipDto(membership) {
  return Object.freeze({
    id: membership.membershipId,
    personId: membership.personId,
    groupId: membership.groupId,
    seasonId: membership.seasonId,
    estado: membership.estado,
    fechaIngreso: membership.fechaIngreso.toDate().toISOString(),
  });
}

function toMyCurrentGroupMembershipItem(membership, group) {
  return Object.freeze({
    membership: Object.freeze({
      id: membership.membershipId,
      seasonId: membership.seasonId,
      estado: membership.estado,
      fechaIngreso: membership.fechaIngreso.toDate().toISOString(),
    }),
    group: Object.freeze({
      id: group.id,
      nombre: group.nombre,
      deporte: group.deporte,
      estado: group.estado,
    }),
  });
}

module.exports = { MEMBERSHIP_DTO_KEYS, toMembershipDto, toMyCurrentGroupMembershipItem };
