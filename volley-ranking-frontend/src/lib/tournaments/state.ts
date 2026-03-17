import type { Tournament, TournamentStatus } from "./fixture";

export function canPublicTeamRegister(tournament: Tournament): boolean {
  const acceptedTeamsCount = tournament.acceptedTeamsCount ?? 0;
  return (
    tournament.status === "inscripciones_abiertas" &&
    acceptedTeamsCount < tournament.maxTeams
  );
}

export function getAdminRegistrationAction(tournament: Tournament): {
  label: "Abrir inscripciones" | "Cerrar inscripciones";
  disabled: boolean;
  nextStatus: TournamentStatus | null;
} {
  const acceptedTeamsCount = tournament.acceptedTeamsCount ?? 0;

  if (tournament.status === "draft") {
    return {
      label: "Abrir inscripciones",
      disabled: false,
      nextStatus: "inscripciones_abiertas",
    };
  }

  if (tournament.status === "inscripciones_abiertas") {
    const canCloseRegistrations =
      acceptedTeamsCount >= tournament.minTeams &&
      acceptedTeamsCount <= tournament.maxTeams;

    return {
      label: "Cerrar inscripciones",
      disabled: !canCloseRegistrations,
      nextStatus: canCloseRegistrations ? "inscripciones_cerradas" : null,
    };
  }

  return {
    label: "Cerrar inscripciones",
    disabled: true,
    nextStatus: null,
  };
}

export function shouldShowMatchesGeneratorSection(
  tournament: Tournament,
): boolean {
  return tournament.status === "inscripciones_cerradas";
}
