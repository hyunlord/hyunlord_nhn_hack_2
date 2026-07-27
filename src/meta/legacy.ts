import {
  HOUSE_UNLOCK_DEFINITIONS,
  type AchievementId,
} from "../content/metaConfig";
import {
  DEFAULT_HOUSE_IDS,
  type HouseId,
} from "../content/houseConfig";
import type { RunSummary } from "../content/runSummary";
import {
  achievementReward,
  evaluateNewAchievements,
} from "./achievements";
import {
  META_STATE_VERSION,
  type LegacyRewardBreakdown,
  type MetaState,
} from "./meta.types";

const EMPTY_REWARD: LegacyRewardBreakdown = {
  base: 0,
  waves: 0,
  victory: 0,
  survivingAgents: 0,
  survivingHalls: 0,
  total: 0,
};

export function createDefaultMetaState(): MetaState {
  return {
    version: META_STATE_VERSION,
    legacyPoints: 0,
    unlockedHouses: DEFAULT_HOUSE_IDS,
    unlockedAchievements: [],
    discoveredSynergies: [],
    runsPlayed: 0,
    bestWaveReached: 0,
    victories: 0,
    processedRunIds: [],
  };
}

export function calculateLegacyReward(
  summary: RunSummary,
): LegacyRewardBreakdown {
  const base = 20;
  const waves = summary.wavesCleared * 25;
  const victory = summary.victory ? 60 : 0;
  const survivingAgents = summary.survivingAgents;
  const survivingHalls = summary.survivingHalls * 15;
  return {
    base,
    waves,
    victory,
    survivingAgents,
    survivingHalls,
    total: base + waves + victory + survivingAgents + survivingHalls,
  };
}

export function legacyForRun(summary: RunSummary): number {
  return calculateLegacyReward(summary).total;
}

export type PurchaseHouseUnlockResult =
  | { readonly kind: "purchased"; readonly state: MetaState }
  | { readonly kind: "already_unlocked"; readonly state: MetaState }
  | { readonly kind: "insufficient_legacy"; readonly state: MetaState }
  | { readonly kind: "prerequisite_locked"; readonly state: MetaState };

export function purchaseHouseUnlock(
  state: MetaState,
  houseId: HouseId,
): PurchaseHouseUnlockResult {
  if (state.unlockedHouses.includes(houseId)) {
    return { kind: "already_unlocked", state };
  }
  const definition = HOUSE_UNLOCK_DEFINITIONS.find(
    (candidate) => candidate.houseId === houseId,
  );
  if (definition === undefined) {
    return { kind: "prerequisite_locked", state };
  }
  const waveReady =
    definition.minimumWaveReached === undefined ||
    state.bestWaveReached >= definition.minimumWaveReached;
  const victoryReady =
    definition.minimumVictories === undefined ||
    state.victories >= definition.minimumVictories;
  if (!waveReady || !victoryReady) {
    return { kind: "prerequisite_locked", state };
  }
  if (state.legacyPoints < definition.legacyCost) {
    return { kind: "insufficient_legacy", state };
  }
  return {
    kind: "purchased",
    state: {
      ...state,
      legacyPoints: state.legacyPoints - definition.legacyCost,
      unlockedHouses: [...state.unlockedHouses, houseId],
    },
  };
}

export type ApplyRunSummaryResult =
  | {
      readonly kind: "applied";
      readonly state: MetaState;
      readonly runLegacy: LegacyRewardBreakdown;
      readonly newAchievementIds: readonly AchievementId[];
      readonly achievementLegacyEarned: number;
    }
  | {
      readonly kind: "already_processed";
      readonly state: MetaState;
      readonly runLegacy: LegacyRewardBreakdown;
      readonly newAchievementIds: readonly AchievementId[];
      readonly achievementLegacyEarned: number;
    };

export function applyRunSummaryToMeta(
  state: MetaState,
  summary: RunSummary,
): ApplyRunSummaryResult {
  if (state.processedRunIds.includes(summary.runId)) {
    return {
      kind: "already_processed",
      state,
      runLegacy: EMPTY_REWARD,
      newAchievementIds: [],
      achievementLegacyEarned: 0,
    };
  }

  const runLegacy = calculateLegacyReward(summary);
  const newAchievementIds = evaluateNewAchievements(
    summary,
    state.unlockedAchievements,
  );
  const achievementLegacyEarned = achievementReward(newAchievementIds);
  const discoveredSynergies = [
    ...new Set([
      ...state.discoveredSynergies,
      ...summary.discoveredSynergyIds,
    ]),
  ];
  const betrayalUnlockedHouses =
    summary.betrayal !== null && !state.unlockedHouses.includes("house_e")
      ? [...state.unlockedHouses, "house_e" as const]
      : state.unlockedHouses;

  return {
    kind: "applied",
    state: {
      ...state,
      legacyPoints:
        state.legacyPoints + runLegacy.total + achievementLegacyEarned,
      unlockedHouses: betrayalUnlockedHouses,
      unlockedAchievements: [
        ...state.unlockedAchievements,
        ...newAchievementIds,
      ],
      discoveredSynergies,
      runsPlayed: state.runsPlayed + 1,
      bestWaveReached: Math.max(
        state.bestWaveReached,
        summary.bestWaveReached,
      ),
      victories: state.victories + (summary.victory ? 1 : 0),
      processedRunIds: [...state.processedRunIds, summary.runId],
    },
    runLegacy,
    newAchievementIds,
    achievementLegacyEarned,
  };
}
