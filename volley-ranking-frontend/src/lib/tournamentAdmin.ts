import { Tournament } from "@/types/tournament";

export type AdminAction = {
  label: string;
  disabled: boolean;
  nextStatus?: Tournament["status"];
};

export function canRegister(tournament: Tournament): boolean {
  const acceptedTeamsCount = Number(tournament.acceptedTeamsCount || 0);

  if (acceptedTeamsCount >= tournament.maxTeams) {
    return false;
  }

  return tournament.status === "inscripciones_abiertas";
}

export function getAdminAction(tournament: Tournament): AdminAction {
  if (tournament.status === "draft") {
    return {
      label: "Abrir inscripciones",
      disabled: false,
      nextStatus: "inscripciones_abiertas",
    };
  }

  if (tournament.status === "inscripciones_abiertas") {
    const acceptedTeamsCount = Number(tournament.acceptedTeamsCount || 0);
    const canClose = acceptedTeamsCount >= tournament.minTeams && acceptedTeamsCount <= tournament.maxTeams;

    return {
      label: "Cerrar inscripciones",
      disabled: !canClose,
      nextStatus: "inscripciones_cerradas",
    };
  }

  return {
    label: "",
    disabled: true,
  };
}
