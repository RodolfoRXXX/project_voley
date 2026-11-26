import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { AdministrativePersonLinkBucket, AdministrativePersonLinkCandidate, AdministrativePersonLinkCommandResult, AdministrativePersonLinkDetail } from "@/types/AdministrativePersonLink";

const listCall = httpsCallable<{ bucket: AdministrativePersonLinkBucket; pageSize: number; cursor?: string }, { items: AdministrativePersonLinkCandidate[]; nextCursor?: string }>(functions, "listMyAdministrativePersonLinkCandidates");
const detailCall = httpsCallable<{ candidateRef: string }, { candidate: AdministrativePersonLinkDetail; previewToken: string }>(functions, "getMyAdministrativePersonLinkCandidate");
const rejectCall = httpsCallable<{ candidateRef: string; expectedEmailRevision: number; idempotencyKey: string }, AdministrativePersonLinkCommandResult>(functions, "rejectMyAdministrativePersonLinkCandidate");
const reconsiderCall = httpsCallable<{ candidateRef: string; expectedDecisionRevision: number; idempotencyKey: string }, AdministrativePersonLinkCommandResult>(functions, "reconsiderMyAdministrativePersonLinkCandidate");
const recognizeCall = httpsCallable<{ candidateRef: string; expectedEmailRevision: number; previewToken: string; idempotencyKey: string }, AdministrativePersonLinkCommandResult>(functions, "recognizeMyAdministrativePersonLinkCandidate");

export async function listAdministrativePersonLinks(bucket: AdministrativePersonLinkBucket, cursor?: string) { return (await listCall({ bucket, pageSize: 10, ...(cursor ? { cursor } : {}) })).data; }
export async function getAdministrativePersonLink(candidateRef: string) { return (await detailCall({ candidateRef })).data; }
export async function rejectAdministrativePersonLink(candidate: AdministrativePersonLinkCandidate | AdministrativePersonLinkDetail, idempotencyKey: string) { return (await rejectCall({ candidateRef: candidate.candidateRef, expectedEmailRevision: candidate.emailRevision, idempotencyKey })).data; }
export async function reconsiderAdministrativePersonLink(candidate: AdministrativePersonLinkCandidate, idempotencyKey: string) { return (await reconsiderCall({ candidateRef: candidate.candidateRef, expectedDecisionRevision: candidate.decisionRevision, idempotencyKey })).data; }
export async function recognizeAdministrativePersonLink(candidate: AdministrativePersonLinkDetail, previewToken: string, idempotencyKey: string) { return (await recognizeCall({ candidateRef: candidate.candidateRef, expectedEmailRevision: candidate.emailRevision, previewToken, idempotencyKey })).data; }

function reason(error: unknown) {
  if (!error || typeof error !== "object" || !("details" in error) || !error.details || typeof error.details !== "object" || !("reason" in error.details)) return "";
  return String(error.details.reason);
}

export function administrativePersonLinkError(error: unknown) {
  switch (reason(error)) {
    case "EMAIL_NOT_VERIFIED": return "Tu correo primario todavía no está verificado. Verificalo para revisar fichas que puedan pertenecerte.";
    case "CANDIDATE_STALE": return "La ficha o su correo cambiaron durante la revisión. Actualizá el listado.";
    case "ALREADY_CLAIMED": return "La ficha ya fue vinculada por su titular.";
    case "RATE_LIMITED": return "Alcanzaste temporalmente el límite de consultas. Esperá un momento y reintentá.";
    case "FEATURE_DISABLED": return "La vinculación de fichas todavía no está habilitada en este entorno.";
    case "NOT_FOUND": return "La ficha ya no está disponible.";
    case "CONFLICT": return "La decisión cambió en otra sesión. Actualizá el listado.";
    default: return "No pudimos completar la revisión. Reintentá.";
  }
}
