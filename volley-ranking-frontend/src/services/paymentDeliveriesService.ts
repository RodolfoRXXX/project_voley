import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { PaymentDelivery, PaymentDeliveryErrorReason, PaymentDeliveryPage, ReviewGrant } from "@/types/PaymentDelivery";

const call = <I, O>(name: string) => httpsCallable<I, O>(functions, name);
const reportCall = call<Record<string, unknown>, { outcome: string; delivery: PaymentDelivery }>("reportOwnPaymentDelivery");
const listMineCall = call<{ membershipId?: string; pageSize?: number; cursor?: string }, PaymentDeliveryPage>("listMyPaymentDeliveries");
const listPendingCall = call<{ groupId: string; decisionState: "REPORTED"; pageSize?: number; cursor?: string }, PaymentDeliveryPage>("listGroupPaymentDeliveries");
const getPendingCall = call<{ groupId: string; deliveryId: string }, PaymentDelivery>("getGroupPaymentDelivery");
const listHistoryCall = call<Record<string, unknown>, PaymentDeliveryPage>("listOwnerConfirmedPaymentDeliveries");
const getHistoryCall = call<{ groupId: string; deliveryId: string }, PaymentDelivery>("getOwnerPaymentDeliveryHistory");
const confirmCall = call<{ groupId: string; deliveryId: string; idempotencyKey: string }, { outcome: string; delivery: PaymentDelivery }>("confirmPaymentDelivery");
const rejectCall = call<{ groupId: string; deliveryId: string; reasonCode: string; reasonNote?: string; idempotencyKey: string }, { outcome: string; delivery: PaymentDelivery }>("rejectPaymentDelivery");
const reverseCall = call<{ groupId: string; deliveryId: string; reason: string; idempotencyKey: string }, { outcome: string; delivery: PaymentDelivery }>("reverseConfirmedPaymentDelivery");
const grantCall = call<{ groupId: string; membershipId: string; idempotencyKey: string }, { outcome: string; grant: ReviewGrant }>("grantGroupPaymentNoticeReviewCapability");
const revokeCall = call<{ groupId: string; grantId: string; idempotencyKey: string }, { outcome: string; grantId: string }>("revokeGroupPaymentNoticeReviewCapability");
const listGrantsCall = call<{ groupId: string; pageSize?: number; cursor?: string }, { items: ReviewGrant[]; nextCursor?: string }>("listGroupPaymentNoticeReviewGrantsForOwner");
const contextCall = call<{ groupId: string }, { canReviewPaymentNotices: true }>("getMyGroupPaymentNoticeReviewContext");

export const newDeliveryKey = () => crypto.randomUUID().replaceAll("-", "");
export const reportOwnPaymentDelivery = async (input: Record<string, unknown>) => (await reportCall(input)).data;
export const listMyPaymentDeliveries = async (input: { membershipId?: string; pageSize?: number; cursor?: string } = {}) => (await listMineCall(input)).data;
export const listGroupPaymentDeliveries = async (input: { groupId: string; decisionState: "REPORTED"; pageSize?: number; cursor?: string }) => (await listPendingCall(input)).data;
export const getGroupPaymentDelivery = async (input: { groupId: string; deliveryId: string }) => (await getPendingCall(input)).data;
export const listOwnerConfirmedPaymentDeliveries = async (input: Record<string, unknown>) => (await listHistoryCall(input)).data;
export const getOwnerPaymentDeliveryHistory = async (input: { groupId: string; deliveryId: string }) => (await getHistoryCall(input)).data;
export const confirmPaymentDelivery = async (input: { groupId: string; deliveryId: string; idempotencyKey: string }) => (await confirmCall(input)).data;
export const rejectPaymentDelivery = async (input: { groupId: string; deliveryId: string; reasonCode: string; reasonNote?: string; idempotencyKey: string }) => (await rejectCall(input)).data;
export const reverseConfirmedPaymentDelivery = async (input: { groupId: string; deliveryId: string; reason: string; idempotencyKey: string }) => (await reverseCall(input)).data;
export const grantPaymentReview = async (input: { groupId: string; membershipId: string; idempotencyKey: string }) => (await grantCall(input)).data;
export const revokePaymentReview = async (input: { groupId: string; grantId: string; idempotencyKey: string }) => (await revokeCall(input)).data;
export const listPaymentReviewGrants = async (input: { groupId: string; pageSize?: number; cursor?: string }) => (await listGrantsCall(input)).data;
export const getMyPaymentReviewContext = async (groupId: string) => (await contextCall({ groupId })).data;
export function deliveryErrorReason(error: unknown): PaymentDeliveryErrorReason { if (typeof error === "object" && error && "details" in error) { const details = (error as { details?: unknown }).details; if (typeof details === "object" && details && "reason" in details) return String((details as { reason: unknown }).reason) as PaymentDeliveryErrorReason; } return "INTERNAL_ERROR"; }
export function deliveryErrorMessage(reason: PaymentDeliveryErrorReason) { return ({ UNAUTHENTICATED: "Tu sesión venció.", VALIDATION_FAILED: "Revisá los datos de la entrega.", ACCOUNT_REQUIRED: "Tu cuenta canónica no está disponible.", PERSON_REQUIRED: "Necesitás una Persona vinculada.", DELIVERY_NOT_ACCESSIBLE: "La entrega no está disponible.", PAYMENT_NOT_ACCESSIBLE: "Una obligación no está disponible.", DELIVERY_SCOPE_MISMATCH: "Las obligaciones deben pertenecer a la misma Membresía y Temporada.", DUPLICATE_DELIVERY_LINE: "Una obligación está repetida.", DELIVERY_LINE_LIMIT_EXCEEDED: "Podés incluir hasta 20 obligaciones.", DELIVERY_DRAFT_STALE: "Cambió un saldo. Recargá y revisá el desglose antes de informar.", DELIVERY_STALE_BALANCE: "La entrega ya no cabe completa. No se aplicó ninguna línea y sigue pendiente.", DELIVERY_ALREADY_DECIDED: "La entrega ya fue decidida.", PAYMENT_NOTICE_REVIEW_NOT_AUTHORIZED: "Tu autorización para revisar entregas ya no está vigente.", SELF_REVIEW_FORBIDDEN: "No podés decidir una entrega vinculada a tu propia deuda.", PREARCHIVE_PAYMENT_REQUIRED: "Una obligación no acredita ser anterior al archivo.", DELIVERY_NOT_REVERSIBLE: "La entrega no puede revertirse.", IDEMPOTENCY_CONFLICT: "La clave de recuperación pertenece a otra intención.", PENDING_RECOVERY: "La respuesta es incierta. Recuperá la misma operación.", INCOMPATIBLE_STATE: "Se detectó un estado económico incompatible.", CONCURRENT_MODIFICATION: "El contexto cambió; actualizá la vista.", REVIEW_GRANT_ALREADY_ACTIVE: "La persona ya tiene una concesión vigente.", INTERNAL_ERROR: "No pudimos completar la operación." } satisfies Record<PaymentDeliveryErrorReason, string>)[reason]; }
export function reviewAccessErrorMessage(reason: PaymentDeliveryErrorReason, operation: "load" | "grant" | "revoke") {
  if (reason === "VALIDATION_FAILED") return operation === "load" ? "No pudimos validar la consulta de accesos." : operation === "grant" ? "No pudimos validar el integrante seleccionado para concederle revisión." : "No pudimos validar la concesión seleccionada para revocarla.";
  if (reason === "PAYMENT_NOTICE_REVIEW_NOT_AUTHORIZED") return "Ya no podés administrar los accesos de revisión de este Grupo.";
  if (reason === "DELIVERY_NOT_ACCESSIBLE" && operation === "revoke") return "La concesión ya no está vigente o no pertenece a este Grupo.";
  if (reason === "REVIEW_GRANT_ALREADY_ACTIVE") return "La persona ya tiene una concesión de revisión vigente.";
  if (reason === "PENDING_RECOVERY") return "La respuesta es incierta. Reintentá exactamente la misma administración de acceso.";
  if (reason === "IDEMPOTENCY_CONFLICT") return "La intención de administrar el acceso ya fue usada con otros datos.";
  if (reason === "CONCURRENT_MODIFICATION") return "Los accesos cambiaron al mismo tiempo. Actualizá la sección.";
  if (reason === "ACCOUNT_REQUIRED") return "Tu cuenta canónica no está disponible para administrar accesos.";
  if (reason === "UNAUTHENTICATED") return "Tu sesión venció.";
  return operation === "load" ? "No pudimos cargar los accesos de revisión." : operation === "grant" ? "No pudimos conceder el acceso de revisión." : "No pudimos revocar el acceso de revisión.";
}
