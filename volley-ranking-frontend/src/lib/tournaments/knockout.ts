export const KNOCKOUT_BRACKET_SIZE_BY_START = {
  final: 2,
  semi: 4,
  cuartos: 8,
  octavos: 16,
} as const;

export type KnockoutStartFrom = keyof typeof KNOCKOUT_BRACKET_SIZE_BY_START;

export const KNOCKOUT_ROUND_ORDER: KnockoutStartFrom[] = ["octavos", "cuartos", "semi", "final"];

export function getKnockoutBracketSize(startFrom: KnockoutStartFrom = "semi") {
  return KNOCKOUT_BRACKET_SIZE_BY_START[startFrom];
}

export function getKnockoutRoundLabels(startFrom: KnockoutStartFrom = "semi") {
  const startIndex = KNOCKOUT_ROUND_ORDER.indexOf(startFrom);
  return KNOCKOUT_ROUND_ORDER.slice(startIndex);
}

export function getKnockoutRoundLabel(roundLabel?: string | null) {
  if (roundLabel === "octavos") return "Octavos";
  if (roundLabel === "cuartos") return "Cuartos";
  if (roundLabel === "semi") return "Semifinal";
  if (roundLabel === "final") return "Final";
  return roundLabel || "Cruce";
}

export function getKnockoutPreview(startFrom: KnockoutStartFrom = "semi") {
  return getKnockoutRoundLabels(startFrom).map((roundLabel) => getKnockoutRoundLabel(roundLabel)).join(" → ");
}
