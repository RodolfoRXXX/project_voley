"use strict";

const { InvalidSeasonStateError, buildSeason, normalizeSeasonName } = require("../domain/season");
const { toClosedSeasonHistoryDto, toOpenSeasonHistoryDto, toSeasonDto } = require("./seasonDto");
const { decodeSeasonHistoryCursor, encodeSeasonHistoryCursor } = require("./seasonHistoryCursor");
const {
  SeasonAccountRequiredError,
  SeasonDependencyUnavailableError,
  SeasonError,
  SeasonInternalError,
  SeasonUnauthenticatedError,
  SeasonValidationError,
} = require("./seasonErrors");
const { hashSeasonIdempotencyKey, hashSeasonOpeningRequest, hashSeasonRequest, legacySeasonOpeningReceiptId,
  seasonClosureReceiptId, seasonOpeningReceiptId, hashSeasonClosureRequest, hashSeasonUpdateRequest,
  seasonEditToken, seasonUpdateReceiptId } = require("./seasonHashing");

function requireSeasonActor(identity) {
  if (!identity || typeof identity.userId !== "string" || !identity.userId.trim()) throw new SeasonUnauthenticatedError();
  return identity.userId.trim();
}

function createSeasonService({ selfAccountReader, seasonRepository, openSeasonReader, openSeasonGuard, seasonClosureStore, seasonHistoryReader, seasonUpdateStore }) {
  if (!selfAccountReader || !seasonRepository || !openSeasonReader || !openSeasonGuard) {
    throw new TypeError("Season service dependencies are required");
  }

  async function requireAccount(userId) {
    try {
      const account = await selfAccountReader.getByUserId(userId);
      if (!account) throw new SeasonAccountRequiredError();
      if (account.userId !== userId) throw new SeasonDependencyUnavailableError();
      return account;
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
        const legacyIdempotencyKeyHash = hashSeasonIdempotencyKey(season.groupId, input.idempotencyKey);
        const result = await openSeasonGuard.confirmOpenSeason({
          userId,
          season,
          receiptId: seasonOpeningReceiptId(userId, input.idempotencyKey),
          legacyReceiptId: legacySeasonOpeningReceiptId(season.groupId, legacyIdempotencyKeyHash),
          idempotencyKeyHash: seasonOpeningReceiptId(userId, input.idempotencyKey),
          legacyIdempotencyKeyHash,
          requestHash: hashSeasonOpeningRequest(userId, season),
          legacyRequestHash: hashSeasonRequest(season),
          seasonRepository,
        });
        const persisted = result.season || await readConfirmedSeason(result.seasonId);
        return Object.freeze({ outcome: result.outcome, season: toSeasonDto(persisted) });
      } catch (error) {
        if (error instanceof SeasonError) throw error;
        throw new SeasonInternalError({ cause: error });
      }
    },

    async closeSeason(identity, input) {
      const userId = requireSeasonActor(identity);
      if (!seasonClosureStore) throw new SeasonDependencyUnavailableError();
      try {
        return await seasonClosureStore.close({
          userId, groupId: input.groupId, seasonId: input.seasonId,
          receiptId: seasonClosureReceiptId(userId, input.idempotencyKey),
          idempotencyKeyHash: seasonClosureReceiptId(userId, input.idempotencyKey),
          requestHash: hashSeasonClosureRequest(userId, input.groupId, input.seasonId),
        });
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
        return Object.freeze({ season: toSeasonDto(season), editToken: season.estado === "abierta" ? seasonEditToken(season) : null });
      } catch (error) {
        if (error instanceof SeasonError) throw error;
        throw new SeasonDependencyUnavailableError({ cause: error });
      }
    },

    async updateSeason(identity, input) {
      const userId = requireSeasonActor(identity);
      if (!seasonUpdateStore) throw new SeasonDependencyUnavailableError();
      let nombre;
      try { nombre = normalizeSeasonName(input.nombre); }
      catch (error) {
        if (error instanceof InvalidSeasonStateError) throw new SeasonValidationError(error.message, { cause: error });
        throw error;
      }
      const command = Object.freeze({ userId, groupId: input.groupId, seasonId: input.seasonId, nombre,
        expectedEditToken: input.expectedEditToken,
        receiptId: seasonUpdateReceiptId(userId, input.idempotencyKey) });
      try {
        return await seasonUpdateStore.update(Object.freeze({ ...command, requestHash: hashSeasonUpdateRequest(userId, command) }));
      } catch (error) {
        if (error instanceof SeasonError) throw error;
        throw new SeasonInternalError({ cause: error });
      }
    },

    async listSeasonsForOwnedGroup(identity, input) {
      const userId = requireSeasonActor(identity);
      const account = await requireAccount(userId);
      if (typeof account.displayName !== "string" || typeof account.accessEmail !== "string" || !account.accessEmail
        || !(account.accountPhotoUrl === null || typeof account.accountPhotoUrl === "string")) {
        throw new SeasonAccountRequiredError();
      }
      if (!seasonHistoryReader) throw new SeasonDependencyUnavailableError();
      const position = input.cursor
        ? decodeSeasonHistoryCursor(input.cursor, { groupId: input.groupId, userId })
        : null;
      try {
        const page = await seasonHistoryReader.listPage({
          userId,
          groupId: input.groupId,
          pageSize: input.pageSize,
          position,
        });
        const nextCursor = page.hasMore && page.last
          ? encodeSeasonHistoryCursor({
            groupId: input.groupId,
            userId,
            currentSeasonId: page.currentSeason?.seasonId || null,
            last: page.last,
          }) : null;
        return Object.freeze({
          currentSeason: page.currentSeason ? toOpenSeasonHistoryDto(page.currentSeason) : null,
          closedSeasons: Object.freeze(page.closedSeasons.map(toClosedSeasonHistoryDto)),
          nextCursor,
          hasMore: page.hasMore,
        });
      } catch (error) {
        if (error instanceof SeasonError) throw error;
        throw new SeasonInternalError({ cause: error });
      }
    },
  };
}

module.exports = { createSeasonService, requireSeasonActor };
