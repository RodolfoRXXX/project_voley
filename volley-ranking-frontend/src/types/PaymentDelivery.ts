import type { PersonPresentation } from "./Payment";

export type DeliveryDecisionState = "REPORTED" | "CONFIRMED" | "REJECTED" | "RESOLVED_BY_ADMINISTRATIVE_RECEIPT";
export type DeliveryApplicationState = "APPLIED" | "REVERSED";
export type DeliveryLine = { lineId: string; paymentId: string; selectionMode: "FULL" | "PARTIAL"; requestedAmountMinor: number; conceptName: string; dueDate: string };
export type PaymentDelivery = { deliveryId: string; receiptId?: string; origin?: "INFORMED"; groupId: string; seasonId: string; membershipId: string; declaredPaidOn: string; declaredTotalMinor: number;
  decisionState: DeliveryDecisionState; applicationState?: DeliveryApplicationState; reportedAt: string; confirmedAt?: string; rejectedAt?: string; reversedAt?: string;
  rejection?: { reasonCode: string; reasonNote?: string }; reversal?: { reason: string }; resolution?: { administrativeReceiptId: string; correctedFields: string[]; resolvedAt: string }; lines?: DeliveryLine[]; person?: PersonPresentation };
export type PaymentDeliveryPage = { items: PaymentDelivery[]; nextCursor?: string };
export type ReportedPaymentDeliveryMatch = PaymentDelivery & { matchingPaymentIds: string[] };
type PaymentObligationDetailBase = {
  person: PersonPresentation;
  context: { groupName?: string; seasonName?: string };
  obligation: { concept: { name: string; kind: "MONTHLY" | "ONE_TIME"; version: number; defaultAmountMinor: number }; periodKey?: string; occurrenceName?: string; amountMinor: number; dueDate: string; netConfirmedIncomeMinor: number; balanceMinor: number; estado: "PENDING" | "PARTIAL" | "SETTLED" | "VOIDED"; economicRevision: number; lifecycle?: "VOIDED"; voidedAmountMinor?: number; voidedAt?: string; voidReasonCode?: import("./Payment").VoidReasonCode; voidExplanation?: string; voidedBy?: { label: string } };
  nextCursor?: string;
};
type PaymentObligationApplication = { origin: "INFORMED" | "ADMINISTRATIVE"; eventLabel: "Confirmado" | "Registrado"; effectiveOn: string; eventAt: string; amountMinor: number; applicationState: DeliveryApplicationState; reversedAt?: string; reversalReason?: string };
export type OwnerPaymentObligationDetail = PaymentObligationDetailBase & { audience: "OWNER"; applications: Array<PaymentObligationApplication & { actor: { label: string } }>; pendingNotices: Array<{ deliveryId: string; declaredPaidOn: string; declaredTotalMinor: number; reportedAt: string }> };
export type TreasuryPaymentObligationDetail = PaymentObligationDetailBase & { audience: "TREASURY"; applications: Array<PaymentObligationApplication & { actor: { label: "la administración" } }> };
export type PaymentObligationDetail = OwnerPaymentObligationDetail | TreasuryPaymentObligationDetail;
export type ReviewGrant = { grantId: string; membershipId: string; capabilityId: "GROUP_PAYMENT_NOTICE_REVIEW"; state: "ACTIVE" | "REVOKED" | "LAPSED"; grantedAt: string; revokedAt?: string; person?: PersonPresentation };
export type PaymentDeliveryErrorReason = "UNAUTHENTICATED" | "VALIDATION_FAILED" | "ACCOUNT_REQUIRED" | "PERSON_REQUIRED" | "DELIVERY_NOT_ACCESSIBLE" | "PAYMENT_NOT_ACCESSIBLE" | "DELIVERY_SCOPE_MISMATCH" | "DUPLICATE_DELIVERY_LINE" | "DELIVERY_LINE_LIMIT_EXCEEDED" | "DELIVERY_DRAFT_STALE" | "DELIVERY_STALE_BALANCE" | "DELIVERY_ALREADY_DECIDED" | "PAYMENT_NOTICE_REVIEW_NOT_AUTHORIZED" | "GROUP_TREASURY_NOT_AUTHORIZED" | "SELF_REVIEW_FORBIDDEN" | "PREARCHIVE_PAYMENT_REQUIRED" | "DELIVERY_NOT_REVERSIBLE" | "IDEMPOTENCY_CONFLICT" | "PENDING_RECOVERY" | "INCOMPATIBLE_STATE" | "CONCURRENT_MODIFICATION" | "REVIEW_GRANT_ALREADY_ACTIVE" | "INTERNAL_ERROR";
