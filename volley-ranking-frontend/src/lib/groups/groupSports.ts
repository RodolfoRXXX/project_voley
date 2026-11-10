import type { GroupSport } from "@/types/OwnGroup";

export const GROUP_SPORT_OPTIONS: ReadonlyArray<{ value: GroupSport; label: string }> = [
  { value: "voleibol", label: "Vóley" },
  { value: "futbol", label: "Fútbol" },
  { value: "basquet", label: "Básquet" },
  { value: "handball", label: "Handball" },
  { value: "hockey", label: "Hockey" },
  { value: "rugby", label: "Rugby" },
  { value: "tenis", label: "Tenis" },
  { value: "padel", label: "Pádel" },
  { value: "otro", label: "Otro" },
] as const;

const LABELS = new Map(GROUP_SPORT_OPTIONS.map((option) => [option.value, option.label]));
export function groupSportLabel(sport: GroupSport): string { return LABELS.get(sport) ?? sport; }
