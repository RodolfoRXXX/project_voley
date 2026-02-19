
// -------------------
// Modal de Pago
// -------------------

"use client";

import UserAvatar from "@/components/ui/avatar/UserAvatar";
import { ActionButton } from "@/components/ui/action/ActionButton";
import { useState } from "react";

type PagoModalProps = {
  open: boolean;
  onClose: () => void;
  participation: any | null;
  user: any | null;
  isAdmin: boolean;
  matchEstado: string;
  pagoStyles: Record<string, string>;
  onUpdatePago: (
    participationId: string,
    estado: "confirmado" | "pendiente" | "pospuesto"
  ) => Promise<void>;
};

export default function PagoModal({
  open,
  onClose,
  participation,
  user,
  isAdmin,
  matchEstado,
  pagoStyles,
  onUpdatePago,
}: PagoModalProps) {
  if (!open || !participation) return null;

  const [loadingEstado, setLoadingEstado] = useState<string | null>(null);
  const puedeEditar =
    isAdmin && (matchEstado === "abierto" || matchEstado === "verificando");

    const handleUpdate = async (
      participationId: string,
      estado: "confirmado" | "pendiente" | "pospuesto"
    ) => {
      try {
        setLoadingEstado(estado);
        await onUpdatePago(participationId, estado);
      } finally {
        setLoadingEstado(null);
      }
    };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-5 shadow-xl">

        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-neutral-900">
            Estado de pago
          </h3>
          <p className="text-xs text-neutral-500">
            Gestión administrativa del jugador
          </p>
        </div>

        {/* Jugador */}
        <div className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3">
          <UserAvatar
            nombre={user?.nombre}
            photoURL={user?.photoURL}
            size={40}
          />

          <div className="text-sm leading-tight">
            <p className="font-medium text-neutral-900">
              {user?.nombre ?? "—"}
            </p>
            <p className="text-xs text-neutral-500">
              {participation.posicionAsignada}
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-neutral-50 p-3 text-center">
            <p className="text-xs text-neutral-500">Ranking</p>
            <p className="font-semibold">
              {participation.rankingTitular ?? "—"}
            </p>
          </div>

          <div className="rounded-lg bg-neutral-50 p-3 text-center">
            <p className="text-xs text-neutral-500">Puntaje</p>
            <p className="font-semibold">
              {participation.puntaje ?? "—"}
            </p>
          </div>
        </div>

        {/* Estado actual */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-neutral-900">
            Estado actual
          </p>

          <div className="flex justify-center">
            <div
              className={`px-4 py-2 rounded-full capitalize text-sm font-semibold shadow-sm ${pagoStyles[participation.pagoEstado]}`}
            >
              {participation.pagoEstado}
            </div>
          </div>

        </div>

        {/* Acciones */}
        {puedeEditar && (
          <div className="space-y-3 border-t pt-4">
            <p className="text-sm font-semibold text-neutral-900">
              Cambiar estado
            </p>

            <div className="flex flex-wrap gap-2">
              {["confirmado", "pendiente", "pospuesto"]
                .filter((e) => e !== participation.pagoEstado)
                .map((estado) => {
                  const variant =
                    estado === "confirmado"
                      ? "success"
                      : estado === "pendiente"
                      ? "warning"
                      : "primary";

                  return (
                    <ActionButton
                      key={estado}
                      onClick={() =>
                        handleUpdate(participation.id, estado as any)
                      }
                      variant={variant}
                      compact
                      loading={loadingEstado === estado}
                      disabled={loadingEstado !== null}
                    >
                      {estado}
                    </ActionButton>
                  );
                })}
            </div>

          </div>
        )}

        <div className="pt-4 flex justify-end border-t">
          <button
            onClick={onClose}
            className="text-sm font-medium text-neutral-500 hover:text-neutral-700 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
