import type { LocaleKey, LocaleParams } from ".";
import { HOUSE_CONFIG } from "../houseConfig";
import { HOUSE_SYNERGIES } from "../houseSynergies";
import { HERO_DEFINITIONS } from "../heroConfig";
import { INVESTMENT_TRACKS } from "../investmentConfig";
import { ACHIEVEMENT_DEFINITIONS } from "../metaConfig";
import { DIVINE_SKILL_DEFINITIONS } from "../skillConfig";
import { MIRACLE_DEFINITIONS } from "../../divine/miracleTypes";
import { resolveInvestmentEffects } from "../../meta/investments";
import type { CardEffect, CardKind, CardRarity } from "../../progression/progression.types";
import type { HouseId } from "../houseConfig";
import type { UnitClassId } from "../unitClassConfig";
import type { DivineSkillId } from "../../divine/skillTypes";

export type Translate = (key: LocaleKey, params?: LocaleParams) => string;

export type { LocaleKey } from ".";

const UNIT_CLASS_LABEL_KR: Readonly<Record<UnitClassId, string>> = {
  melee: "방벽",
  spear: "돌격",
  archer: "사격",
  skirmisher: "유격",
};

export const HERO_ROLE_BY_ID: Readonly<Record<string, string>> = {
  hero_ashvale: "Sera 결투가",
  hero_thornhold: "Bren 방벽",
  hero_greymoor: "Ivy 지원",
} as const;

type DomainScope =
  | "achievement"
  | "card"
  | "hero"
  | "house"
  | "investment"
  | "skill"
  | "synergy";

function domainKey(
  scope: DomainScope,
  id: string,
  field: "description" | "identity" | "name" | "trait",
): LocaleKey {
  return `${scope}.${id}.${field}` as LocaleKey;
}

export function houseName(_t: (key: LocaleKey) => string, houseId: HouseId): string {
  return HOUSE_CONFIG.find((house) => house.id === houseId)?.name ?? houseId;
}

export function investmentName(_t: (key: LocaleKey) => string, trackId: string): string {
  return INVESTMENT_TRACKS.find((candidate) => candidate.id === trackId)?.name ?? trackId;
}

export function investmentDescription(_t: (key: LocaleKey) => string, trackId: string): string {
  return INVESTMENT_TRACKS.find((candidate) => candidate.id === trackId)?.description ?? "";
}

export function achievementName(_t: (key: LocaleKey) => string, achievementId: string): string {
  return ACHIEVEMENT_DEFINITIONS.find((candidate) => candidate.id === achievementId)?.name ?? achievementId;
}

export function achievementDescription(_t: (key: LocaleKey) => string, achievementId: string): string {
  return ACHIEVEMENT_DEFINITIONS.find((candidate) => candidate.id === achievementId)?.description ?? "";
}

export function synergyName(_t: (key: LocaleKey) => string, synergyId: string): string {
  return HOUSE_SYNERGIES.find((candidate) => candidate.id === synergyId)?.name ?? synergyId;
}

export function synergyDescription(_t: (key: LocaleKey) => string, synergyId: string): string {
  return HOUSE_SYNERGIES.find((candidate) => candidate.id === synergyId)?.description ?? "";
}

export function houseIdentity(_t: (key: LocaleKey) => string, houseId: HouseId): string {
  return HOUSE_CONFIG.find((house) => house.id === houseId)?.identity ?? "";
}

export function houseTrait(_t: (key: LocaleKey) => string, houseId: HouseId): string {
  return HOUSE_CONFIG.find((house) => house.id === houseId)?.identity ?? "";
}

type HeroConfigDefinition = typeof HERO_DEFINITIONS[number];

export function heroName(_t: (key: LocaleKey) => string, heroId: string): string {
  return HERO_DEFINITIONS.find((candidate: HeroConfigDefinition) => candidate.id === heroId)?.name ?? heroId;
}

export function heroRole(_t: (key: LocaleKey) => string, heroId: string): string {
  return HERO_ROLE_BY_ID[heroId] ?? "";
}

function percentFromMultiplier(multiplier: number): string {
  const delta = (multiplier - 1) * 100;
  return `${delta > 0 ? "+" : ""}${Math.round(delta)}%`;
}

export function unitClassLabel(_t: (key: LocaleKey) => string, unitClass: UnitClassId): string {
  return UNIT_CLASS_LABEL_KR[unitClass];
}

export function roleFromComposition(tallies: readonly { readonly unitClass: UnitClassId; readonly count: number }[]): string {
  if (tallies.length === 0) {
    return "";
  }
  const sorted = [...tallies].sort((first, second) => second.count - first.count);
  const topClass = sorted[0]?.unitClass;
  return topClass === undefined ? "" : UNIT_CLASS_LABEL_KR[topClass] ?? "";
}

export function formatCardEffect(effect: CardEffect, t: Translate): string[] {
  const lines: string[] = [];
  if (effect.unitClass !== undefined) {
    lines.push(`병과 전용: ${unitClassLabel(t, effect.unitClass)}`);
  }
  if (effect.attackDamageMultiplier !== undefined) {
    lines.push(t("card.effect.attackDamageMultiplier", { value: percentFromMultiplier(effect.attackDamageMultiplier) }));
  }
  if (effect.attackIntervalMultiplier !== undefined) {
    const speed = (1 - effect.attackIntervalMultiplier) * 100;
    lines.push(`공격 속도 +${Math.round(speed)}%`);
  }
  if (effect.maxHpBonus !== undefined) {
    lines.push(t("card.effect.maxHpBonus", { value: effect.maxHpBonus }));
  }
  if (effect.moveSpeedMultiplier !== undefined) {
    const delta = (effect.moveSpeedMultiplier - 1) * 100;
    lines.push(`이동 속도 +${Math.round(delta)}%`);
  }
  if (effect.threatSenseRadiusBonus !== undefined) {
    lines.push(t("card.effect.threatSenseRadiusBonus", { value: effect.threatSenseRadiusBonus }));
  }
  if (effect.breakHpRatioDelta !== undefined) {
    lines.push(t("card.effect.breakHpRatioDelta", { value: Math.round(Math.abs(effect.breakHpRatioDelta) * 100) }));
  }
  if (effect.hallDefenseRadiusBonus !== undefined) {
    lines.push(t("card.effect.hallDefenseRadiusBonus", { value: effect.hallDefenseRadiusBonus }));
  }
  if (effect.divineRegenMultiplier !== undefined) {
    lines.push(t("card.effect.divineRegenMultiplier", { value: percentFromMultiplier(effect.divineRegenMultiplier) }));
  }
  if (effect.miracleRadiusMultiplier !== undefined) {
    lines.push(t("card.effect.miracleRadiusMultiplier", { value: percentFromMultiplier(effect.miracleRadiusMultiplier) }));
  }
  if (effect.tributePerKillBonus !== undefined) {
    lines.push(t("card.effect.tributePerKillBonus", { value: effect.tributePerKillBonus }));
  }
  if (effect.interWaveHealBonus !== undefined) {
    lines.push(t("card.effect.interWaveHealBonus", { value: effect.interWaveHealBonus }));
  }
  if (effect.grantsSkill !== undefined) {
    const skill = DIVINE_SKILL_DEFINITIONS[effect.grantsSkill];
    lines.push(t("card.effect.grantsSkill", { value: skill?.name ?? effect.grantsSkill }));
  }
  return lines;
}

export function miracleName(_t: (key: LocaleKey) => string, miracle: keyof typeof MIRACLE_DEFINITIONS): string {
  return MIRACLE_DEFINITIONS[miracle].label ?? miracle;
}

export function skillName(_t: (key: LocaleKey) => string, skill: DivineSkillId): string {
  return DIVINE_SKILL_DEFINITIONS[skill].name ?? skill;
}

export function skillDescription(_t: (key: LocaleKey) => string, skill: DivineSkillId): string {
  return DIVINE_SKILL_DEFINITIONS[skill].description ?? "";
}

export function cardKindLabel(t: Translate, kind: CardKind): string {
  return t(`card.kind.${kind}` as LocaleKey);
}

export function cardRarityLabel(t: Translate, rarity: CardRarity): string {
  return t(`card.rarity.${rarity}` as LocaleKey);
}

export function cardName(t: Translate, cardId: string): string {
  return t(domainKey("card", cardId, "name"));
}

export function cardDescription(t: Translate, cardId: string): string {
  return t(domainKey("card", cardId, "description"));
}

function effectLabels(
  investmentRanks: Readonly<Record<string, number>>,
  t: Translate,
): readonly string[] {
  const effects = resolveInvestmentEffects(investmentRanks);
  const labels: string[] = [];
  if (effects.maxHpBonus !== 0) {
    labels.push(t("effect.maxHp", { value: `${effects.maxHpBonus > 0 ? "+" : ""}${effects.maxHpBonus}` }));
  }
  if (effects.attackDamageMultiplier !== 1) {
    labels.push(
      t("effect.attack", {
        value: `${Math.round((effects.attackDamageMultiplier - 1) * 100)}%`,
      }),
    );
  }
  if (effects.divineRegenMultiplier !== 1) {
    labels.push(
      t("effect.divineRegen", {
        value: `${Math.round((effects.divineRegenMultiplier - 1) * 100)}%`,
      }),
    );
  }
  if (effects.tributePerKillBonus !== 0) {
    labels.push(t("effect.tribute", { value: effects.tributePerKillBonus }));
  }
  if (effects.breakHpRatioDelta !== 0) {
    labels.push(t("effect.flee", { value: Math.round(effects.breakHpRatioDelta * 100) }));
  }
  if (effects.moveSpeedMultiplier !== 1) {
    labels.push(
      t("effect.speed", {
        value: `${Math.round((effects.moveSpeedMultiplier - 1) * 100)}%`,
      }),
    );
  }
  return labels;
}

function ranksForTracks(
  investmentRanks: Readonly<Record<string, number>>,
  tracks: readonly { readonly id: string }[],
): Readonly<Record<string, number>> {
  const ranks: Record<string, number> = {};
  for (const track of tracks) {
    const rank = investmentRanks[track.id] ?? 0;
    if (rank > 0) {
      ranks[track.id] = rank;
    }
  }
  return ranks;
}

export function localizedActiveBonusGroups(
  t: Translate,
  investmentRanks: Readonly<Record<string, number>>,
): readonly { readonly heading: string; readonly labels: readonly string[] }[] {
  const groups: { readonly heading: string; readonly labels: readonly string[] }[] = [];
  const globalLabels = effectLabels(
    ranksForTracks(
      investmentRanks,
      INVESTMENT_TRACKS.filter((track) => track.scope === "global"),
    ),
    t,
  );
  if (globalLabels.length > 0) {
    groups.push({ heading: t("group.global"), labels: globalLabels });
  }

  for (const house of HOUSE_CONFIG) {
    const houseLabels = effectLabels(
      ranksForTracks(
        investmentRanks,
        INVESTMENT_TRACKS.filter((track) => track.houseId === house.id),
      ),
      t,
    );
    if (houseLabels.length > 0) {
      groups.push({ heading: houseName(t, house.id), labels: houseLabels });
    }
  }
  return groups;
}

export function localizedInvestmentEffectLabel(t: Translate, effect: CardEffect): string {
  const lines = [] as string[];
  if (effect.maxHpBonus !== undefined) {
    lines.push(t("effect.maxHpPerRank", { value: effect.maxHpBonus > 0 ? `+${effect.maxHpBonus}` : effect.maxHpBonus }));
  }
  if (effect.attackDamageMultiplier !== undefined) {
    lines.push(
      t("effect.attackPerRank", {
        value: `${Math.round((effect.attackDamageMultiplier - 1) * 100)}%`,
      }),
    );
  }
  if (effect.divineRegenMultiplier !== undefined) {
    lines.push(
      t("effect.divineRegenPerRank", {
        value: `${Math.round((effect.divineRegenMultiplier - 1) * 100)}%`,
      }),
    );
  }
  if (effect.tributePerKillBonus !== undefined) {
    lines.push(t("effect.tributePerRank", { value: effect.tributePerKillBonus }));
  }
  if (effect.breakHpRatioDelta !== undefined) {
    lines.push(t("effect.fleePerRank", { value: Math.round(effect.breakHpRatioDelta * 100) }));
  }
  if (effect.moveSpeedMultiplier !== undefined) {
    lines.push(
      t("effect.speedPerRank", {
        value: `${Math.round((effect.moveSpeedMultiplier - 1) * 100)}%`,
      }),
    );
  }
  return lines.length === 0 ? t("effect.empty") : lines.join("; ");
}

export function unitTallyByHouse(
  agents: ReadonlyArray<{
    readonly houseId: string;
    readonly unitClass: UnitClassId | undefined;
    readonly isHero?: boolean;
    readonly state?: "idle" | "fleeing" | "fighting" | "helping" | "dead";
  }>,
  houseId: string,
  includeDead = false,
): ReadonlyArray<{ readonly unitClass: UnitClassId; readonly count: number }> {
  const tally: Record<UnitClassId, number> = {
    melee: 0,
    spear: 0,
    archer: 0,
    skirmisher: 0,
  };
  for (const agent of agents) {
    const { unitClass, isHero: isHeroAgent, state } = agent;
    if (agent.houseId !== houseId || unitClass === undefined || isHeroAgent === true) {
      continue;
    }
    if (!includeDead && state === "dead") {
      continue;
    }
    tally[unitClass] += 1;
  }
  return Object.entries(tally).map(([unitClass, count]) => ({
    unitClass: unitClass as UnitClassId,
    count,
  }));
}
