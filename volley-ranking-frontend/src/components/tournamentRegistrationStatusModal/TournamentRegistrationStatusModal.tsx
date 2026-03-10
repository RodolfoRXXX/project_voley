"use client";

import StatusPill, { type StatusVariant } from "@/components/ui/status/StatusPill";
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
  registration,
}: TournamentRegistrationStatusModalProps) {
  if (!open || !registration) return null;

  const statusBadge = getStatusBadge(registration.status);
  const paymentBadge = getPaymentBadge(registration.paymentStatus);

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
            <p className="font-medium text-neutral-900">{registration.nameTeam || "Sin nombre"}</p>
          </div>

          <div className="rounded-xl border border-neutral-200 p-3">
            <p className="text-xs text-neutral-500">Grupo</p>
            <p className="font-medium text-neutral-900">{registration.groupId || "-"}</p>
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
            <p className="text-xs text-neutral-500">Monto registrado</p>
            <p className="font-medium text-neutral-900">${registration.paymentAmount || 0}</p>
          </div>

          <div className="rounded-xl border border-neutral-200 p-3">
            <p className="text-xs text-neutral-500">Revisado por</p>
            <p className="font-medium text-neutral-900">{registration.decidedByUserId || "Pendiente"}</p>
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
      </div>
    </div>
  );
}
