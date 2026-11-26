export type AdministrativePersonLinkBucket = "PENDING" | "REJECTED" | "PENDING_MERGE";

export type AdministrativePersonLinkCandidate = {
  candidateRef: string;
  firstName: string;
  lastName: string;
  maskedEmail: string;
  originGroupId: string;
  emailRevision: number;
  decisionRevision: number;
};

export type AdministrativePersonLinkDetail = {
  candidateRef: string;
  firstName: string;
  lastName: string;
  maskedEmail: string;
  originGroup: { groupId: string; name: string; archived: boolean };
  participation: null | {
    membershipId: string;
    status: string;
    seasonId: string;
    seasonName: string | null;
    seasonStatus: string | null;
  };
  emailRevision: number;
  decision: "REJECTED" | "RECOGNIZED_PENDING_MERGE" | "ADOPTED" | null;
  decisionRevision: number;
};

export type AdministrativePersonLinkCommandResult = {
  outcome: "REJECTED" | "RECONSIDERED" | "ADOPTED" | "RECOGNIZED_PENDING_MERGE" | "RECOVERED";
  personId: string;
  currentPersonId?: string;
  decisionRevision: number;
  operationRef: string;
};
