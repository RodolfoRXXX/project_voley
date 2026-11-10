"use strict";

const { db } = require("../../firebase");
const { createGroupDiscoveryService } = require("../application/groupDiscoveryService");
const { createFirestoreGroupDiscoveryStore } = require("./firestoreGroupDiscoveryStore");
const { createGroupJoinRequestAccountCapability } = require("../../users/public/groupJoinRequestAccountCapability");
const { createGroupJoinRequestPersonCapability } = require("../../persons/public/groupJoinRequestPersonCapability");
const { createGroupJoinRequestGroupCapability } = require("../public/groupJoinRequestGroupCapability");
const { createGroupJoinRequestSeasonCapability } = require("../public/groupJoinRequestSeasonCapability");
const { createGroupJoinRequestMembershipCapability } = require("../../memberships/public/groupJoinRequestMembershipCapability");
const { createGroupDiscoveryJoinRequestCapability } = require("../../groupJoinRequests/public/groupDiscoveryJoinRequestCapability");

const groupCapability = createGroupJoinRequestGroupCapability({ db });
const seasonCapability = createGroupJoinRequestSeasonCapability({ db });
const membershipCapability = createGroupJoinRequestMembershipCapability({ db, groupCapability, seasonCapability });

module.exports = createGroupDiscoveryService({
  accountCapability: createGroupJoinRequestAccountCapability({ db }),
  personCapability: createGroupJoinRequestPersonCapability({ db }),
  store: createFirestoreGroupDiscoveryStore({
    db,
    groupCapability,
    membershipCapability,
    joinRequestCapability: createGroupDiscoveryJoinRequestCapability({ db }),
  }),
});
