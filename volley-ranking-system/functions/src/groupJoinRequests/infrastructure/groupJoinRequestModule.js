"use strict";
const { db } = require("../../firebase");
const { createGroupJoinRequestAccountCapability } = require("../../users/public/groupJoinRequestAccountCapability");
const { createGroupJoinRequestPersonCapability } = require("../../persons/public/groupJoinRequestPersonCapability");
const { createGroupJoinRequestGroupCapability } = require("../../groups/public/groupJoinRequestGroupCapability");
const { createGroupJoinRequestSeasonCapability } = require("../../groups/public/groupJoinRequestSeasonCapability");
const { createGroupJoinRequestMembershipCapability } = require("../../memberships/public/groupJoinRequestMembershipCapability");
const { createGroupJoinRequestService } = require("../application/groupJoinRequestService");
const { createFirestoreGroupJoinRequestRepository } = require("./firestoreGroupJoinRequestRepository");
const { createFirestoreGroupJoinRequestStore } = require("./firestoreGroupJoinRequestStore");

const repository = createFirestoreGroupJoinRequestRepository({ db });
const personCapability = createGroupJoinRequestPersonCapability({ db });
const groupCapability = createGroupJoinRequestGroupCapability({ db });
const seasonCapability = createGroupJoinRequestSeasonCapability({ db });
module.exports = createGroupJoinRequestService({
  accountCapability: createGroupJoinRequestAccountCapability({ db }),
  personCapability,
  store: createFirestoreGroupJoinRequestStore({
    db,
    groupCapability,
    seasonCapability,
    personCapability,
    membershipCapability: createGroupJoinRequestMembershipCapability({ db, groupCapability, seasonCapability }),
    repository,
  }),
});
