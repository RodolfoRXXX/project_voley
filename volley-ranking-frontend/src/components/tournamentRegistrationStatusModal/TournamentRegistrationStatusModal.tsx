"use client";

import StatusPill, { type StatusVariant } from "@/components/ui/status/StatusPill";
import { useEffect, useMemo, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import useToast from "@/components/ui/toast/useToast";
import { handleFirebaseError } from "@/lib/errors/handleFirebaseError";
import { useConfirm } from "@/components/confirmModal/ConfirmProvider";
import { Spinner } from "@/components/ui/spinner/spinner";
import {
  TournamentRegistrationStatusModalProps,
  RegistrationStatus,
  PaymentStatus,
} from "./TournamentRegistrationStatusModal.types";

function getStatusBadge(status?: RegistrationStatus): {
  label: string;
  variant: StatusVariant;
} {
  switch (status) {
    case "aceptado":
      return { label: "Aceptado", variant: "success" };
    case "rechazado":
      return { label: "Rechazado", variant: "danger" };
    case "pendiente":
    default:
      return { label: "Pendiente", variant: "warning" };
  }
}

function getPaymentBadge(status?: PaymentStatus): {
  label: string;
  variant: StatusVariant;
} {
  if (status === "parcial") {
    return { label: "Parcial", variant: "warning" };
  }

  if (status === "pagado") {
    return { label: "Pagado", variant: "success" };
  }

  return { label: "Pendiente", variant: "warning" };
}

function formatTimestamp(value?: { seconds?: number; toDate?: () => Date }) {
  if (value?.toDate) {
    return value.toDate().toLocaleString("es-AR", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  if (!value?.seconds) return "-";

  return new Date(value.seconds * 1000).toLocaleString("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function TournamentRegistrationStatusModal({
  open,
  onClose,
  onUpdated,
  registration,
  tournamentMinPlayers,
  tournamentMaxPlayers,
  isTournamentFinalized = false,
}: TournamentRegistrationStatusModalProps) {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const updateTournamentRegistrationPaymentFn = httpsCallable(functions, "updateTournamentRegistrationPayment");
  const reviewTournamentRegistrationFn = httpsCallable(functions, "reviewTournamentRegistration");

  const [paidAmountInput, setPaidAmountInput] = useState(0);
  const [savingPayment, setSavingPayment] = useState(false);
  const [reviewing, setReviewing] = useState<"aceptado" | "rechazado" | "equipo_rechazado" | null>(null);
  useEffect(() => {
    setPaidAmountInput(0);
  }, [registration]);

  const teamMembersCount = Array.isArray(registration?.playerIds)
    ? registration.playerIds.length
    : Number(registration?.teamMembersCount ?? 0);

  const missingConditions = useMemo(() => {
    const issues: string[] = [];

    if (registration?.paymentStatus !== "pagado") {
      issues.push("El estado de pago debe ser 'Pagado'");
    }

    if (typeof tournamentMinPlayers === "number" && teamMembersCount < tournamentMinPlayers) {
      issues.push(`El equipo debe tener al menos ${tournamentMinPlayers} integrantes`);
    }

    if (typeof tournamentMaxPlayers === "number" && teamMembersCount > tournamentMaxPlayers) {
      issues.push(`El equipo debe tener como máximo ${tournamentMaxPlayers} integrantes`);
    }

    return issues;
  }, [registration?.paymentStatus, teamMembersCount, tournamentMaxPlayers, tournamentMinPlayers]);

  if (!open || !registration) return null;

  const statusBadge = getStatusBadge(registration.status);
  const paymentBadge = getPaymentBadge(registration.paymentStatus);
  const expectedAmount = Number(registration.expectedAmount ?? 0);
  const paidAmount = Number(registration.paidAmount ?? 0);
  const pendingAmount = typeof registration.pendingAmount === "number"
    ? registration.pendingAmount
    : Math.max(expectedAmount - paidAmount, 0);
  const source = registration.source || "registration";
  const isTeamSource = source === "team";
  const canApprove = missingConditions.length === 0;
  const registrationDate = isTeamSource ? registration.createdAt || registration.registeredAt : registration.registeredAt;

  const onConfirmPayment = async () => {
    const amountToAdd = Number(paidAmountInput || 0);

    if (amountToAdd <= 0) {
      showToast({
        message: "El monto a guardar debe ser mayor a 0",
        type: "error",
      });
      return;
    }

    try {
      setSavingPayment(true);

      await updateTournamentRegistrationPaymentFn({
        registrationId: registration.id,
        source,
        paidAmountToAdd: amountToAdd,
      });

      showToast({
        message: "Pago actualizado",
        type: "success",
      });
      await onUpdated?.();
      onClose();
    } catch (err) {
      handleFirebaseError(err, showToast, "No se pudo actualizar el pago");
    } finally {
      setSavingPayment(false);
    }
  };

  const onReviewRegistration = async (nextStatus: "aceptado" | "rechazado" | "equipo_rechazado") => {
    const firstConfirm = await confirm({
      title: nextStatus === "aceptado" ? "Confirmar aceptación" : "Confirmar rechazo",
      message: nextStatus === "aceptado"
        ? "¿Querés continuar con la aceptación de esta inscripción?"
        : "¿Querés continuar con el rechazo de este equipo?",
      confirmText: "Continuar",
      cancelText: "Cancelar",
      variant: nextStatus === "aceptado" ? "success" : "warning",
    });

    if (!firstConfirm) return;

    const secondConfirm = await confirm({
      title: "Última confirmación",
      message: nextStatus === "aceptado"
        ? "Esta acción aceptará la inscripción y creará el equipo del torneo."
        : "Esta acción marcará la inscripción como rechazada.",
      confirmText: nextStatus === "aceptado" ? "Sí, aceptar" : "Sí, rechazar",
      cancelText: "Volver",
      variant: nextStatus === "aceptado" ? "success" : "danger",
    });

    if (!secondConfirm) return;

    try {
      setReviewing(nextStatus);
      await reviewTournamentRegistrationFn({
        registrationId: registration.id,
        source,
        status: nextStatus === "equipo_rechazado" ? "rechazado" : nextStatus,
        paidAmountInput: Number(paidAmount),
      });

      showToast({
        message: nextStatus === "aceptado" ? "Inscripción aceptada" : "Equipo rechazado",
        type: "success",
      });
      await onUpdated?.();
      onClose();
    } catch (err) {
      handleFirebaseError(err, showToast, "No se pudo actualizar el estado de inscripción");
    } finally {
      setReviewing(null);
    }
  };

  return (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4 py-3">
    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col overflow-hidden">

      {/* HEADER */}
      <div className="flex items-start justify-between gap-4 p-5 border-b border-neutral-200 dark:border-white/10">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
            {registration.nameTeam || registration.name || "Equipo"}
          </h2>

          <div className="flex items-center gap-2">
            <StatusPill label={statusBadge.label} variant={statusBadge.variant} />

            <span className="text-xs text-neutral-500">
              Pago: {
                paymentBadge.label === "Pagado"
                  ? "Completo"
                  : paymentBadge.label === "Parcial"
                  ? "Parcial"
                  : "Pendiente"
              }
            </span>
          </div>

          <div className="text-xs text-neutral-500">
            {teamMembersCount} jugadores
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-sm text-neutral-500 hover:text-neutral-700"
        >
          ✕
        </button>
      </div>

      {/* BODY */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">

        {/* ALERTA CONDICIONES */}
        {!isTeamSource && !canApprove && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <p className="font-medium">No podés aceptar todavía:</p>
            <ul className="list-disc pl-4 mt-1 text-xs space-y-0.5">
              {missingConditions.map((condition) => (
                <li key={condition}>{condition}</li>
              ))}
            </ul>
          </div>
        )}

        {/* PAGO */}
        <div className="rounded-xl border border-neutral-200 dark:border-white/10 p-4 space-y-3">

          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-neutral-900 dark:text-white">
              Pago
            </p>
          </div>

          {/* DETALLE DE PAGO */}
          <div className="text-sm space-y-1 text-neutral-800 dark:text-neutral-200">
            <p>
              <span className="text-neutral-500">Pagado:</span>{" "}
              <span className="font-medium">${paidAmount}</span>
            </p>

            <p>
              <span className="text-neutral-500">Falta:</span>{" "}
              <span className="font-medium">${pendingAmount}</span>
            </p>

            <p className="text-xs text-neutral-400">
              Total: ${expectedAmount}
            </p>
          </div>

          {/* FEEDBACK */}
          <div className="text-xs">
            {pendingAmount === 0 ? (
              <span className="text-emerald-600">✔ Pago completo</span>
            ) : (
              <span className="text-amber-600">⚠️ Falta completar el pago</span>
            )}
          </div>

          {/* INPUT */}
          {!isTournamentFinalized && (
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                value={paidAmountInput}
                onChange={(e) => setPaidAmountInput(Number(e.target.value || 0))}
                className="flex-1 h-9 rounded-lg border border-neutral-300 px-3 text-sm dark:bg-slate-800 dark:border-white/10"
              />

              <button
                onClick={onConfirmPayment}
                disabled={savingPayment || Number(paidAmountInput || 0) <= 0}
                className="h-9 px-3 rounded-lg bg-neutral-900 text-white text-sm hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-black"
              >
                {savingPayment ? <Spinner /> : "Confirmar pago"}
              </button>
            </div>
          )}

        </div>
      </div>

      {/* FOOTER */}
      <div className="p-5 border-t border-neutral-200 dark:border-white/10 flex justify-end gap-2">

        <button
          onClick={() =>
            onReviewRegistration(isTeamSource ? "equipo_rechazado" : "rechazado")
          }
          disabled={isTournamentFinalized || reviewing !== null}
          className="text-sm text-neutral-500 hover:text-red-600"
        >
          {reviewing === "rechazado" || reviewing === "equipo_rechazado"
            ? <Spinner />
            : (isTeamSource ? "Eliminar equipo" : "Rechazar")}
        </button>

        {!isTeamSource && (
          <button
            onClick={() => onReviewRegistration("aceptado")}
            disabled={isTournamentFinalized || !canApprove || reviewing !== null}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
          >
            {reviewing === "aceptado" ? <Spinner /> : "Aceptar"}
          </button>
        )}

      </div>
    </div>
  </div>
);
}
