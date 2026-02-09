
"use client";

import Link from "next/link";
import { formatDateTime } from "@/lib/date";
import StatusPill from "../ui/status/StatusPill";
import { matchStatusMap } from "@/components/ui/status/matchStatusMap";
import { playerStatusMap } from "@/components/ui/status/playerStatusMap";

type Props = {
  matchId: string;
  groupId: string;

  groupNombre: string;
  groupDescripcion?: string;

  horaInicio: Date;

  matchEstado:
    | "abierto"
    | "verificando"
    | "cerrado"
    | "cancelado"
    | "jugado";

  participationEstado:
    | "titular"
    | "suplente"
    | "pendiente"
    | "eliminado";

  posicionAsignada?: string;
};

export default function MatchHistoryCard({
  matchId,
  groupId,
  groupNombre,
  groupDescripcion,
  horaInicio,
  matchEstado,
  participationEstado,
  posicionAsignada,
}: Props) {
  const isEliminado = participationEstado === "eliminado";
  const isCancelado = matchEstado === "cancelado";
  const cfg = matchStatusMap[matchEstado];
  const cfgP = playerStatusMap[participationEstado];

  return (
    <div
      className={`
        border border-neutral-200
        bg-white
        rounded-lg
        p-4
        transition
        ${!isCancelado ? "hover:shadow-sm" : ""}
        ${isEliminado ? "opacity-60" : ""}
      `}
    >
      {/* HEADER */}
      <div className="flex justify-between items-start gap-3">
        <div>
          <p className="font-semibold leading-snug">
            {groupNombre}
          </p>
          {groupDescripcion && (
            <p className="text-sm text-neutral-500">
              {groupDescripcion}
            </p>
          )}
        </div>

        <StatusPill
          label={cfg.label}
          variant={cfg.variant}
          icon={cfg.icon}
          inline
        />
      </div>

      {/* META */}
      <div className="mt-3 grid gap-1 text-sm text-neutral-600">
        <p>{formatDateTime(horaInicio)}</p>

        {posicionAsignada && (
          <p>
            <span className="font-medium">Posición:</span>{" "}
            {posicionAsignada}
          </p>
        )}

        <div className="flex items-center gap-2">
          <span className="font-medium">Rol:</span>
          <StatusPill
            label={cfgP.label}
            variant={cfgP.variant}
            size="sm"
            inline
          />
        </div>
      </div>

      {/* FOOTER */}
      <div className="mt-4 flex items-center justify-between">
        {!isCancelado ? (
          <Link
            href={`/groups/${groupId}/matches/${matchId}`}
            className="
              text-sm font-medium
              text-blue-600
              hover:underline
            "
          >
            Ver detalle →
          </Link>
        ) : (
          <span className="text-xs text-neutral-400 italic">
            Partido cancelado
          </span>
        )}

        {isEliminado && (
          <span className="text-xs text-red-600">
            Cancelaste tu participación
          </span>
        )}
      </div>
    </div>
  );
}
