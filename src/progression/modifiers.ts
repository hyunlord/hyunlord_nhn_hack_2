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
}

const MULTIPLIER_FIELDS = [
  "attackDamageMultiplier",
  "attackIntervalMultiplier",
  "moveSpeedMultiplier",
  "divineRegenMultiplier",
  "divineCostMultiplier",
  "miracleRadiusMultiplier",
  "miracleHealMultiplier",
] as const satisfies readonly (keyof CardEffect)[];

const BONUS_FIELDS = [
  "maxHpBonus",
  "threatSenseRadiusBonus",
  "breakHpRatioDelta",
  "hallDefenseRadiusBonus",
  "tributePerKillBonus",
  "interWaveHealBonus",
] as const satisfies readonly (keyof CardEffect)[];

function neutralModifiers(): ResolvedModifiers {
  return {
    attackDamageMultiplier: 1,
    attackIntervalMultiplier: 1,
    maxHpBonus: 0,
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
  };
}

export function resolveModifiers(
  allCards: readonly CardDefinition[],
  owned: readonly OwnedCard[],
  autoLevelBonus: number,
): ResolvedModifiers {
  const result = neutralModifiers();
  result.attackDamageMultiplier *=
    BALANCE_CONFIG.AUTO_LEVEL_DAMAGE_MULTIPLIER ** autoLevelBonus;
  result.maxHpBonus +=
    BALANCE_CONFIG.AUTO_LEVEL_HP_BONUS * autoLevelBonus;

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
