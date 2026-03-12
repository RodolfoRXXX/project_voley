"use client";

import StatusPill, { type StatusVariant } from "@/components/ui/status/StatusPill";
import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase";
import useToast from "@/components/ui/toast/useToast";
import { handleFirebaseError } from "@/lib/errors/handleFirebaseError";
import { useConfirm } from "@/components/confirmModal/ConfirmProvider";
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

function formatTimestamp(value?: { seconds?: number }) {
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
}: TournamentRegistrationStatusModalProps) {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const updateTournamentRegistrationPaymentFn = httpsCallable(functions, "updateTournamentRegistrationPayment");
  const reviewTournamentRegistrationFn = httpsCallable(functions, "reviewTournamentRegistration");

  const [paidAmountInput, setPaidAmountInput] = useState(0);
  const [savingPayment, setSavingPayment] = useState(false);
  const [reviewing, setReviewing] = useState<"aceptado" | "rechazado" | "equipo_rechazado" | null>(null);
  const [loadingSourceData, setLoadingSourceData] = useState(false);
  const [sourceRegistrationId, setSourceRegistrationId] = useState<string | null>(null);

  useEffect(() => {
    if (!registration) return;

    const source = registration.source || "registration";

    if (source === "registration") {
      setSourceRegistrationId(registration.id);
      setPaidAmountInput(Number(registration.paidAmount ?? registration.paymentAmount ?? 0));
      return;
    }

    const linkedRegistrationId = registration.registrationId;

    if (!linkedRegistrationId) {
      setSourceRegistrationId(null);
      setPaidAmountInput(Number(registration.paidAmount ?? registration.paymentAmount ?? 0));
      return;
    }

    setLoadingSourceData(true);

    getDoc(doc(db, "tournamentRegistrations", linkedRegistrationId))
      .then((snap) => {
        if (!snap.exists()) {
          setSourceRegistrationId(linkedRegistrationId);
          setPaidAmountInput(Number(registration.paidAmount ?? registration.paymentAmount ?? 0));
          return;
        }

        const linkedRegistration = snap.data();
        setSourceRegistrationId(linkedRegistrationId);
        setPaidAmountInput(Number(linkedRegistration.paidAmount ?? linkedRegistration.paymentAmount ?? 0));
      })
      .catch(() => {
        setSourceRegistrationId(linkedRegistrationId);
        setPaidAmountInput(Number(registration.paidAmount ?? registration.paymentAmount ?? 0));
      })
      .finally(() => {
        setLoadingSourceData(false);
      });
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
  const paidAmount = Number(registration.paidAmount ?? registration.paymentAmount ?? 0);
  const pendingAmount = typeof registration.pendingAmount === "number"
    ? registration.pendingAmount
    : Math.max(expectedAmount - paidAmount, 0);
  const source = registration.source || "registration";
  const isTeamSource = source === "team";
  const canApprove = missingConditions.length === 0;

  const onConfirmPayment = async () => {
    try {
      setSavingPayment(true);

      await updateTournamentRegistrationPaymentFn({
        registrationId: sourceRegistrationId || registration.id,
        paidAmount: Number(paidAmountInput || 0),
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
        registrationId: sourceRegistrationId || registration.id,
        status: nextStatus === "equipo_rechazado" ? "rechazado" : nextStatus,
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4 py-3 sm:py-6">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-4 p-6 border-b border-neutral-200">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-neutral-900">Estado del equipo</h2>
            <p className="text-xs text-neutral-500">Detalle administrativo del estado del equipo.</p>
          </div>

          <button
            onClick={onClose}
            className="text-sm font-medium text-neutral-500 hover:text-neutral-700 transition"
          >
            Cerrar
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-neutral-200 p-3">
            <p className="text-xs text-neutral-500">Equipo</p>
            <p className="font-medium text-center text-neutral-900">{registration.nameTeam || registration.name || "Sin nombre"}</p>
          </div>

          <div className="rounded-xl border border-neutral-200 p-3">
            <p className="text-xs text-neutral-500">Integrantes del equipo</p>
            <p className="font-medium text-center text-neutral-900">{teamMembersCount}</p>
          </div>

          <div className="rounded-xl border border-neutral-200 p-3 space-y-1">
            <p className="text-xs text-neutral-500">Estado de revisión</p>
            <StatusPill label={statusBadge.label} variant={statusBadge.variant} />
          </div>


          <div className="rounded-xl border border-neutral-200 p-3">
            <p className="text-xs text-neutral-500">Fecha de registro</p>
            <p className="font-medium text-neutral-900">{formatTimestamp(registration.registeredAt)}</p>
          </div>

          <div className="rounded-xl border border-neutral-200 p-3">
            <p className="text-xs text-neutral-500">Última actualización</p>
            <p className="font-medium text-neutral-900">{formatTimestamp(registration.updatedAt)}</p>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-neutral-900">Pago</h3>
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg border border-neutral-200 p-3 space-y-1">
              <p className="text-xs text-neutral-500">Estado de pago</p>
              <StatusPill label={paymentBadge.label} variant={paymentBadge.variant} />
            </div>
            <div className="rounded-lg border border-neutral-200 p-3">
              <p className="text-xs text-neutral-500">Abonado / Esperado</p>
              <p className="font-medium text-neutral-900">${paidAmount} / ${expectedAmount}</p>
            </div>
            <div className="rounded-lg border border-neutral-200 p-3">
              <p className="text-xs text-neutral-500">Pago pendiente</p>
              <p className="font-medium text-neutral-900">${pendingAmount}</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 items-end">
            <label className="text-xs text-neutral-500 space-y-1 block">
              Monto pagado confirmado
              <input
                type="number"
                min={0}
                value={paidAmountInput}
                onChange={(e) => setPaidAmountInput(Number(e.target.value || 0))}
                className="w-full mt-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
              />
            </label>

            <button
              type="button"
              onClick={onConfirmPayment}
              disabled={savingPayment || loadingSourceData || !sourceRegistrationId}
              className="h-10 rounded-lg bg-neutral-900 text-white text-sm font-medium disabled:opacity-60"
            >
              {savingPayment ? "Guardando..." : "Guardar pago"}
            </button>
          </div>

        </div>

        </div>

        <div className="p-6 border-t border-neutral-200 space-y-3">
          {!isTeamSource && !canApprove && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              <p className="font-medium">Faltan condiciones para poder aceptar:</p>
              <ul className="list-disc pl-4 mt-1 space-y-0.5">
                {missingConditions.map((condition) => (
                  <li key={condition}>{condition}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {!isTeamSource && (
              <button
                type="button"
                onClick={() => onReviewRegistration("aceptado")}
                disabled={!canApprove || reviewing !== null}
                className="h-10 rounded-lg bg-emerald-600 px-4 text-white text-sm font-medium disabled:opacity-60"
              >
                {reviewing === "aceptado" ? "Aceptando..." : "Confirmar inscripción"}
              </button>
            )}

            <button
              type="button"
              onClick={() => onReviewRegistration(isTeamSource ? "equipo_rechazado" : "rechazado")}
              disabled={reviewing !== null}
              className="h-10 rounded-lg bg-red-600 px-4 text-white text-sm font-medium disabled:opacity-60"
            >
              {reviewing === "rechazado" || reviewing === "equipo_rechazado"
                ? "Rechazando..."
                : isTeamSource
                  ? "Rechazar equipo"
                  : "Rechazar inscripción"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
