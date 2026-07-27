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
  readonly id: "left" | "right" | "bottom_center";
  readonly x: number;
  readonly y: number;
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

export const HOUSE_SPAWN_SLOTS = [
  { id: "left", x: 240, y: 180 },
  { id: "right", x: 720, y: 200 },
  { id: "bottom_center", x: 480, y: 450 },
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
    color: "#d4693f",
    initialPower: 50,
    unlockedByDefault: true,
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
    color: "#4f8fbf",
    initialPower: 50,
    unlockedByDefault: true,
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
    color: "#8c68ba",
    initialPower: 50,
    unlockedByDefault: false,
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
    color: "#77818d",
    initialPower: 50,
    unlockedByDefault: false,
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
    color: "#d3a942",
    initialPower: 50,
    unlockedByDefault: false,
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
