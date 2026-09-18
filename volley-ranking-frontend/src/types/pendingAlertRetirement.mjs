export function isRetiredLegacyGroupAuthorityAlertValue(alert) {
  return alert?.kind === "group_join_requests_pending"
    || alert?.kind === "group_admin_requests_pending"
    || (alert?.kind === "group_membership_result"
      && ["accepted", "rejected", "removed"].includes(alert?.meta?.decision));
}
