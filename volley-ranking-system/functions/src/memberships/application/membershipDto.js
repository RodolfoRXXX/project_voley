"use strict";

const MEMBERSHIP_DTO_KEYS = Object.freeze(["id", "personId", "groupId", "seasonId", "estado", "fechaIngreso"]);
const FINALIZED_MEMBERSHIP_DTO_KEYS = Object.freeze(["id", "groupId", "seasonId", "estado", "fechaIngreso", "fechaEgreso"]);

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

function toFinalizedMembershipDto(membership) {
  return Object.freeze({
    id: membership.membershipId,
    groupId: membership.groupId,
    seasonId: membership.seasonId,
    estado: membership.estado,
    fechaIngreso: membership.fechaIngreso.toDate().toISOString(),
    fechaEgreso: membership.fechaEgreso.toDate().toISOString(),
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

module.exports = { FINALIZED_MEMBERSHIP_DTO_KEYS, MEMBERSHIP_DTO_KEYS, toFinalizedMembershipDto, toMembershipDto, toMyCurrentGroupMembershipItem };
