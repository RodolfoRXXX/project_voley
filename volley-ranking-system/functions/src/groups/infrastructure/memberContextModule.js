"use strict";

const { db } = require("../../firebase");
const { createFirestoreGroupRepository } = require("./firestoreGroupRepository");
const { createFirestoreMemberContext } = require("./firestoreMemberContext");
const { createFirestoreSeasonRepository } = require("./firestoreSeasonRepository");

const groupRepository = createFirestoreGroupRepository({ db });
const seasonRepository = createFirestoreSeasonRepository({ db });

module.exports = createFirestoreMemberContext({ db, groupRepository, seasonRepository });
