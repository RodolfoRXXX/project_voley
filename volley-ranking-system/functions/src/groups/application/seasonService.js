"use strict";

const { InvalidSeasonStateError, buildSeason } = require("../domain/season");
const { toSeasonDto } = require("./seasonDto");
const {
  SeasonAccountRequiredError,
  SeasonDependencyUnavailableError,
  SeasonError,
  SeasonInternalError,
  SeasonUnauthenticatedError,
  SeasonValidationError,
} = require("./seasonErrors");
const { hashSeasonIdempotencyKey, hashSeasonRequest } = require("./seasonHashing");

function requireSeasonActor(identity) {
  if (!identity || typeof identity.userId !== "string" || !identity.userId.trim()) throw new SeasonUnauthenticatedError();
  return identity.userId.trim();
}

function createSeasonService({ selfAccountReader, seasonRepository, openSeasonReader, openSeasonGuard }) {
  if (!selfAccountReader || !seasonRepository || !openSeasonReader || !openSeasonGuard) {
    throw new TypeError("Season service dependencies are required");
  }

  async function requireAccount(userId) {
    try {
      const account = await selfAccountReader.getByUserId(userId);
      if (!account) throw new SeasonAccountRequiredError();
      if (account.userId !== userId) throw new SeasonDependencyUnavailableError();
    } catch (error) {
      if (error instanceof SeasonError) throw error;
      throw new SeasonDependencyUnavailableError({ cause: error });
    }
  }

  async function readConfirmedSeason(seasonId) {
    try {
      const season = await seasonRepository.getById(seasonId);
      if (!season) throw new SeasonDependencyUnavailableError();
      return season;
    } catch (error) {
      if (error instanceof SeasonError) throw error;
      throw new SeasonDependencyUnavailableError({ cause: error });
    }
  }

  return {
    async createAndOpenSeason(identity, input) {
      const userId = requireSeasonActor(identity);
      await requireAccount(userId);
      let season;
      try {
        season = buildSeason({
          seasonId: seasonRepository.newId(),
          groupId: input.groupId,
          nombre: input.nombre,
          fechaInicio: input.fechaInicio,
        });
      } catch (error) {
        if (error instanceof InvalidSeasonStateError) throw new SeasonValidationError(error.message, { cause: error });
        throw error;
      }

      try {
        const result = await openSeasonGuard.confirmOpenSeason({
          userId,
          season,
          idempotencyKeyHash: hashSeasonIdempotencyKey(season.groupId, input.idempotencyKey),
          requestHash: hashSeasonRequest(season),
          seasonRepository,
        });
        const persisted = result.season || await readConfirmedSeason(result.seasonId);
        return Object.freeze({ outcome: result.outcome, season: toSeasonDto(persisted) });
      } catch (error) {
        if (error instanceof SeasonError) throw error;
        throw new SeasonInternalError({ cause: error });
      }
    },

    async getOpenSeasonContext(identity, groupId) {
      const userId = requireSeasonActor(identity);
      await requireAccount(userId);
      try {
        const season = await openSeasonReader.getOpenForOwner({ userId, groupId });
        return Object.freeze({ openSeason: season ? toSeasonDto(season) : null });
      } catch (error) {
        if (error instanceof SeasonError) throw error;
        throw new SeasonDependencyUnavailableError({ cause: error });
      }
    },

    async getOwnSeason(identity, { groupId, seasonId }) {
      const userId = requireSeasonActor(identity);
      await requireAccount(userId);
      try {
        const season = await openSeasonReader.getByIdForOwner({ userId, groupId, seasonId });
        return Object.freeze({ season: toSeasonDto(season) });
      } catch (error) {
        if (error instanceof SeasonError) throw error;
        throw new SeasonDependencyUnavailableError({ cause: error });
      }
    },
  };
}

module.exports = { createSeasonService, requireSeasonActor };
