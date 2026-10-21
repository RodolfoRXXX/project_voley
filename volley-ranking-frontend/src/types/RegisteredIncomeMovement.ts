export type RegisteredIncomeMovementSubject =
  | { status: "AVAILABLE"; firstName: string; lastName: string }
  | { status: "UNAVAILABLE" };

export type RegisteredIncomeMovement = {
  movementId: string;
  receiptId?: string;
  kind: "INCOME_RECORDED" | "RECORD_REVERSAL";
  origin: "INFORMED" | "ADMINISTRATIVE";
  amountMinor: number;
  eventAt: string;
  effectiveOn: string;
  receiptStateAtCutoff: "APPLIED" | "REVERSED";
  subject: RegisteredIncomeMovementSubject;
};

export type RegisteredIncomeMovementResponse = {
  audience: "OWNER" | "TREASURY";
  scope: {
    groupId: string;
    from: string;
    to: string;
    timeZone: "America/Argentina/Buenos_Aires";
    currency: "ARS";
  };
  view: { readCutoffExclusive: string; manifestDigest: string };
  totals: {
    grossRecordedIncomeMinor: number;
    reversedRecordsMinor: number;
    netRegisteredIncomeMinor: number;
    movementCount: number;
  };
  items: RegisteredIncomeMovement[];
};

export type RegisteredIncomeMovementErrorReason =
  | "UNAUTHENTICATED" | "INVALID_DATE_RANGE" | "ACCOUNT_REQUIRED"
  | "GROUP_NOT_ACCESSIBLE" | "GROUP_TREASURY_NOT_AUTHORIZED"
  | "RANGE_TOO_WIDE" | "MOVEMENT_LIMIT_EXCEEDED" | "DATA_INCOMPATIBLE"
  | "DEPENDENCY_UNAVAILABLE" | "INTERNAL_ERROR";
