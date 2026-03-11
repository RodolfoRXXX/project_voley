"use client";

import StatusPill, { type StatusVariant } from "@/components/ui/status/StatusPill";
import { useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import useToast from "@/components/ui/toast/useToast";
import { handleFirebaseError } from "@/lib/errors/handleFirebaseError";
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
}: TournamentRegistrationStatusModalProps) {
  const { showToast } = useToast();
  const updateTournamentRegistrationPaymentFn = httpsCallable(functions, "updateTournamentRegistrationPayment");

  const [paidAmountInput, setPaidAmountInput] = useState(0);
  const [savingPayment, setSavingPayment] = useState(false);

  useEffect(() => {
    if (!registration) return;
    setPaidAmountInput(Number(registration.paidAmount ?? registration.paymentAmount ?? 0));
  }, [registration]);

  if (!open || !registration) return null;

  const statusBadge = getStatusBadge(registration.status);
  const paymentBadge = getPaymentBadge(registration.paymentStatus);
  const expectedAmount = Number(registration.expectedAmount ?? 0);
  const paidAmount = Number(registration.paidAmount ?? registration.paymentAmount ?? 0);
  const pendingAmount = typeof registration.pendingAmount === "number"
    ? registration.pendingAmount
    : Math.max(expectedAmount - paidAmount, 0);

  const onConfirmPayment = async () => {
    try {
      setSavingPayment(true);

      await updateTournamentRegistrationPaymentFn({
        registrationId: registration.id,
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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl w-full max-w-xl p-6 space-y-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-neutral-900">Estado de inscripción</h2>
            <p className="text-xs text-neutral-500">Detalle administrativo del registro del equipo.</p>
          </div>

          <button
            onClick={onClose}
            className="text-sm font-medium text-neutral-500 hover:text-neutral-700 transition"
          >
            Cerrar
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-neutral-200 p-3">
            <p className="text-xs text-neutral-500">Equipo</p>
            <p className="font-medium text-center text-neutral-900">{registration.nameTeam || "Sin nombre"}</p>
          </div>

          <div className="rounded-xl border border-neutral-200 p-3">
            <p className="text-xs text-neutral-500">Integrantes del equipo</p>
            <p className="font-medium text-center text-neutral-900">{registration.teamMembersCount ?? "-"}</p>
          </div>

          <div className="rounded-xl border border-neutral-200 p-3 space-y-1">
            <p className="text-xs text-neutral-500">Estado de revisión</p>
            <StatusPill label={statusBadge.label} variant={statusBadge.variant} />
          </div>

          <div className="rounded-xl border border-neutral-200 p-3 space-y-1">
            <p className="text-xs text-neutral-500">Estado de pago</p>
            <StatusPill label={paymentBadge.label} variant={paymentBadge.variant} />
          </div>

          <div className="rounded-xl border border-neutral-200 p-3">
            <p className="text-xs text-neutral-500">Monto total esperado</p>
            <p className="font-medium text-center text-neutral-900">${expectedAmount}</p>
          </div>

          <div className="rounded-xl border border-neutral-200 p-3">
            <p className="text-xs text-neutral-500">Monto pagado</p>
            <p className="font-medium text-center text-neutral-900">${paidAmount}</p>
          </div>

          <div className="rounded-xl border border-neutral-200 p-3">
            <p className="text-xs text-neutral-500">Falta pagar</p>
            <p className="font-medium text-center text-neutral-900">${pendingAmount}</p>
          </div>

          <div className="rounded-xl border border-neutral-200 p-3">
            <p className="text-xs text-neutral-500">Revisado por</p>
            <p className="font-medium text-center text-neutral-900">{registration.decidedByUserId || "Pendiente"}</p>
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
          <h3 className="text-sm font-semibold text-neutral-900">Confirmar pago</h3>
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
              disabled={savingPayment}
              className="h-10 rounded-lg bg-neutral-900 text-white text-sm font-medium disabled:opacity-60"
            >
              {savingPayment ? "Guardando..." : "Guardar pago"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
