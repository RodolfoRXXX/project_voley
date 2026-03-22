import { getKnockoutBracketSize, type KnockoutStartFrom } from "@/lib/tournaments/knockout";

export type MixedSeedingCriteria = "points" | "group_position" | "setsDiff" | "pointsDiff";
export type MixedBracketMatchup = "standard_seeded" | "1A_vs_2B";

export type MixedStructureConfig = {
  groupCount: number;
  rounds: number;
  qualifyPerGroup: number;
  wildcardsCount: number;
  startFrom: KnockoutStartFrom;
  seedingCriteria: MixedSeedingCriteria;
  crossGroupSeeding: boolean;
  bracketMatchup: MixedBracketMatchup;
};

export type MixedQualificationSummary = {
  groupCount: number;
  rounds: number;
  qualifyPerGroup: number;
  automaticQualified: number;
  wildcardsCount: number;
  totalQualified: number;
  requiredQualified: number;
  configurationValid: boolean;
  missingSlots: number;
  extraSlots: number;
  startFrom: KnockoutStartFrom;
};

export function getMixedQualificationSummary(config: MixedStructureConfig): MixedQualificationSummary {
  const groupCount = Math.max(1, Number(config.groupCount || 1));
  const qualifyPerGroup = Math.max(1, Number(config.qualifyPerGroup || 1));
  const wildcardsCount = Math.max(0, Number(config.wildcardsCount || 0));
  const requiredQualified = getKnockoutBracketSize(config.startFrom);
  const automaticQualified = groupCount * qualifyPerGroup;
  const totalQualified = automaticQualified + wildcardsCount;

  return {
    groupCount,
    rounds: Math.max(1, Number(config.rounds || 1)),
    qualifyPerGroup,
    automaticQualified,
    wildcardsCount,
    totalQualified,
    requiredQualified,
    configurationValid: totalQualified === requiredQualified,
    missingSlots: Math.max(0, requiredQualified - totalQualified),
    extraSlots: Math.max(0, totalQualified - requiredQualified),
    startFrom: config.startFrom,
  };
}

export function getMixedConfigurationMessage(summary: MixedQualificationSummary) {
  if (summary.configurationValid) {
    return `La clasificación cierra: ${summary.totalQualified} equipos alimentan el playoff desde ${summary.startFrom}.`;
  }

  if (summary.missingSlots > 0) {
    return `Con ${summary.groupCount} grupos y playoff desde ${summary.startFrom} necesitás ${summary.requiredQualified} clasificados; hoy faltan ${summary.missingSlots}.`;
  }

  return `La configuración excede el cuadro: sobran ${summary.extraSlots} clasificados para un playoff desde ${summary.startFrom}.`;
}
