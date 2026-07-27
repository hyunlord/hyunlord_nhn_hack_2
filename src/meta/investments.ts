import { INVESTMENT_TRACKS } from "../content/investmentConfig";
import type {
  InvestmentTrack,
} from "../content/investmentConfig";
import type { HouseId } from "../content/houseConfig";
import type { CardEffect } from "../progression/progression.types";
import type { MetaState } from "./meta.types";

export type PurchaseInvestmentResult =
  | { readonly kind: "purchased"; readonly state: MetaState }
  | { readonly kind: "insufficient_legacy"; readonly state: MetaState }
  | { readonly kind: "max_rank"; readonly state: MetaState }
  | { readonly kind: "locked_house"; readonly state: MetaState }
  | { readonly kind: "unknown_track"; readonly state: MetaState };

export type ResolvedInvestmentEffects = Required<
  Omit<CardEffect, "grantsSkill" | "unitClass">
>;

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

export function investmentCost(
  track: InvestmentTrack,
  currentRank: number,
): number {
  return Math.round(track.baseCost * track.costGrowth ** currentRank);
}

export function canPurchase(
  track: InvestmentTrack,
  currentRank: number,
  legacyPoints: number,
  unlockedHouses: readonly string[],
): boolean {
  if (currentRank >= track.maxRank) {
    return false;
  }
  if (
    track.scope === "house" &&
    (track.houseId === undefined || !unlockedHouses.includes(track.houseId))
  ) {
    return false;
  }
  return legacyPoints >= investmentCost(track, currentRank);
}

export function purchaseInvestment(
  state: MetaState,
  trackId: string,
): PurchaseInvestmentResult {
  const track = INVESTMENT_TRACKS.find((candidate) => candidate.id === trackId);
  if (track === undefined) {
    return { kind: "unknown_track", state };
  }

  const currentRank = state.investmentRanks[track.id] ?? 0;
  if (currentRank >= track.maxRank) {
    return { kind: "max_rank", state };
  }
  if (
    track.scope === "house" &&
    (track.houseId === undefined ||
      !state.unlockedHouses.includes(track.houseId))
  ) {
    return { kind: "locked_house", state };
  }

  const cost = investmentCost(track, currentRank);
  if (state.legacyPoints < cost) {
    return { kind: "insufficient_legacy", state };
  }

  return {
    kind: "purchased",
    state: {
      ...state,
      legacyPoints: state.legacyPoints - cost,
      investmentRanks: {
        ...state.investmentRanks,
        [track.id]: currentRank + 1,
      },
    },
  };
}

function neutralEffects(): ResolvedInvestmentEffects {
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
    divinePowerPerAgentDeath: 0,
    ignoreBreak: false,
    towerCostMultiplier: 1,
    heroRespawnHpMultiplier: 1,
    disableHeroRespawn: false,
  };
}

function appliesToSelectedHouses(
  track: InvestmentTrack,
  selectedHouseIds: readonly HouseId[] | undefined,
): boolean {
  return (
    track.scope === "global" ||
    selectedHouseIds === undefined ||
    (track.houseId !== undefined && selectedHouseIds.includes(track.houseId))
  );
}

export function resolveInvestmentEffects(
  ranks: Readonly<Record<string, number>>,
  selectedHouseIds?: readonly HouseId[],
): ResolvedInvestmentEffects {
  const result = neutralEffects();

  for (const track of INVESTMENT_TRACKS) {
    const rank = ranks[track.id] ?? 0;
    if (rank <= 0 || !appliesToSelectedHouses(track, selectedHouseIds)) {
      continue;
    }
    for (const field of MULTIPLIER_FIELDS) {
      result[field] *= (track.effectPerRank[field] ?? 1) ** rank;
    }
    for (const field of BONUS_FIELDS) {
      result[field] += (track.effectPerRank[field] ?? 0) * rank;
    }
    result.ignoreBreak ||= track.effectPerRank.ignoreBreak ?? false;
    result.disableHeroRespawn ||=
      track.effectPerRank.disableHeroRespawn ?? false;
  }

  return result;
}
