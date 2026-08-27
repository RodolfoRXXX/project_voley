"use strict";

const SEASON_DTO_KEYS = Object.freeze(["id", "groupId", "nombre", "estado", "fechaInicio", "createdAt"]);

function toSeasonDto(season) {
  return Object.freeze({
    id: season.seasonId,
    groupId: season.groupId,
    nombre: season.nombre,
    estado: season.estado,
    fechaInicio: season.fechaInicio,
    createdAt: season.createdAt.toDate().toISOString(),
  });
}

module.exports = { SEASON_DTO_KEYS, toSeasonDto };
