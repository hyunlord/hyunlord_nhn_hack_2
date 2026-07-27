import type { AchievementId } from "../content/metaConfig";
import type { HouseId } from "../content/houseConfig";

export const META_STATE_VERSION = 2 as const;

export interface MetaState {
  readonly version: typeof META_STATE_VERSION;
  readonly legacyPoints: number;
  readonly unlockedHouses: readonly HouseId[];
  readonly unlockedAchievements: readonly AchievementId[];
  readonly discoveredSynergies: readonly string[];
  readonly runsPlayed: number;
  readonly bestWaveReached: number;
  readonly victories: number;
  readonly processedRunIds: readonly string[];
  readonly investmentRanks: Readonly<Record<string, number>>;
}
export interface LegacyRewardBreakdown {
  readonly base: number;
  readonly waves: number;
  readonly victory: number;
  readonly survivingAgents: number;
  readonly survivingHalls: number;
  readonly total: number;
}
