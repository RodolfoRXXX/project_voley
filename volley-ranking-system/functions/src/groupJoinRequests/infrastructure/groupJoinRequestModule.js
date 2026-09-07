"use strict";
const { db } = require("../../firebase");
const { createGroupJoinRequestAccountCapability } = require("../../users/public/groupJoinRequestAccountCapability");
const { createGroupJoinRequestPersonCapability } = require("../../persons/public/groupJoinRequestPersonCapability");
const { createGroupJoinRequestGroupCapability } = require("../../groups/public/groupJoinRequestGroupCapability");
const { createGroupJoinRequestMembershipCapability } = require("../../memberships/public/groupJoinRequestMembershipCapability");
const { createGroupJoinRequestService } = require("../application/groupJoinRequestService");
const { createFirestoreGroupJoinRequestRepository } = require("./firestoreGroupJoinRequestRepository");
const { createFirestoreGroupJoinRequestStore } = require("./firestoreGroupJoinRequestStore");

const repository = createFirestoreGroupJoinRequestRepository({ db });
const personCapability = createGroupJoinRequestPersonCapability({ db });
module.exports = createGroupJoinRequestService({
  accountCapability: createGroupJoinRequestAccountCapability({ db }),
  personCapability,
  store: createFirestoreGroupJoinRequestStore({
    db,
    groupCapability: createGroupJoinRequestGroupCapability({ db }),
    personCapability,
    membershipCapability: createGroupJoinRequestMembershipCapability({ db }),
    repository,
  }),
});
