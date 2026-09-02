"use strict";

const { db } = require("../../firebase");
const { createAccountService } = require("../../users/application/accountService");
const { createFirestoreUserRepository } = require("../../users/infrastructure/firestoreUserRepository");
const { createFirestoreUserPersonLinkRepository } = require("../../users/infrastructure/firestoreUserPersonLinkRepository");
const { createFirestorePersonRepository } = require("../../persons/infrastructure/firestorePersonRepository");
const { createFirestoreSelfPersonReader } = require("../../infrastructure/firestoreSelfPersonReader");
const groupService = require("../../groups/infrastructure/groupModule");
const seasonService = require("../../groups/infrastructure/seasonModule");
const memberContext = require("../../groups/infrastructure/memberContextModule");
const { createFirestoreGroupRepository } = require("../../groups/infrastructure/firestoreGroupRepository");
const { createFirestoreSelfAccountReader } = require("../../groups/infrastructure/firestoreSelfAccountReader");
const { createMembershipService } = require("../application/membershipService");
const { createFirestoreActiveMembershipGuard } = require("./firestoreActiveMembershipGuard");
const { createFirestoreMembershipRepository } = require("./firestoreMembershipRepository");
const { createFirestoreMembershipLifecycleGuard } = require("./firestoreMembershipLifecycleGuard");
const { createFirestoreMyMembershipReader } = require("./firestoreMyMembershipReader");
const { createFirestoreMyCurrentGroupMembershipsReader } = require("./firestoreMyCurrentGroupMembershipsReader");
const { createMemberGroupContextAdapter, createOpenSeasonContextAdapter, createOwnedGroupContextAdapter, createSelfPersonContextAdapter } = require("./membershipExternalContexts");

const accountService = createAccountService({ userRepository: createFirestoreUserRepository({ db }) });
const selfAccountReader = createFirestoreSelfAccountReader({ accountService });
const personRepository = createFirestorePersonRepository({ db });
const userPersonLinkRepository = createFirestoreUserPersonLinkRepository({ db });
const groupRepository = createFirestoreGroupRepository({ db });
const membershipRepository = createFirestoreMembershipRepository({ db });
const lifecycleGuard = createFirestoreMembershipLifecycleGuard({ db, groupRepository });

module.exports = createMembershipService({
  selfAccountReader,
  selfPersonContext: createSelfPersonContextAdapter({
    selfPersonReader: createFirestoreSelfPersonReader({ personRepository, userRepository: userPersonLinkRepository }),
  }),
  ownedGroupContext: createOwnedGroupContextAdapter({ groupService }),
  openSeasonContext: createOpenSeasonContextAdapter({ seasonService }),
  membershipRepository,
  activeMembershipGuard: createFirestoreActiveMembershipGuard({ db, groupRepository }),
  lifecycleGuard,
  myMembershipReader: createFirestoreMyMembershipReader({ db, groupRepository, membershipRepository }),
  myCurrentGroupMembershipsReader: createFirestoreMyCurrentGroupMembershipsReader({ db, membershipRepository }),
  memberGroupContext: createMemberGroupContextAdapter({ memberContext }),
});
