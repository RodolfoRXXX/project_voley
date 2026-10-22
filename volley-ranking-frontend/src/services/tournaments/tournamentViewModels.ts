import type { Tournament, TournamentRegistration } from "@/types/tournaments";

export type UserTournamentStateStatus = "NOT_READY" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED";

export type UserTournamentState = {
  status: UserTournamentStateStatus;
  label: string;
  sublabel?: string;
  players: {
    current: number;
    required: number;
  };
  nextAction: string;
};

export function getUserTournamentState(params: {
  tournament: Tournament;
  registration?: TournamentRegistration | null;
  team?: TournamentRegistration | null;
}): UserTournamentState {
  const entry = params.team || params.registration || null;
  const playerIds = Array.isArray(entry?.playerIds)
    ? entry?.playerIds
    : Array.isArray(entry?.playersIds)
      ? entry?.playersIds
      : [];

  const requiredPlayers = Number(params.tournament.minPlayers || 0);
  const currentPlayers = playerIds.length;
  const registrationStatus = params.registration?.status;
  const teamStatus = params.team?.status;
  const isRejected = teamStatus === "rechazado" || registrationStatus === "rechazado";
  const hasAcceptedTeam = teamStatus !== "rechazado" && (Boolean(params.team) || registrationStatus === "aceptado");
  const hasRequiredPlayers = currentPlayers >= requiredPlayers;

  if (isRejected) {
    return {
      status: "REJECTED",
      label: "Rechazado",
      sublabel: "La inscripción de este equipo fue rechazada para este torneo.",
      players: { current: currentPlayers, required: requiredPlayers },
      nextAction: "Revisar el estado de la inscripción",
    };
  }

  if (hasAcceptedTeam) {
    return {
      status: "ACCEPTED",
      label: "Aceptado en el torneo",
      sublabel: "Tu equipo ya está confirmado y habilitado para competir.",
      players: { current: currentPlayers, required: requiredPlayers },
      nextAction: "Ver detalle del equipo",
    };
  }

  if (!hasRequiredPlayers) {
    return {
      status: "NOT_READY",
      label: isRejected ? "Inscripción observada" : "Faltan jugadores",
      sublabel: isRejected
        ? "La inscripción necesita correcciones antes de volver a revisión."
        : "Todavía no alcanzan el mínimo de jugadores para quedar listos.",
      players: { current: currentPlayers, required: requiredPlayers },
      nextAction: "Completar jugadores del equipo",
    };
  }

  return {
    status: "UNDER_REVIEW",
    label: isRejected ? "Requiere nueva revisión" : "Bajo revisión",
    sublabel: isRejected
      ? "Ya cumplen el roster, pero la inscripción fue observada y debe reenviarse."
      : "El equipo está listo y espera la aprobación del torneo.",
    players: { current: currentPlayers, required: requiredPlayers },
    nextAction: isRejected ? "Revisar observaciones y volver a enviar" : "Esperar revisión del torneo",
  };
}
