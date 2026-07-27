import {
  ACHIEVEMENT_IDS,
  type AchievementId,
} from "../content/metaConfig";
import {
  HOUSE_IDS,
  type HouseId,
} from "../content/houseConfig";
import { INVESTMENT_TRACKS } from "../content/investmentConfig";
import { createDefaultMetaState } from "./legacy";
import {
  META_STATE_VERSION,
  type MetaState,
} from "./meta.types";

export const META_STORAGE_KEY = "hyunlord.meta.v1";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isHouseId(value: unknown): value is HouseId {
  return typeof value === "string" && HOUSE_IDS.some((id) => id === value);
}

function isAchievementId(value: unknown): value is AchievementId {
  return (
    typeof value === "string" &&
    ACHIEVEMENT_IDS.some((id) => id === value)
  );
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function parseBaseMetaFields(value: Record<string, unknown>): Omit<
  MetaState,
  "version" | "investmentRanks"
> | null {
  const legacyPoints = value["legacyPoints"];
  const unlockedHouses = value["unlockedHouses"];
  const unlockedAchievements = value["unlockedAchievements"];
  const discoveredSynergies = value["discoveredSynergies"];
  const runsPlayed = value["runsPlayed"];
  const bestWaveReached = value["bestWaveReached"];
  const victories = value["victories"];
  const processedRunIds = value["processedRunIds"];

  if (
    !isNonNegativeInteger(legacyPoints) ||
    !Array.isArray(unlockedHouses) ||
    !unlockedHouses.every(isHouseId) ||
    !Array.isArray(unlockedAchievements) ||
    !unlockedAchievements.every(isAchievementId) ||
    !isStringArray(discoveredSynergies) ||
    !isNonNegativeInteger(runsPlayed) ||
    !isNonNegativeInteger(bestWaveReached) ||
    !isNonNegativeInteger(victories) ||
    !isStringArray(processedRunIds)
  ) {
    return null;
  }

  return {
    legacyPoints,
    unlockedHouses,
    unlockedAchievements,
    discoveredSynergies,
    runsPlayed,
    bestWaveReached,
    victories,
    processedRunIds,
  };
}

function parseInvestmentRanks(
  value: unknown,
): Readonly<Record<string, number>> | null {
  if (!isRecord(value)) {
    return null;
  }

  const ranks: Record<string, number> = {};
  for (const [trackId, rank] of Object.entries(value)) {
    const track = INVESTMENT_TRACKS.find(({ id }) => id === trackId);
    if (
      track === undefined ||
      !isNonNegativeInteger(rank) ||
      rank > track.maxRank
    ) {
      return null;
    }
    ranks[trackId] = rank;
  }
  return ranks;
}

function parseMetaState(value: unknown): MetaState | null {
  if (!isRecord(value)) {
    return null;
  }

  const base = parseBaseMetaFields(value);
  if (base === null) {
    return null;
  }

  if (value["version"] === 1) {
    return {
      version: META_STATE_VERSION,
      ...base,
      investmentRanks: {},
    };
  }

  if (value["version"] !== META_STATE_VERSION) {
    return null;
  }

  const investmentRanks = parseInvestmentRanks(value["investmentRanks"]);
  if (investmentRanks === null) {
    return null;
  }

  return {
    version: META_STATE_VERSION,
    ...base,
    investmentRanks,
  };
}

export function loadMetaState(
  storage: StorageLike,
  key = META_STORAGE_KEY,
): MetaState {
  const raw = storage.getItem(key);
  if (raw === null) {
    return createDefaultMetaState();
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return parseMetaState(parsed) ?? createDefaultMetaState();
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      return createDefaultMetaState();
    }
    throw error;
  }
}

export function saveMetaState(
  storage: StorageLike,
  state: MetaState,
  key = META_STORAGE_KEY,
): void {
  storage.setItem(key, JSON.stringify(state));
}
