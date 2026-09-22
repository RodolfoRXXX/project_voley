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
const { createFirestoreSeasonRepository } = require("../../groups/infrastructure/firestoreSeasonRepository");
const { createFirestoreSelfAccountReader } = require("../../groups/infrastructure/firestoreSelfAccountReader");
const { createMembershipService } = require("../application/membershipService");
const { createFirestoreActiveMembershipGuard } = require("./firestoreActiveMembershipGuard");
const { createFirestoreMembershipRepository } = require("./firestoreMembershipRepository");
const { createFirestoreMembershipLifecycleGuard } = require("./firestoreMembershipLifecycleGuard");
const { createFirestoreMembershipSelfExitStore } = require("./firestoreMembershipSelfExitStore");
const { createFirestoreMembershipAdministrativeFinalizationStore } = require("./firestoreMembershipAdministrativeFinalizationStore");
const { createFirestoreMyMembershipReader } = require("./firestoreMyMembershipReader");
const { createFirestoreMyCurrentGroupMembershipsReader } = require("./firestoreMyCurrentGroupMembershipsReader");
const { createFirestoreActiveGroupMembersForOwnerReader } = require("./firestoreActiveGroupMembersForOwnerReader");
const { createMemberGroupContextAdapter, createOpenSeasonContextAdapter, createOwnedGroupContextAdapter, createSelfPersonContextAdapter } = require("./membershipExternalContexts");
const { createGroupRosterContextCapability } = require("../../groups/public/groupRosterContextCapability");
const { createActiveGroupMemberPersonCapability } = require("../../persons/public/activeGroupMemberPersonCapability");
const { createAdministrativeMembershipFinalizationContextCapability } = require("../../groups/public/administrativeMembershipFinalizationContextCapability");
const { createAdministrativeMembershipFinalizationPersonCapability } = require("../../persons/public/administrativeMembershipFinalizationPersonCapability");
const { createGroupJoinRequestSeasonCapability } = require("../../groups/public/groupJoinRequestSeasonCapability");

const accountService = createAccountService({ userRepository: createFirestoreUserRepository({ db }) });
const selfAccountReader = createFirestoreSelfAccountReader({ accountService });
const personRepository = createFirestorePersonRepository({ db });
const userPersonLinkRepository = createFirestoreUserPersonLinkRepository({ db });
const groupRepository = createFirestoreGroupRepository({ db });
const membershipRepository = createFirestoreMembershipRepository({ db });
const seasonRepository = createFirestoreSeasonRepository({ db });
const membershipSeasonCapability = createGroupJoinRequestSeasonCapability({ db });
const lifecycleGuard = createFirestoreMembershipLifecycleGuard({ db, groupRepository, seasonCapability: membershipSeasonCapability });
const selfExitStore = createFirestoreMembershipSelfExitStore({
  db,
  membershipRepository,
  groupRepository,
  seasonRepository,
  userPersonLinkRepository,
  personRepository,
  lifecycleGuard,
});
const rosterGroupCapability = createGroupRosterContextCapability({ db });
const rosterPersonCapability = createActiveGroupMemberPersonCapability({ db });
const administrativeFinalizationStore = createFirestoreMembershipAdministrativeFinalizationStore({
  db,
  membershipRepository,
  groupCapability: createAdministrativeMembershipFinalizationContextCapability({ db }),
  personCapability: createAdministrativeMembershipFinalizationPersonCapability({ db }),
});

module.exports = createMembershipService({
  selfAccountReader,
  selfPersonContext: createSelfPersonContextAdapter({
    selfPersonReader: createFirestoreSelfPersonReader({ personRepository, userRepository: userPersonLinkRepository }),
  }),
  ownedGroupContext: createOwnedGroupContextAdapter({ groupService }),
  openSeasonContext: createOpenSeasonContextAdapter({ seasonService }),
  membershipRepository,
  activeMembershipGuard: createFirestoreActiveMembershipGuard({ db, groupRepository, seasonCapability: membershipSeasonCapability }),
  lifecycleGuard,
  selfExitStore,
  administrativeFinalizationStore,
  myMembershipReader: createFirestoreMyMembershipReader({ db, groupRepository, membershipRepository }),
  myCurrentGroupMembershipsReader: createFirestoreMyCurrentGroupMembershipsReader({ db, membershipRepository }),
  memberGroupContext: createMemberGroupContextAdapter({ memberContext }),
  ownerActiveGroupMembersReader: createFirestoreActiveGroupMembersForOwnerReader({
    db,
    membershipRepository,
    groupCapability: rosterGroupCapability,
    personCapability: rosterPersonCapability,
  }),
});
