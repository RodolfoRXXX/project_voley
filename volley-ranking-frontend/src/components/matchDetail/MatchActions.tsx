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

  /* -----------------------
   * ACCIONES ADMIN
   * --------------------- */
  const renderAdminActions = () => {
    if (!isAdmin) return null;

    return (
      <>
        {/* Cancelar (peligrosa, sobria) */}
        <ActionButton
          onClick={onCancel}
          variant="danger_outline"
          loading={loading?.cancel}
          disabled={
            match.estado === "cancelado" ||
            match.estado === "jugado"
          }
        >
          Cancelar
        </ActionButton>

        {/* Abierto → cerrar */}
        {match.estado === "abierto" && (
          <ActionButton
            onClick={onClose}
            variant="primary"
            loading={loading?.close}
          >
            Cerrar match
          </ActionButton>
        )}

        {/* Verificando → confirmar / reabrir */}
        {match.estado === "verificando" && (
          <>
            <ActionButton
              onClick={onClose}
              disabled={hayPagosPendientes}
              variant="success"
              loading={loading?.close}
            >
              Confirmar cierre
            </ActionButton>

            <ActionButton
              onClick={onReopen}
              loading={loading?.reopen}
              variant="secondary"
            >
              Reabrir
            </ActionButton>
          </>
        )}
      </>
    );
  };

  return (
    <section className="border-t border-neutral-200 pt-5 space-y-3">
      <h2 className="text-base font-medium text-neutral-900">
        Acciones
      </h2>

      <div className="flex flex-wrap gap-2">
        {renderJugadorAction()}
        {renderAdminActions()}
      </div>
    </section>
  );
}
