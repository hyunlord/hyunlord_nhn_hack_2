import type { UnitRoster } from "./unitClassConfig";

// SIZE_OK: pure house configuration data; kept together so roster, trait, and slot values stay auditable.

export type HouseId =
  | "house_a"
  | "house_b"
  | "house_c"
  | "house_d"
  | "house_e"
  | "house_f";

export type HouseSelection = readonly [HouseId, HouseId, HouseId];

export type HouseSelectionValidation =
  | {
      readonly valid: true;
      readonly houseIds: HouseSelection;
    }
  | {
      readonly valid: false;
      readonly reason: "count" | "duplicate" | "unknown";
    };

export interface HouseSpawnSlot {
  readonly id: "north" | "southeast" | "southwest";
  readonly x: number;
  readonly y: number;
}

export type HouseFormationStyle = "charge" | "hold" | "harass";

export interface HouseFormation {
  readonly lineSpacing: number;
  readonly cohesion: number;
  readonly jitter: number;
  readonly style: HouseFormationStyle;
}

export interface SelectedHousePlacement {
  readonly houseId: HouseId;
  readonly slot: HouseSpawnSlot;
}

export interface HouseConfigEntry {
  readonly id: HouseId;
  readonly name: string;
  readonly identity: string;
  readonly color: string;
  readonly initialPower: number;
  readonly unlockedByDefault: boolean;
  readonly roster: UnitRoster;
  readonly startingPopulation: number;
  readonly populationGrowthBase: number;
  readonly populationGrowthPerLevel: number;
  readonly populationCapBase: number;
  readonly populationCapPerLevel: number;
  readonly formation: HouseFormation;
  readonly traits: {
    readonly maxHpMultiplier: number;
    readonly attackDamageMultiplier: number;
    readonly attackIntervalMultiplier: number;
    readonly moveSpeedMultiplier: number;
    readonly aggressionBias: number;
    readonly loyaltyBias: number;
    readonly tributePerKillBonus: number;
  };
}

export const HOUSE_IDS = [
  "house_a",
  "house_b",
  "house_c",
  "house_d",
  "house_e",
  "house_f",
] as const satisfies readonly HouseId[];

export const DEFAULT_HOUSE_IDS = [
  "house_a",
  "house_b",
  "house_c",
] as const satisfies HouseSelection;

export const STRONGHOLD_CENTER = { x: 480, y: 300 } as const;

export const HOUSE_SPAWN_SLOTS = [
  { id: "north", x: 480, y: 185 },
  { id: "southeast", x: 580, y: 358 },
  { id: "southwest", x: 380, y: 358 },
] as const satisfies readonly [
  HouseSpawnSlot,
  HouseSpawnSlot,
  HouseSpawnSlot,
];

export const HOUSE_CONFIG = [
  {
    id: "house_a",
    name: "Ashvale",
    identity: "aggressive skirmishers",
    color: "#e07a45",
    initialPower: 50,
    unlockedByDefault: true,
    roster: { melee: 50, spear: 0, archer: 0, skirmisher: 50 },
    startingPopulation: 26,
    populationGrowthBase: 8,
    populationGrowthPerLevel: 2,
    populationCapBase: 52,
    populationCapPerLevel: 6,
    formation: {
      lineSpacing: 14,
      cohesion: 0.45,
      jitter: 0.35,
      style: "charge",
    },
    traits: {
      maxHpMultiplier: 1,
      attackDamageMultiplier: 1.1,
      attackIntervalMultiplier: 1,
      moveSpeedMultiplier: 1,
      aggressionBias: 12,
      loyaltyBias: 0,
      tributePerKillBonus: 0,
    },
  },
  {
    id: "house_b",
    name: "Thornhold",
    identity: "stubborn defenders",
    color: "#3f6f96",
    initialPower: 50,
    unlockedByDefault: true,
    roster: { melee: 30, spear: 70, archer: 0, skirmisher: 0 },
    startingPopulation: 22,
    populationGrowthBase: 6,
    populationGrowthPerLevel: 2,
    populationCapBase: 44,
    populationCapPerLevel: 5,
    formation: {
      lineSpacing: 11,
      cohesion: 0.7,
      jitter: 0.1,
      style: "hold",
    },
    traits: {
      maxHpMultiplier: 1.2,
      attackDamageMultiplier: 1,
      attackIntervalMultiplier: 1,
      moveSpeedMultiplier: 0.92,
      aggressionBias: 0,
      loyaltyBias: 10,
      tributePerKillBonus: 0,
    },
  },
  {
    id: "house_c",
    name: "Greymoor",
    identity: "steady providers",
    color: "#7bb06a",
    initialPower: 50,
    unlockedByDefault: true,
    roster: { melee: 40, spear: 20, archer: 40, skirmisher: 0 },
    startingPopulation: 25,
    populationGrowthBase: 7,
    populationGrowthPerLevel: 2,
    populationCapBase: 50,
    populationCapPerLevel: 6,
    formation: {
      lineSpacing: 16,
      cohesion: 0.5,
      jitter: 0.2,
      style: "hold",
    },
    traits: {
      maxHpMultiplier: 1.05,
      attackDamageMultiplier: 1,
      attackIntervalMultiplier: 1,
      moveSpeedMultiplier: 1,
      aggressionBias: 0,
      loyaltyBias: 0,
      tributePerKillBonus: 1,
    },
  },
  {
    id: "house_d",
    name: "Duskmere",
    identity: "fast, fragile",
    color: "#63c9c2",
    initialPower: 50,
    unlockedByDefault: false,
    roster: { melee: 0, spear: 0, archer: 30, skirmisher: 70 },
    startingPopulation: 34,
    populationGrowthBase: 10,
    populationGrowthPerLevel: 3,
    populationCapBase: 72,
    populationCapPerLevel: 8,
    formation: {
      lineSpacing: 26,
      cohesion: 0.2,
      jitter: 0.55,
      style: "harass",
    },
    traits: {
      maxHpMultiplier: 0.82,
      attackDamageMultiplier: 1,
      attackIntervalMultiplier: 0.85,
      moveSpeedMultiplier: 1.25,
      aggressionBias: 0,
      loyaltyBias: 0,
      tributePerKillBonus: 0,
    },
  },
  {
    id: "house_e",
    name: "Stonewake",
    identity: "slow, immovable",
    color: "#5a6470",
    initialPower: 50,
    unlockedByDefault: false,
    roster: { melee: 15, spear: 85, archer: 0, skirmisher: 0 },
    startingPopulation: 18,
    populationGrowthBase: 5,
    populationGrowthPerLevel: 1,
    populationCapBase: 36,
    populationCapPerLevel: 4,
    formation: {
      lineSpacing: 9,
      cohesion: 0.85,
      jitter: 0.03,
      style: "hold",
    },
    traits: {
      maxHpMultiplier: 1.45,
      attackDamageMultiplier: 0.9,
      attackIntervalMultiplier: 1,
      moveSpeedMultiplier: 0.78,
      aggressionBias: 0,
      loyaltyBias: 0,
      tributePerKillBonus: 0,
    },
  },
  {
    id: "house_f",
    name: "Highreach",
    identity: "wealth-focused",
    color: "#d9b544",
    initialPower: 50,
    unlockedByDefault: false,
    roster: { melee: 40, spear: 0, archer: 60, skirmisher: 0 },
    startingPopulation: 24,
    populationGrowthBase: 7,
    populationGrowthPerLevel: 2,
    populationCapBase: 48,
    populationCapPerLevel: 5,
    formation: {
      lineSpacing: 22,
      cohesion: 0.35,
      jitter: 0.25,
      style: "harass",
    },
    traits: {
      maxHpMultiplier: 1,
      attackDamageMultiplier: 0.92,
      attackIntervalMultiplier: 1,
      moveSpeedMultiplier: 1,
      aggressionBias: -8,
      loyaltyBias: 0,
      tributePerKillBonus: 3,
    },
  },
] as const satisfies readonly HouseConfigEntry[];

export function houseTraitSummary(houseId: HouseId): string {
  switch (houseId) {
    case "house_a":
      return "+10% damage, +12 aggression";
    case "house_b":
      return "+20% health, +10 loyalty, -8% speed";
    case "house_c":
      return "+5% health, +1 tribute per kill";
    case "house_d":
      return "+25% speed, -15% attack interval, -18% health";
    case "house_e":
      return "+45% health, -22% speed, -10% damage";
    case "house_f":
      return "+3 tribute per kill, -8% damage, -8 aggression";
  }
}

const HOUSE_ID_SET: ReadonlySet<string> = new Set(HOUSE_IDS);

function isHouseId(value: string): value is HouseId {
  return HOUSE_ID_SET.has(value);
}

export function validateHouseSelection(
  candidate: readonly string[],
): HouseSelectionValidation {
  if (candidate.length !== HOUSE_SPAWN_SLOTS.length) {
    return { valid: false, reason: "count" };
  }
  if (new Set(candidate).size !== candidate.length) {
    return { valid: false, reason: "duplicate" };
  }
  const [first, second, third] = candidate;
  if (
    first === undefined ||
    second === undefined ||
    third === undefined ||
    !isHouseId(first) ||
    !isHouseId(second) ||
    !isHouseId(third)
  ) {
    return { valid: false, reason: "unknown" };
  }
  return { valid: true, houseIds: [first, second, third] };
}

export function expandHouseSelection(
  houseIds: HouseSelection,
): readonly [
  SelectedHousePlacement,
  SelectedHousePlacement,
  SelectedHousePlacement,
] {
  return [
    { houseId: houseIds[0], slot: HOUSE_SPAWN_SLOTS[0] },
    { houseId: houseIds[1], slot: HOUSE_SPAWN_SLOTS[1] },
    { houseId: houseIds[2], slot: HOUSE_SPAWN_SLOTS[2] },
  ];
}
