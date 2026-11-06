import type { OwnRegisteredPayment } from "@/types/AdministrativeReceipt";
import type { Obligation, OwnPaymentApplication, PaymentWaiverEvent, PrincipalCorrectionReason } from "@/types/Payment";
import type { DeliveryDecisionState } from "@/types/PaymentDelivery";

const obligationStates: Record<Obligation["estado"], string> = {
  PENDING: "Pendiente",
  PARTIAL: "Pago parcial",
  SETTLED: "Saldada",
  VOIDED: "Anulada",
};

const noticeStates: Record<DeliveryDecisionState, string> = {
  REPORTED: "En revisión",
  CONFIRMED: "Confirmado",
  REJECTED: "Rechazado",
  RESOLVED_BY_ADMINISTRATIVE_RECEIPT: "Resuelto administrativamente",
};

const correctionReasons: Record<PrincipalCorrectionReason, string> = {
  AMOUNT_ENTRY_ERROR: "Corrección de un importe ingresado",
  WRONG_APPROVED_BASE_AMOUNT: "Corrección del importe base aprobado",
  MEMBERSHIP_EXCEPTION_AMOUNT_ERROR: "Corrección de una excepción de Membresía",
  ARITHMETIC_ERROR: "Corrección de cálculo",
};

const rejectionReasons: Record<string, string> = {
  PAYMENT_NOT_RECEIVED: "El pago no fue recibido",
  AMOUNT_DOES_NOT_MATCH: "El importe no coincide",
  DATE_DOES_NOT_MATCH: "La fecha no coincide",
  DUPLICATE_DELIVERY: "El aviso estaba duplicado",
  OTHER: "Otro motivo",
};

export const obligationStateLabel = (state: unknown) => typeof state === "string" && state in obligationStates
  ? obligationStates[state as Obligation["estado"]]
  : "Estado no disponible";

export const noticeStateLabel = (state: unknown) => typeof state === "string" && state in noticeStates
  ? noticeStates[state as DeliveryDecisionState]
  : "Estado no disponible";

export const correctionReasonLabel = (reason: unknown) => typeof reason === "string" && reason in correctionReasons
  ? correctionReasons[reason as PrincipalCorrectionReason]
  : "Motivo no disponible";

export const rejectionReasonLabel = (reason: unknown) => typeof reason === "string" && reason in rejectionReasons
  ? rejectionReasons[reason]
  : "Motivo no disponible";

export function appliedPaymentLabel(item: Pick<OwnPaymentApplication, "applicationState" | "origin">) {
  if (item.applicationState === "REVERSED") return "Pago revertido";
  if (item.applicationState !== "APPLIED") return "Estado no disponible";
  return item.origin === "INFORMED" ? "Pago confirmado" : item.origin === "ADMINISTRATIVE" ? "Pago registrado" : "Origen no disponible";
}

export function registeredPaymentLabel(item: Pick<OwnRegisteredPayment, "applicationState" | "origin">) {
  if (item.applicationState === "REVERSED") return "Pago revertido";
  if (item.applicationState !== "APPLIED") return "Estado no disponible";
  return item.origin === "INFORMED" ? "Pago confirmado" : item.origin === "ADMINISTRATIVE" ? "Pago registrado" : "Origen no disponible";
}

export function waiverEventLabel(item: Pick<PaymentWaiverEvent, "kind">) {
  if (item.kind === "WAIVER_CREATED") return "Deuda perdonada";
  if (item.kind === "WAIVER_REVERSED") return "Perdón de deuda revertido";
  return "Ajuste no disponible";
}
