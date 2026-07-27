import { INVESTMENT_TRACKS } from "./investmentConfig";
import type { HouseId } from "./houseConfig";
import type { CardEffect } from "../progression/progression.types";

export interface StartingHouseModifierEffects {
  readonly houseId: HouseId;
  readonly effects: readonly CardEffect[];
}

export interface StartingModifierBundle {
  readonly globalEffects: readonly CardEffect[];
  readonly globalSharedEffects: readonly CardEffect[];
  readonly houseEffects: readonly StartingHouseModifierEffects[];
}

export const EMPTY_STARTING_MODIFIER_BUNDLE: StartingModifierBundle = {
  globalEffects: [],
  globalSharedEffects: [],
  houseEffects: [],
};

function rankedEffect(effect: CardEffect, rank: number): CardEffect {
  return {
    ...(effect.attackDamageMultiplier === undefined
      ? {}
      : { attackDamageMultiplier: effect.attackDamageMultiplier ** rank }),
    ...(effect.attackIntervalMultiplier === undefined
      ? {}
      : { attackIntervalMultiplier: effect.attackIntervalMultiplier ** rank }),
    ...(effect.maxHpBonus === undefined
      ? {}
      : { maxHpBonus: effect.maxHpBonus * rank }),
    ...(effect.maxHpMultiplier === undefined
      ? {}
      : { maxHpMultiplier: effect.maxHpMultiplier ** rank }),
    ...(effect.moveSpeedMultiplier === undefined
      ? {}
      : { moveSpeedMultiplier: effect.moveSpeedMultiplier ** rank }),
    ...(effect.threatSenseRadiusBonus === undefined
      ? {}
      : { threatSenseRadiusBonus: effect.threatSenseRadiusBonus * rank }),
    ...(effect.breakHpRatioDelta === undefined
      ? {}
      : { breakHpRatioDelta: effect.breakHpRatioDelta * rank }),
    ...(effect.hallDefenseRadiusBonus === undefined
      ? {}
      : { hallDefenseRadiusBonus: effect.hallDefenseRadiusBonus * rank }),
    ...(effect.divineRegenMultiplier === undefined
      ? {}
      : { divineRegenMultiplier: effect.divineRegenMultiplier ** rank }),
    ...(effect.divineCostMultiplier === undefined
      ? {}
      : { divineCostMultiplier: effect.divineCostMultiplier ** rank }),
    ...(effect.miracleRadiusMultiplier === undefined
      ? {}
      : { miracleRadiusMultiplier: effect.miracleRadiusMultiplier ** rank }),
    ...(effect.miracleHealMultiplier === undefined
      ? {}
      : { miracleHealMultiplier: effect.miracleHealMultiplier ** rank }),
    ...(effect.tributePerKillBonus === undefined
      ? {}
      : { tributePerKillBonus: effect.tributePerKillBonus * rank }),
    ...(effect.interWaveHealBonus === undefined
      ? {}
      : { interWaveHealBonus: effect.interWaveHealBonus * rank }),
    ...(effect.heroDamageMultiplier === undefined
      ? {}
      : { heroDamageMultiplier: effect.heroDamageMultiplier ** rank }),
    ...(effect.heroMaxHpMultiplier === undefined
      ? {}
      : { heroMaxHpMultiplier: effect.heroMaxHpMultiplier ** rank }),
    ...(effect.heroRespawnTicksMultiplier === undefined
      ? {}
      : {
          heroRespawnTicksMultiplier:
            effect.heroRespawnTicksMultiplier ** rank,
        }),
    ...(effect.heroAuraRadiusBonus === undefined
      ? {}
      : { heroAuraRadiusBonus: effect.heroAuraRadiusBonus * rank }),
    ...(effect.heroOnKillHeal === undefined
      ? {}
      : { heroOnKillHeal: effect.heroOnKillHeal * rank }),
    ...(effect.divinePowerPerAgentDeath === undefined
      ? {}
      : {
          divinePowerPerAgentDeath:
            effect.divinePowerPerAgentDeath * rank,
        }),
    ...(effect.ignoreBreak === undefined
      ? {}
      : { ignoreBreak: effect.ignoreBreak }),
    ...(effect.towerCostMultiplier === undefined
      ? {}
      : { towerCostMultiplier: effect.towerCostMultiplier ** rank }),
    ...(effect.heroRespawnHpMultiplier === undefined
      ? {}
      : { heroRespawnHpMultiplier: effect.heroRespawnHpMultiplier ** rank }),
    ...(effect.disableHeroRespawn === undefined
      ? {}
      : { disableHeroRespawn: effect.disableHeroRespawn }),
  };
}

function perHouseStartingEffect(effect: CardEffect): CardEffect {
  return {
    ...(effect.attackDamageMultiplier === undefined
      ? {}
      : { attackDamageMultiplier: effect.attackDamageMultiplier }),
    ...(effect.attackIntervalMultiplier === undefined
      ? {}
      : { attackIntervalMultiplier: effect.attackIntervalMultiplier }),
    ...(effect.maxHpBonus === undefined
      ? {}
      : { maxHpBonus: effect.maxHpBonus }),
    ...(effect.maxHpMultiplier === undefined
      ? {}
      : { maxHpMultiplier: effect.maxHpMultiplier }),
    ...(effect.moveSpeedMultiplier === undefined
      ? {}
      : { moveSpeedMultiplier: effect.moveSpeedMultiplier }),
    ...(effect.threatSenseRadiusBonus === undefined
      ? {}
      : { threatSenseRadiusBonus: effect.threatSenseRadiusBonus }),
    ...(effect.breakHpRatioDelta === undefined
      ? {}
      : { breakHpRatioDelta: effect.breakHpRatioDelta }),
    ...(effect.hallDefenseRadiusBonus === undefined
      ? {}
      : { hallDefenseRadiusBonus: effect.hallDefenseRadiusBonus }),
    ...(effect.tributePerKillBonus === undefined
      ? {}
      : { tributePerKillBonus: effect.tributePerKillBonus }),
    ...(effect.heroDamageMultiplier === undefined
      ? {}
      : { heroDamageMultiplier: effect.heroDamageMultiplier }),
    ...(effect.heroMaxHpMultiplier === undefined
      ? {}
      : { heroMaxHpMultiplier: effect.heroMaxHpMultiplier }),
    ...(effect.heroRespawnTicksMultiplier === undefined
      ? {}
      : {
          heroRespawnTicksMultiplier:
            effect.heroRespawnTicksMultiplier,
        }),
    ...(effect.heroAuraRadiusBonus === undefined
      ? {}
      : { heroAuraRadiusBonus: effect.heroAuraRadiusBonus }),
    ...(effect.heroOnKillHeal === undefined
      ? {}
      : { heroOnKillHeal: effect.heroOnKillHeal }),
    ...(effect.divinePowerPerAgentDeath === undefined
      ? {}
      : {
          divinePowerPerAgentDeath:
            effect.divinePowerPerAgentDeath,
        }),
    ...(effect.ignoreBreak === undefined
      ? {}
      : { ignoreBreak: effect.ignoreBreak }),
    ...(effect.towerCostMultiplier === undefined
      ? {}
      : { towerCostMultiplier: effect.towerCostMultiplier }),
    ...(effect.heroRespawnHpMultiplier === undefined
      ? {}
      : { heroRespawnHpMultiplier: effect.heroRespawnHpMultiplier }),
    ...(effect.disableHeroRespawn === undefined
      ? {}
      : { disableHeroRespawn: effect.disableHeroRespawn }),
  };
}

function sharedStartingEffect(effect: CardEffect): CardEffect {
  return {
    ...(effect.divineRegenMultiplier === undefined
      ? {}
      : { divineRegenMultiplier: effect.divineRegenMultiplier }),
    ...(effect.divineCostMultiplier === undefined
      ? {}
      : { divineCostMultiplier: effect.divineCostMultiplier }),
    ...(effect.miracleRadiusMultiplier === undefined
      ? {}
      : { miracleRadiusMultiplier: effect.miracleRadiusMultiplier }),
    ...(effect.miracleHealMultiplier === undefined
      ? {}
      : { miracleHealMultiplier: effect.miracleHealMultiplier }),
    ...(effect.interWaveHealBonus === undefined
      ? {}
      : { interWaveHealBonus: effect.interWaveHealBonus }),
  };
}

export function deriveStartingModifierBundle(
  investmentRanks: Readonly<Record<string, number>>,
): StartingModifierBundle {
  const globalEffects: CardEffect[] = [];
  const globalSharedEffects: CardEffect[] = [];
  const houseEffects = new Map<HouseId, CardEffect[]>();

  for (const track of INVESTMENT_TRACKS) {
    const rank = investmentRanks[track.id] ?? 0;
    if (rank <= 0) {
      continue;
    }
    const effect = rankedEffect(track.effectPerRank, rank);
    if (track.scope === "global") {
      const perHouseEffect = perHouseStartingEffect(effect);
      const sharedEffect = sharedStartingEffect(effect);
      if (Object.keys(perHouseEffect).length > 0) {
        globalEffects.push(perHouseEffect);
      }
      if (Object.keys(sharedEffect).length > 0) {
        globalSharedEffects.push(sharedEffect);
      }
      continue;
    }
    if (track.houseId === undefined) {
      continue;
    }
    const effects = houseEffects.get(track.houseId) ?? [];
    effects.push(effect);
    houseEffects.set(track.houseId, effects);
  }

  return {
    globalEffects,
    globalSharedEffects,
    houseEffects: [...houseEffects.entries()].map(([houseId, effects]) => ({
      houseId,
      effects,
    })),
  };
}
