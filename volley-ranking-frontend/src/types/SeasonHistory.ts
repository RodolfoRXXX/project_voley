export interface OpenSeasonHistory {
  id: string;
  nombre: string;
  fechaInicio: string;
  estado: "abierta";
  isCurrent: true;
}

export interface ClosedSeasonHistory {
  id: string;
  nombre: string;
  fechaInicio: string;
  estado: "cerrada";
  closedAt: string;
  isCurrent: false;
}

export interface SeasonHistoryPage {
  currentSeason: OpenSeasonHistory | null;
  closedSeasons: ClosedSeasonHistory[];
  nextCursor: string | null;
  hasMore: boolean;
}
