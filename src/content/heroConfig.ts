import type { HouseId } from "./houseConfig";

export interface HeroDefinition {
  readonly id: string;
  readonly houseId: HouseId;
  readonly name: string;
  readonly hpMultiplier: number;
  readonly damageMultiplier: number;
  readonly attackIntervalMultiplier: number;
  readonly moveSpeedMultiplier: number;
  readonly auraRadius: number;
  readonly auraDamageMultiplier: number;
}

export const HERO_DEFINITIONS: readonly HeroDefinition[] = [
  {
    id: "hero_ashvale",
    houseId: "house_a",
    name: "Sera of the Ember",
    hpMultiplier: 3,
    damageMultiplier: 2.2,
    attackIntervalMultiplier: 0.9,
    moveSpeedMultiplier: 1.1,
    auraRadius: 0,
    auraDamageMultiplier: 1,
  },
  {
    id: "hero_thornhold",
    houseId: "house_b",
    name: "Bren Ironvow",
    hpMultiplier: 4.5,
    damageMultiplier: 1.5,
    attackIntervalMultiplier: 1,
    moveSpeedMultiplier: 0.9,
    auraRadius: 0,
    auraDamageMultiplier: 1,
  },
  {
    id: "hero_greymoor",
    houseId: "house_c",
    name: "Ivy Thornsong",
    hpMultiplier: 2.5,
    damageMultiplier: 1.2,
    attackIntervalMultiplier: 1,
    moveSpeedMultiplier: 1,
    auraRadius: 110,
    auraDamageMultiplier: 1.25,
  },
] as const;
