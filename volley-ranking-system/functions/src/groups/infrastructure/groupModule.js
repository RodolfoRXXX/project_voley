"use strict";

const { db } = require("../../firebase");
const { createAccountService } = require("../../users/application/accountService");
const { createFirestoreUserRepository } = require("../../users/infrastructure/firestoreUserRepository");
const { createGroupService } = require("../application/groupService");
const { createFirestoreGroupCreationGuard } = require("./firestoreGroupCreationGuard");
const { createFirestoreGroupRepository } = require("./firestoreGroupRepository");
const { createFirestoreOwnGroupsReader } = require("./firestoreOwnGroupsReader");
const { createFirestoreSelfAccountReader } = require("./firestoreSelfAccountReader");

const userRepository = createFirestoreUserRepository({ db });
const accountService = createAccountService({ userRepository });
const groupRepository = createFirestoreGroupRepository({ db });
const ownGroupsReader = createFirestoreOwnGroupsReader({ db, groupRepository });

module.exports = createGroupService({
  selfAccountReader: createFirestoreSelfAccountReader({ accountService }),
  groupRepository,
  ownGroupsReader,
  creationGuard: createFirestoreGroupCreationGuard({ db, ownGroupsReader }),
});
