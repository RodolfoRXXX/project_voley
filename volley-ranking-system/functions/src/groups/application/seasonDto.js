"use strict";

const SEASON_DTO_KEYS = Object.freeze(["id", "groupId", "nombre", "estado", "fechaInicio", "createdAt"]);

function toSeasonDto(season) {
  const dto = {
    id: season.seasonId,
    groupId: season.groupId,
    nombre: season.nombre,
    estado: season.estado,
    fechaInicio: season.fechaInicio,
    createdAt: season.createdAt.toDate().toISOString(),
  };
  if (season.estado === "cerrada") dto.closedAt = season.closedAt.toDate().toISOString();
  return Object.freeze(dto);
}

function toClosedSeasonDto(season) {
  return Object.freeze({ id: season.seasonId, groupId: season.groupId, nombre: season.nombre, fechaInicio: season.fechaInicio, estado: "cerrada", closedAt: season.closedAt.toDate().toISOString() });
}

function toOpenSeasonHistoryDto(season) {
  return Object.freeze({
    id: season.seasonId,
    nombre: season.nombre,
    fechaInicio: season.fechaInicio,
    estado: "abierta",
    isCurrent: true,
  });
}

function toClosedSeasonHistoryDto(season) {
  return Object.freeze({
    id: season.seasonId,
    nombre: season.nombre,
    fechaInicio: season.fechaInicio,
    estado: "cerrada",
    closedAt: season.closedAt.toDate().toISOString(),
    isCurrent: false,
  });
}

module.exports = { SEASON_DTO_KEYS, toClosedSeasonDto, toClosedSeasonHistoryDto, toOpenSeasonHistoryDto, toSeasonDto };
