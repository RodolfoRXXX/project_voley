export const INVITATION_STATUS_LABELS = Object.freeze({ pending: "Pendiente", accepted: "Aceptada", declined: "Rechazada", cancelled: "Cancelada", expired: "Vencida" });
export const DIRECTORY_CANDIDATE_STATE_LABELS = Object.freeze({ AVAILABLE: "Disponible para invitar", REQUEST_PENDING: "Solicitud de ingreso pendiente", INVITATION_PENDING: "Invitación pendiente", ALREADY_MEMBER: "Ya integra el grupo", UNAVAILABLE: "Ingreso no disponible" });

export const invitationStatusLabel = (status) => INVITATION_STATUS_LABELS[status] || "Estado desconocido";
export const directoryCandidateStateLabel = (state) => DIRECTORY_CANDIDATE_STATE_LABELS[state] || "Estado no disponible";

export function sortGroupInvitations(items) {
  return [...items].sort((left, right) => Number(right.status === "pending") - Number(left.status === "pending")
    || Date.parse(right.createdAt) - Date.parse(left.createdAt)
    || right.invitationId.localeCompare(left.invitationId));
}

export function mergeGroupInvitationPages(current, incoming, reset = false) {
  const merged = new Map((reset ? [] : current).map((item) => [item.invitationId, item]));
  for (const item of incoming) merged.set(item.invitationId, item);
  return sortGroupInvitations([...merged.values()]);
}
