import { BALANCE_CONFIG } from "../content/balanceConfig";
import type { UnitClassId } from "../content/unitClassConfig";
import type {
  CardDefinition,
  CardEffect,
  OwnedCard,
} from "./progression.types";

export interface ResolvedModifiers {
  attackDamageMultiplier: number;
  attackIntervalMultiplier: number;
  maxHpBonus: number;
  maxHpMultiplier: number;
  moveSpeedMultiplier: number;
  threatSenseRadiusBonus: number;
  breakHpRatioDelta: number;
  hallDefenseRadiusBonus: number;
  divineRegenMultiplier: number;
  divineCostMultiplier: number;
  miracleRadiusMultiplier: number;
  miracleHealMultiplier: number;
  tributePerKillBonus: number;
  interWaveHealBonus: number;
  heroDamageMultiplier: number;
  heroMaxHpMultiplier: number;
  heroRespawnTicksMultiplier: number;
  heroAuraRadiusBonus: number;
  heroOnKillHeal: number;
  damageTakenMultiplier: number;
  divinePowerPerAgentDeath: number;
  ignoreBreak: boolean;
  towerCostMultiplier: number;
  heroRespawnHpMultiplier: number;
  disableHeroRespawn: boolean;
}

const MULTIPLIER_FIELDS = [
  "attackDamageMultiplier",
  "attackIntervalMultiplier",
  "maxHpMultiplier",
  "moveSpeedMultiplier",
  "divineRegenMultiplier",
  "divineCostMultiplier",
  "miracleRadiusMultiplier",
  "miracleHealMultiplier",
  "heroDamageMultiplier",
  "heroMaxHpMultiplier",
  "heroRespawnTicksMultiplier",
  "towerCostMultiplier",
  "heroRespawnHpMultiplier",
] as const satisfies readonly (keyof CardEffect)[];

const BONUS_FIELDS = [
  "maxHpBonus",
  "threatSenseRadiusBonus",
  "breakHpRatioDelta",
  "hallDefenseRadiusBonus",
  "tributePerKillBonus",
  "interWaveHealBonus",
  "heroAuraRadiusBonus",
  "heroOnKillHeal",
  "divinePowerPerAgentDeath",
] as const satisfies readonly (keyof CardEffect)[];

function neutralModifiers(): ResolvedModifiers {
  return {
    attackDamageMultiplier: 1,
    attackIntervalMultiplier: 1,
    maxHpBonus: 0,
    maxHpMultiplier: 1,
    moveSpeedMultiplier: 1,
    threatSenseRadiusBonus: 0,
    breakHpRatioDelta: 0,
    hallDefenseRadiusBonus: 0,
    divineRegenMultiplier: 1,
    divineCostMultiplier: 1,
    miracleRadiusMultiplier: 1,
    miracleHealMultiplier: 1,
    tributePerKillBonus: 0,
    interWaveHealBonus: 0,
    heroDamageMultiplier: 1,
    heroMaxHpMultiplier: 1,
    heroRespawnTicksMultiplier: 1,
    heroAuraRadiusBonus: 0,
    heroOnKillHeal: 0,
    damageTakenMultiplier: 1,
    divinePowerPerAgentDeath: 0,
    ignoreBreak: false,
    towerCostMultiplier: 1,
    heroRespawnHpMultiplier: 1,
    disableHeroRespawn: false,
  };
}

export function resolveModifiers(
  allCards: readonly CardDefinition[],
  owned: readonly OwnedCard[],
  autoLevelBonus: number,
  baseEffects: readonly CardEffect[] = [],
  unitClass?: UnitClassId,
): ResolvedModifiers {
  const result = neutralModifiers();
  result.attackDamageMultiplier *=
    BALANCE_CONFIG.AUTO_LEVEL_DAMAGE_MULTIPLIER ** autoLevelBonus;
  result.maxHpBonus +=
    BALANCE_CONFIG.AUTO_LEVEL_HP_BONUS * autoLevelBonus;

  for (const effect of baseEffects) {
    if (
      effect.unitClass !== undefined &&
      effect.unitClass !== unitClass
    ) {
      continue;
    }
    for (const field of MULTIPLIER_FIELDS) {
      result[field] *= effect[field] ?? 1;
    }
    for (const field of BONUS_FIELDS) {
      result[field] += effect[field] ?? 0;
    }
    result.ignoreBreak ||= effect.ignoreBreak ?? false;
    result.disableHeroRespawn ||= effect.disableHeroRespawn ?? false;
  }

  for (const { cardId, stacks } of owned) {
    const effect = allCards.find(({ id }) => id === cardId)?.effect;
    if (effect === undefined) {
      continue;
    }
    if (
      effect.unitClass !== undefined &&
      effect.unitClass !== unitClass
    ) {
      continue;
    }
    for (const field of MULTIPLIER_FIELDS) {
      result[field] *= (effect[field] ?? 1) ** stacks;
    }
    for (const field of BONUS_FIELDS) {
      result[field] += (effect[field] ?? 0) * stacks;
    }
    result.ignoreBreak ||= effect.ignoreBreak ?? false;
    result.disableHeroRespawn ||= effect.disableHeroRespawn ?? false;
  }
  return result;
}

export function conditionalModifiers(
  owned: readonly OwnedCard[],
  situation: {
    readonly hallLowestHpRatio: number;
    readonly agentHpRatio: number;
  },
): Partial<ResolvedModifiers> {
  const ownedIds = new Set(
    owned.filter(({ stacks }) => stacks > 0).map(({ cardId }) => cardId),
  );
  return {
    ...(ownedIds.has("legend_last_bastion") &&
    situation.hallLowestHpRatio < 0.25
      ? { attackDamageMultiplier: 1.3 }
      : {}),
    ...(ownedIds.has("legend_ironblood") &&
    situation.agentHpRatio < 0.4
      ? { damageTakenMultiplier: 0.65 }
      : {}),
  };
}
