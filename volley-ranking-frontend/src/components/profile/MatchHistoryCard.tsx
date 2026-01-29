
"use client";

import Link from "next/link";
import MatchStatusBadge from "../matchCard/MatchStatusBadge";
import PlayerStatusBadge from "./PlayerStatusBadge";
import { formatDateTime } from "@/lib/date";

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

  return (
    <div
      className={`relative border rounded p-4 space-y-2 transition
        ${isEliminado ? "opacity-50" : ""}
        ${!isCancelado ? "hover:shadow-sm" : ""}
      `}
    >
      {/* BADGE MATCH */}
      <div className="absolute top-2 right-2">
        <MatchStatusBadge estado={matchEstado} />
      </div>

      {/* GROUP */}
      <div>
        <p className="font-semibold">{groupNombre}</p>
        {groupDescripcion && (
          <p className="text-sm text-gray-500">
            {groupDescripcion}
          </p>
        )}
      </div>

      {/* FECHA */}
      <p className="text-sm text-gray-600">
        {formatDateTime(horaInicio)}
      </p>

      {/* INFO JUGADOR */}
      <div className="text-sm space-y-1">
        {posicionAsignada && (
          <p>
            <b>Posición:</b> {posicionAsignada}
          </p>
        )}

        <div className="flex items-center gap-2">
          <span className="text-sm">
            <b>Rol:</b>
          </span>
          <PlayerStatusBadge estado={participationEstado} />
        </div>
      </div>

      {/* LINK */}
      {!isCancelado && (
        <Link
          href={`/groups/${groupId}/matches/${matchId}`}
          className="inline-block text-blue-600 text-sm pt-2"
        >
          Ver detalle →
        </Link>
      )}

      {isEliminado && (
        <p className="text-xs text-red-600 pt-1">
          Canceló su participación
        </p>
      )}
    </div>
  );
}
