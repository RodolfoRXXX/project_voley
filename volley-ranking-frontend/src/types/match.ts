// `Match` is the social/community match model.
// Tournament play must use `TournamentMatch` from `src/types/tournaments`.
export type MatchEstado =
  | "abierto"
  | "verificando"
  | "cerrado"
  | "jugado"
  | "cancelado";

export type Match = {
  id: string;
  estado: MatchEstado;
  groupId: string;
  visibility?: "group_only" | "public";

  formacion: string;
  cantidadEquipos: number;
  cantidadSuplentes: number;

  horaInicio: any; // o Timestamp si lo usás tipado
  posicionesObjetivo: Record<string, number>;
};
