
// -------------------
// Helper sharing teams
// -------------------

interface ShareTeamsParams {
  teams: {
    nombre: string;
    jugadores: string[];
  }[];
  usersMap: Record<string, any>;
  participations: Record<string, { position: string }>;
}

export const formatTeamsForShare = ({
  teams,
  usersMap,
  participations,
}: ShareTeamsParams): string => {
  let text = "Equipos generados\n\n";

  teams.forEach((team) => {
    text += `*${team.nombre}*\n`;

    team.jugadores.forEach((userId) => {
      const user = usersMap[userId];
      const position = participations[userId]?.position ?? "-";

      text += `- ${user?.nombre ?? "Jugador"} (${position})\n`;
    });

    text += "\n";
  });

  return text.trim();
};


