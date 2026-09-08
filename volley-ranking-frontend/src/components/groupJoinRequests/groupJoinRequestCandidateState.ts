export type AuthoritativeCandidateView = "eligible" | "pending" | "approval-in-progress" | "cancelled";

export function resolveAuthoritativeCandidateView(decisionStatus: "PENDING" | "APPROVAL_IN_PROGRESS" | null, consumedIntentRequiresExplicitRenewal: boolean): AuthoritativeCandidateView {
  if (decisionStatus === "APPROVAL_IN_PROGRESS") return "approval-in-progress";
  if (decisionStatus === "PENDING") return "pending";
  return consumedIntentRequiresExplicitRenewal ? "cancelled" : "eligible";
}
