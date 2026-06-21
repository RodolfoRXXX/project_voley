// -------------------
// Acciones de un Match
// -------------------

import { ActionButton } from "@/components/ui/action/ActionButton";
import { Match } from "@/types/match";

type MatchActionsProps = {
  isAdmin: boolean;
  isJoined: boolean;
  isEliminado: boolean;
  match: Match;

  hayPagosPendientes?: boolean;

  loading?: {
    join?: boolean;
    leave?: boolean;
    cancel?: boolean;
    close?: boolean;
    reopen?: boolean;
  };

  onJoin: () => void;
  onCancel: () => void;
  onClose: () => void;
  onReopen: () => void;
  onTeams: () => void;
};


export default function MatchActions({
  isAdmin,
  isJoined,
  isEliminado,
  match,
  loading,
  hayPagosPendientes,
  onJoin,
  onCancel,
  onClose,
  onReopen,
  onTeams,
}: MatchActionsProps) {
  const jugadorBloqueado =
    isEliminado || match.estado !== "abierto";

  /* -----------------------
   * BOTÓN JUGADOR (CTA)
   * --------------------- */
  const renderJugadorAction = () => (
    <>
      <ActionButton
        onClick={onJoin}
        loading={isJoined ? loading?.leave : loading?.join}
        disabled={jugadorBloqueado}
        variant={
          jugadorBloqueado
            ? "secondary"
            : isJoined
            ? "danger"
            : "orange"
        }
        compact
      >
        {jugadorBloqueado
          ? "No disponible"
          : isJoined
          ? "− Salir"
          : "+ Unirme"}
      </ActionButton>

      {(match.estado === "cerrado" ||
        match.estado === "jugado") && (
        <ActionButton
          onClick={onTeams}
          variant="secondary"
          compact
        >
          Ver equipos
        </ActionButton>
      )}

    </>
  );

  return (
  <section className="border-t border-neutral-200 pt-5 space-y-4">

    {/* PARTICIPACIÓN */}
    <div className="flex flex-wrap items-center gap-2">
      {renderJugadorAction()}
    </div>

    {/* ADMINISTRACIÓN */}
    {isAdmin && (
      <div className="border-t border-neutral-200 pt-3 space-y-3">

        <div>
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-neutral-700">
            🛡️ Acciones de administrador
          </span>
        </div>

        <div className="flex flex-wrap gap-2">

          {/* Abierto → cerrar */}
          {match.estado === "abierto" && (
            <ActionButton
              onClick={onClose}
              variant="secondary"
              loading={loading?.close}
              compact
            >
              Cerrar partido
            </ActionButton>
          )}

          {/* Verificando → confirmar */}
          {match.estado === "verificando" && (
            <>
              <ActionButton
                onClick={onClose}
                disabled={hayPagosPendientes}
                variant="success"
                loading={loading?.close}
                compact
              >
                Confirmar cierre
              </ActionButton>

              <ActionButton
                onClick={onReopen}
                loading={loading?.reopen}
                variant="secondary"
                compact
              >
                Reabrir
              </ActionButton>
            </>
          )}

          {/* Acción destructiva al final */}
          <ActionButton
            onClick={onCancel}
            variant="danger_outline"
            loading={loading?.cancel}
            disabled={
              match.estado === "cancelado" ||
              match.estado === "jugado"
            }
            compact
          >
            Cancelar partido
          </ActionButton>

        </div>
      </div>
    )}

  </section>
);
}
