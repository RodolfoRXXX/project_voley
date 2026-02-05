

"use client";

import UserAvatar from "@/components/ui/avatar/UserAvatar";

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

  const puedeEditar =
    isAdmin && (matchEstado === "abierto" || matchEstado === "verificando");

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6 space-y-4">

        <h3 className="text-xl font-semibold">
          Estado de pago
        </h3>

        {/* Jugador */}
        <div className="flex items-center gap-3">
          <UserAvatar
            nombre={user?.nombre}
            photoURL={user?.photoURL}
            size={40}
          />

          <div className="text-sm">
            <p className="font-medium">
              {user?.nombre ?? "—"}
            </p>
            <p className="text-xs text-gray-500">
              {participation.posicionAsignada}
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="text-sm space-y-1">
          <p><b>Ranking:</b> {participation.rankingTitular ?? "—"}</p>
          <p><b>Puntaje:</b> {participation.puntaje ?? "—"}</p>
        </div>

        {/* Estado actual */}
        <div className="border-t pt-4 space-y-2">
          <p className="text-sm font-semibold">Estado actual</p>

          <div
            className={`border rounded px-3 py-2 text-sm text-center font-medium opacity-60 ${pagoStyles[participation.pagoEstado]}`}
          >
            {participation.pagoEstado}
          </div>
        </div>

        {/* Acciones */}
        {puedeEditar && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">
              Cambiar a
            </p>

            {["confirmado", "pendiente", "pospuesto"]
              .filter((e) => e !== participation.pagoEstado)
              .map((estado) => (
                <button
                  key={estado}
                  onClick={() =>
                    onUpdatePago(participation.id, estado as any)
                  }
                  className={`w-full border rounded px-3 py-2 text-sm hover:opacity-80 ${pagoStyles[estado]}`}
                >
                  {estado}
                </button>
              ))}
          </div>
        )}

        <div className="pt-4 flex justify-end">
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:underline"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
