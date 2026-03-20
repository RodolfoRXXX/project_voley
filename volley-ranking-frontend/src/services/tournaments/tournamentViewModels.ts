import type { Tournament, TournamentRegistration } from "@/types/tournaments";

export type UserTournamentStateStatus = "NOT_READY" | "READY_PENDING_PAYMENT" | "UNDER_REVIEW" | "ACCEPTED";

export type UserTournamentState = {
  status: UserTournamentStateStatus;
  label: string;
  sublabel?: string;
  players: {
    current: number;
    required: number;
  };
  payment: {
    paid: number;
    expected: number;
    status: "pending" | "partial" | "complete";
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
  const paid = Number(entry?.paidAmount ?? 0);
  const expectedFromEntry = typeof entry?.expectedAmount === "number" ? entry.expectedAmount : undefined;
  const paymentForPlayer = Number(
    entry?.paymentForPlayer
    ?? params.tournament.paymentForPlayer
    ?? params.tournament.settings?.paymentPerPlayer
    ?? 0
  );
  const expected = typeof expectedFromEntry === "number"
    ? expectedFromEntry
    : currentPlayers * paymentForPlayer;

  const paymentStatus: UserTournamentState["payment"]["status"] = expected <= 0
    ? "complete"
    : paid <= 0
      ? "pending"
      : paid >= expected
        ? "complete"
        : "partial";

  const registrationStatus = params.registration?.status;
  const hasAcceptedTeam = Boolean(params.team) || registrationStatus === "aceptado";
  const hasRequiredPlayers = currentPlayers >= requiredPlayers;
  const isPaymentComplete = paymentStatus === "complete";
  const isRejected = registrationStatus === "rechazado";

  if (hasAcceptedTeam) {
    return {
      status: "ACCEPTED",
      label: "Aceptado en el torneo",
      sublabel: isPaymentComplete
        ? "Tu equipo ya está confirmado y habilitado para competir."
        : "Tu equipo fue aceptado, pero todavía queda completar el pago.",
      players: { current: currentPlayers, required: requiredPlayers },
      payment: { paid, expected, status: paymentStatus },
      nextAction: isPaymentComplete ? "Ver detalle del equipo" : "Completar el pago pendiente",
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
      payment: { paid, expected, status: paymentStatus },
      nextAction: "Completar jugadores del equipo",
    };
  }

  if (!isPaymentComplete) {
    return {
      status: "READY_PENDING_PAYMENT",
      label: paymentStatus === "partial" ? "Pago parcial" : "Pago pendiente",
      sublabel: "El equipo ya cumple roster mínimo, pero falta completar el pago para avanzar.",
      players: { current: currentPlayers, required: requiredPlayers },
      payment: { paid, expected, status: paymentStatus },
      nextAction: "Registrar o completar el pago",
    };
  }

  return {
    status: "UNDER_REVIEW",
    label: isRejected ? "Requiere nueva revisión" : "Bajo revisión",
    sublabel: isRejected
      ? "Ya cumplen roster y pago, pero la inscripción fue observada y debe reenviarse."
      : "El equipo está listo y espera la aprobación del torneo.",
    players: { current: currentPlayers, required: requiredPlayers },
    payment: { paid, expected, status: paymentStatus },
    nextAction: isRejected ? "Revisar observaciones y volver a enviar" : "Esperar revisión del torneo",
  };
}
