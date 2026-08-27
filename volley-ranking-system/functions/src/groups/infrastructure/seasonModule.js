"use strict";

const { db } = require("../../firebase");
const { createAccountService } = require("../../users/application/accountService");
const { createFirestoreUserRepository } = require("../../users/infrastructure/firestoreUserRepository");
const { createSeasonService } = require("../application/seasonService");
const { createFirestoreGroupRepository } = require("./firestoreGroupRepository");
const { createFirestoreOpenSeasonGuard } = require("./firestoreOpenSeasonGuard");
const { createFirestoreOpenSeasonReader } = require("./firestoreOpenSeasonReader");
const { createFirestoreSeasonRepository } = require("./firestoreSeasonRepository");
const { createFirestoreSelfAccountReader } = require("./firestoreSelfAccountReader");

const userRepository = createFirestoreUserRepository({ db });
const accountService = createAccountService({ userRepository });
const groupRepository = createFirestoreGroupRepository({ db });
const seasonRepository = createFirestoreSeasonRepository({ db });

module.exports = createSeasonService({
  selfAccountReader: createFirestoreSelfAccountReader({ accountService }),
  seasonRepository,
  openSeasonReader: createFirestoreOpenSeasonReader({ db, groupRepository, seasonRepository }),
  openSeasonGuard: createFirestoreOpenSeasonGuard({ db, groupRepository }),
});
