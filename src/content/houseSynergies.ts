import type { CardEffect } from "../progression/progression.types";
import type { HouseId } from "./houseConfig";

export interface HouseSynergy {
  readonly id: string;
  readonly houses: readonly [HouseId, HouseId];
  readonly name: string;
  readonly description: string;
  readonly effect: CardEffect;
  readonly hidden: boolean;
}

export const HOUSE_SYNERGIES = [
  {
    id: "wildfire_charge",
    houses: ["house_a", "house_d"],
    name: "Wildfire Charge",
    description: "Ashvale's fury keeps pace with Duskmere's swift assault.",
    effect: { attackIntervalMultiplier: 0.93 },
    hidden: false,
  },
  {
    id: "the_long_wall",
    houses: ["house_b", "house_e"],
    name: "The Long Wall",
    description: "Thornhold and Stonewake extend an unbroken defensive line.",
    effect: { hallDefenseRadiusBonus: 80 },
    hidden: false,
  },
  {
    id: "full_coffers",
    houses: ["house_c", "house_f"],
    name: "Full Coffers",
    description: "Greymoor's harvests fill Highreach's waiting vaults.",
    effect: { tributePerKillBonus: 2 },
    hidden: true,
  },
  {
    id: "ash_and_iron",
    houses: ["house_a", "house_e"],
    name: "Ash and Iron",
    description: "Stonewake tempers Ashvale's flame into living iron.",
    effect: {
      attackDamageMultiplier: 1.08,
      maxHpMultiplier: 1.08,
    },
    hidden: true,
  },
] as const satisfies readonly HouseSynergy[];

export function resolveHouseSynergies(
  houseIds: readonly HouseId[],
): readonly HouseSynergy[] {
  const selected = new Set(houseIds);
  return HOUSE_SYNERGIES.filter(({ houses }) =>
    houses.every((houseId) => selected.has(houseId)),
  );
}

export function previewHouseSynergies(
  houseIds: readonly HouseId[],
  discoveredSynergyIds: readonly string[],
): readonly HouseSynergy[] {
  const discovered = new Set(discoveredSynergyIds);
  return resolveHouseSynergies(houseIds).filter(
    ({ hidden, id }) => !hidden || discovered.has(id),
  );
}
