import type { HouseId } from "./houseConfig";

export const ACHIEVEMENT_IDS = [
  "first_stand",
  "unbroken",
  "pyrrhic",
  "no_towers",
  "hero_less",
  "betrayed",
] as const;

export type AchievementId = (typeof ACHIEVEMENT_IDS)[number];

export interface AchievementDefinition {
  readonly id: AchievementId;
  readonly name: string;
  readonly description: string;
  readonly legacyReward: number;
}

export const ACHIEVEMENT_DEFINITIONS = [
  {
    id: "first_stand",
    name: "First Stand",
    description: "Complete any run.",
    legacyReward: 25,
  },
  {
    id: "unbroken",
    name: "Unbroken",
    description: "Win with all three halls still standing.",
    legacyReward: 75,
  },
  {
    id: "pyrrhic",
    name: "Pyrrhic Victory",
    description: "Win with fewer than ten surviving agents.",
    legacyReward: 50,
  },
  {
    id: "no_towers",
    name: "Old Ways",
    description: "Win without building a tower.",
    legacyReward: 60,
  },
  {
    id: "hero_less",
    name: "Without Champions",
    description: "Clear wave two after every hero has fallen.",
    legacyReward: 50,
  },
  {
    id: "betrayed",
    name: "The Rot Within",
    description: "Witness a house betray the alliance.",
    legacyReward: 0,
  },
] as const satisfies readonly AchievementDefinition[];

export interface HouseUnlockDefinition {
  readonly houseId: HouseId;
  readonly legacyCost: number;
  readonly minimumWaveReached?: number;
  readonly minimumVictories?: number;
}

export const HOUSE_UNLOCK_DEFINITIONS: readonly HouseUnlockDefinition[] = [
  {
    houseId: "house_d",
    legacyCost: 300,
  },
  {
    houseId: "house_e",
    legacyCost: 500,
    minimumWaveReached: 3,
  },
  {
    houseId: "house_f",
    legacyCost: 800,
    minimumVictories: 1,
  },
] as const;
