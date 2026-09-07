export type AuthoritativeCandidateView = "eligible" | "pending" | "cancelled";

export function resolveAuthoritativeCandidateView(hasPending: boolean, consumedIntentRequiresExplicitRenewal: boolean): AuthoritativeCandidateView {
  if (hasPending) return "pending";
  return consumedIntentRequiresExplicitRenewal ? "cancelled" : "eligible";
}
