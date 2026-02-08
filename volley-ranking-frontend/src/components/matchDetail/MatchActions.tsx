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
  const accionesJugadorBloqueadas =
    isEliminado || match.estado !== "abierto";

  return (
    <section className="border-t pt-6">
      <h2 className="text-xl font-semibold mb-3">Acciones</h2>

      <div className="flex gap-3 flex-wrap">
        {/* JUGADOR */}
        <ActionButton
          onClick={onJoin}
          loading={loadingJoinLeave}
          disabled={accionesJugadorBloqueadas}
          variant={isJoined ? "danger" : "success"}
        >
          {accionesJugadorBloqueadas
            ? "No disponible"
            : isJoined
            ? "Desunirme"
            : "Unirme"}
        </ActionButton>

        {/* ADMIN */}
        {isAdmin && (
          <>
            <ActionButton
              onClick={onCancel}
              variant="danger"
              disabled={
                match.estado === "cancelado" ||
                match.estado === "jugado"
              }
            >
              Cancelar juego
            </ActionButton>

            {match.estado === "abierto" && (
              <ActionButton onClick={onClose}>
                Cerrar juego
              </ActionButton>
            )}

            {match.estado === "verificando" && (
              <ActionButton
                onClick={onClose}
                disabled={hayPagosPendientes}
                variant="success"
              >
                Confirmar cierre
              </ActionButton>
            )}

            {match.estado === "verificando" && (
              <ActionButton
                onClick={onReopen}
                variant="warning"
              >
                Reabrir juego
              </ActionButton>
            )}

            {(match.estado === "cerrado" ||
              match.estado === "jugado") && (
              <ActionButton
                onClick={onTeams}
                variant="success"
              >
                Ver equipos
              </ActionButton>
            )}
          </>
        )}
      </div>
    </section>
  );
}
