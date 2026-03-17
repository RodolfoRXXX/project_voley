export type TournamentMatch = {
  id: string;
  tournamentId: string;
  phase: string;
  round: number;
  homeTeamId: string;
  awayTeamId: string;
  status: "pending";
};
