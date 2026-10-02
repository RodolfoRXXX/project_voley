"use strict";

const { db } = require("../../firebase");
const { createAccountService } = require("../../users/application/accountService");
const { createFirestoreUserRepository } = require("../../users/infrastructure/firestoreUserRepository");
const { createGroupService } = require("../application/groupService");
const { createFirestoreGroupCreationGuard } = require("./firestoreGroupCreationGuard");
const { createFirestoreGroupRepository } = require("./firestoreGroupRepository");
const { createFirestoreGroupNameUpdateStore } = require("./firestoreGroupNameUpdateStore");
const { createFirestoreGroupArchiveStore } = require("./firestoreGroupArchiveStore");
const { createFirestoreOwnGroupsReader } = require("./firestoreOwnGroupsReader");
const { createFirestoreSelfAccountReader } = require("./firestoreSelfAccountReader");
const { createFirestoreMembershipRepository } = require("../../memberships/infrastructure/firestoreMembershipRepository");
const { createFirestoreGroupJoinRequestRepository } = require("../../groupJoinRequests/infrastructure/firestoreGroupJoinRequestRepository");

const userRepository = createFirestoreUserRepository({ db });
const accountService = createAccountService({ userRepository });
const groupRepository = createFirestoreGroupRepository({ db });
const ownGroupsReader = createFirestoreOwnGroupsReader({ db, groupRepository });

module.exports = createGroupService({
  selfAccountReader: createFirestoreSelfAccountReader({ accountService }),
  groupRepository,
  ownGroupsReader,
  creationGuard: createFirestoreGroupCreationGuard({ db, ownGroupsReader }),
  groupNameUpdateStore: createFirestoreGroupNameUpdateStore({ db, groupRepository }),
  groupArchiveStore: createFirestoreGroupArchiveStore({
    db, groupRepository,
    membershipRepository: createFirestoreMembershipRepository({ db }),
    joinRequestRepository: createFirestoreGroupJoinRequestRepository({ db }),
  }),
});
