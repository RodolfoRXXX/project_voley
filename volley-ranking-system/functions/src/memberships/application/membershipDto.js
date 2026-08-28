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

module.exports = { MEMBERSHIP_DTO_KEYS, toMembershipDto };
