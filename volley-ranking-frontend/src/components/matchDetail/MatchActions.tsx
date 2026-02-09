// -------------------
// Acciones de un Match
// -------------------

import { ActionButton } from "@/components/ui/action/ActionButton";
import { Match } from "@/types/match";

export type MatchEstado =
  | "abierto"
  | "verificando"
  | "cerrado"
  | "jugado"
  | "cancelado";

type MatchActionsProps = {
  isAdmin: boolean;
  isJoined: boolean;
  isEliminado: boolean;
  match: Match;

  loadingJoinLeave?: boolean;
  hayPagosPendientes?: boolean;

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
  loadingJoinLeave,
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
    <ActionButton
      onClick={onJoin}
      loading={loadingJoinLeave}
      disabled={jugadorBloqueado}
      variant={
        jugadorBloqueado
          ? "secondary"
          : (isJoined ? "danger" : "orange")
      }
      compact
    >
      {jugadorBloqueado
        ? "No disponible"
        : isJoined
        ? "− Salir"
        : "+ Unirme"}
    </ActionButton>
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
            >
              Confirmar cierre
            </ActionButton>

            <ActionButton
              onClick={onReopen}
              variant="secondary"
            >
              Reabrir
            </ActionButton>
          </>
        )}

        {/* Cerrado / Jugado → ver equipos */}
        {(match.estado === "cerrado" ||
          match.estado === "jugado") && (
          <ActionButton
            onClick={onTeams}
            variant="secondary"
          >
            Ver equipos
          </ActionButton>
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
