import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_HOUSE_IDS,
  HOUSE_CONFIG,
  HOUSE_IDS,
  HOUSE_SPAWN_SLOTS,
  STRONGHOLD_CENTER,
  expandHouseSelection,
  houseTraitSummary,
  validateHouseSelection,
} from "../src/content/houseConfig";
import {
  HOUSE_SYNERGIES,
  previewHouseSynergies,
  resolveHouseSynergies,
} from "../src/content/houseSynergies";

test("Given the shipped roster, when house identities are inspected, then all six exact starting trait profiles are present", () => {
  const profiles = HOUSE_CONFIG.map(
    ({ id, name, identity, unlockedByDefault, traits, formation }) => [
      id,
      name,
      identity,
      unlockedByDefault,
      traits.maxHpMultiplier,
      traits.attackDamageMultiplier,
      traits.attackIntervalMultiplier,
      traits.moveSpeedMultiplier,
      traits.aggressionBias,
      traits.loyaltyBias,
      traits.tributePerKillBonus,
      formation,
    ],
  );

  assert.deepEqual(profiles, [
    [
      "house_a",
      "Ashvale",
      "aggressive skirmishers",
      true,
      1,
      1.1,
      1,
      1,
      12,
      0,
      0,
      { lineSpacing: 14, cohesion: 0.45, jitter: 0.35, style: "charge" },
    ],
    [
      "house_b",
      "Thornhold",
      "stubborn defenders",
      true,
      1.2,
      1,
      1,
      0.92,
      0,
      10,
      0,
      { lineSpacing: 11, cohesion: 0.7, jitter: 0.1, style: "hold" },
    ],
    [
      "house_c",
      "Greymoor",
      "steady providers",
      true,
      1.05,
      1,
      1,
      1,
      0,
      0,
      1,
      { lineSpacing: 16, cohesion: 0.5, jitter: 0.2, style: "hold" },
    ],
    [
      "house_d",
      "Duskmere",
      "fast, fragile",
      false,
      0.82,
      1,
      0.85,
      1.25,
      0,
      0,
      0,
      { lineSpacing: 26, cohesion: 0.2, jitter: 0.55, style: "harass" },
    ],
    [
      "house_e",
      "Stonewake",
      "slow, immovable",
      false,
      1.45,
      0.9,
      1,
      0.78,
      0,
      0,
      0,
      { lineSpacing: 9, cohesion: 0.85, jitter: 0.03, style: "hold" },
    ],
    [
      "house_f",
      "Highreach",
      "wealth-focused",
      false,
      1,
      0.92,
      1,
      1,
      -8,
      0,
      3,
      { lineSpacing: 22, cohesion: 0.35, jitter: 0.25, style: "harass" },
    ],
  ]);
});

function rgbDistance(first: string, second: string): number {
  const parse = (hexColor: string): readonly [number, number, number] => [
    Number.parseInt(hexColor.slice(1, 3), 16),
    Number.parseInt(hexColor.slice(3, 5), 16),
    Number.parseInt(hexColor.slice(5, 7), 16),
  ];
  const [firstRed, firstGreen, firstBlue] = parse(first);
  const [secondRed, secondGreen, secondBlue] = parse(second);
  return Math.hypot(
    firstRed - secondRed,
    firstGreen - secondGreen,
    firstBlue - secondBlue,
  );
}

test("Given enemy sprite colors, when house palettes are inspected, then each house stays visually distinct", () => {
  const enemyColors = ["#6b3f8f", "#c04ad8"] as const;

  assert.deepEqual(
    HOUSE_CONFIG.map(({ id, color }) => [id, color]),
    [
      ["house_a", "#e07a45"],
      ["house_b", "#3f6f96"],
      ["house_c", "#7bb06a"],
      ["house_d", "#63c9c2"],
      ["house_e", "#5a6470"],
      ["house_f", "#d9b544"],
    ],
  );
  assert.ok(
    HOUSE_CONFIG.every(({ color }) =>
      enemyColors.every((enemyColor) => rgbDistance(color, enemyColor) >= 50),
    ),
  );
});

test("Given every house, when selection presentation requests its traits, then a concise mechanical summary is available", () => {
  assert.deepEqual(HOUSE_IDS.map(houseTraitSummary), [
    "+10% damage, +12 aggression",
    "+20% health, +10 loyalty, -8% speed",
    "+5% health, +1 tribute per kill",
    "+25% speed, -15% attack interval, -18% health",
    "+45% health, -22% speed, -10% damage",
    "+3 tribute per kill, -8% damage, -8 aggression",
  ]);
});

function distance(
  first: { readonly x: number; readonly y: number },
  second: { readonly x: number; readonly y: number },
): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

test("Given house constants, when defaults and spawn slots are inspected, then the original trio surrounds one stronghold center", () => {
  assert.deepEqual(HOUSE_IDS, [
    "house_a",
    "house_b",
    "house_c",
    "house_d",
    "house_e",
    "house_f",
  ]);
  assert.deepEqual(DEFAULT_HOUSE_IDS, ["house_a", "house_b", "house_c"]);
  assert.deepEqual(STRONGHOLD_CENTER, { x: 480, y: 300 });
  assert.deepEqual(HOUSE_SPAWN_SLOTS, [
    { id: "north", x: 480, y: 185 },
    { id: "southeast", x: 580, y: 358 },
    { id: "southwest", x: 380, y: 358 },
  ]);
  for (const first of HOUSE_SPAWN_SLOTS) {
    for (const second of HOUSE_SPAWN_SLOTS) {
      if (first.id !== second.id) {
        assert.ok(distance(first, second) <= 200);
      }
    }
  }
});

test("Given three unique known house ids, when the selection validates, then its exact pick order is retained", () => {
  const result = validateHouseSelection([
    "house_f",
    "house_a",
    "house_d",
  ]);

  assert.deepEqual(result, {
    valid: true,
    houseIds: ["house_f", "house_a", "house_d"],
  });
});

test("Given a selection with the wrong count, when it validates, then a count failure is returned", () => {
  const result = validateHouseSelection(["house_a", "house_b"]);

  assert.deepEqual(result, { valid: false, reason: "count" });
});

test("Given a repeated house, when the selection validates, then a duplicate failure is returned", () => {
  const result = validateHouseSelection([
    "house_a",
    "house_b",
    "house_a",
  ]);

  assert.deepEqual(result, { valid: false, reason: "duplicate" });
});

test("Given an unknown house, when the selection validates, then an unknown-id failure is returned", () => {
  const result = validateHouseSelection([
    "house_a",
    "house_b",
    "house_z",
  ]);

  assert.deepEqual(result, { valid: false, reason: "unknown" });
});

test("Given a validated ordered trio, when spawn placements expand, then picks map north, southeast, and southwest in order", () => {
  const result = validateHouseSelection([
    "house_f",
    "house_c",
    "house_d",
  ]);
  assert.equal(result.valid, true);
  if (!result.valid) {
    return;
  }

  const placements = expandHouseSelection(result.houseIds);

  assert.deepEqual(placements, [
    {
      houseId: "house_f",
      slot: { id: "north", x: 480, y: 185 },
    },
    {
      houseId: "house_c",
      slot: { id: "southeast", x: 580, y: 358 },
    },
    {
      houseId: "house_d",
      slot: { id: "southwest", x: 380, y: 358 },
    },
  ]);
});

test("Given the synergy catalog, when its contracts are inspected, then four exact order-independent pair effects ship and two are hidden", () => {
  assert.deepEqual(
    HOUSE_SYNERGIES.map(({ id, houses, name, effect, hidden }) => ({
      id,
      houses,
      name,
      effect,
      hidden,
    })),
    [
      {
        id: "wildfire_charge",
        houses: ["house_a", "house_d"],
        name: "Wildfire Charge",
        effect: { attackIntervalMultiplier: 0.93 },
        hidden: false,
      },
      {
        id: "the_long_wall",
        houses: ["house_b", "house_e"],
        name: "The Long Wall",
        effect: { hallDefenseRadiusBonus: 80 },
        hidden: false,
      },
      {
        id: "full_coffers",
        houses: ["house_c", "house_f"],
        name: "Full Coffers",
        effect: { tributePerKillBonus: 2 },
        hidden: true,
      },
      {
        id: "ash_and_iron",
        houses: ["house_a", "house_e"],
        name: "Ash and Iron",
        effect: {
          attackDamageMultiplier: 1.08,
          maxHpMultiplier: 1.08,
        },
        hidden: true,
      },
    ],
  );
  assert.ok(
    HOUSE_SYNERGIES.every(({ description }) => description.length > 0),
  );
});

test("Given a trio in reverse pair order, when synergies resolve, then matching ignores selection order while preserving catalog order", () => {
  const synergies = resolveHouseSynergies([
    "house_e",
    "house_b",
    "house_a",
  ]);

  assert.deepEqual(
    synergies.map(({ id }) => id),
    ["the_long_wall", "ash_and_iron"],
  );
});

test("Given an undiscovered hidden synergy, when selection previews resolve, then its name remains absent", () => {
  const synergies = previewHouseSynergies(
    ["house_a", "house_e", "house_b"],
    [],
  );

  assert.deepEqual(
    synergies.map(({ name }) => name),
    ["The Long Wall"],
  );
});

test("Given a discovered hidden synergy, when selection previews resolve, then its name is visible with public matches", () => {
  const synergies = previewHouseSynergies(
    ["house_e", "house_b", "house_a"],
    ["ash_and_iron"],
  );

  assert.deepEqual(
    synergies.map(({ name }) => name),
    ["The Long Wall", "Ash and Iron"],
  );
});
