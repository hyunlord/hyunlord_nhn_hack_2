import { BALANCE_CONFIG } from "../content/balanceConfig";
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
  };
}

export function resolveModifiers(
  allCards: readonly CardDefinition[],
  owned: readonly OwnedCard[],
  autoLevelBonus: number,
  baseEffects: readonly CardEffect[] = [],
): ResolvedModifiers {
  const result = neutralModifiers();
  result.attackDamageMultiplier *=
    BALANCE_CONFIG.AUTO_LEVEL_DAMAGE_MULTIPLIER ** autoLevelBonus;
  result.maxHpBonus +=
    BALANCE_CONFIG.AUTO_LEVEL_HP_BONUS * autoLevelBonus;

  for (const effect of baseEffects) {
    for (const field of MULTIPLIER_FIELDS) {
      result[field] *= effect[field] ?? 1;
    }
    for (const field of BONUS_FIELDS) {
      result[field] += effect[field] ?? 0;
    }
  }

  for (const { cardId, stacks } of owned) {
    const effect = allCards.find(({ id }) => id === cardId)?.effect;
    if (effect === undefined) {
      continue;
    }
    for (const field of MULTIPLIER_FIELDS) {
      result[field] *= (effect[field] ?? 1) ** stacks;
    }
    for (const field of BONUS_FIELDS) {
      result[field] += (effect[field] ?? 0) * stacks;
    }
  }
  return result;
}
