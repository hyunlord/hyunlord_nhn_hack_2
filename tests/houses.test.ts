import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_HOUSE_IDS,
  HOUSE_CONFIG,
  HOUSE_IDS,
  HOUSE_SPAWN_SLOTS,
  expandHouseSelection,
  validateHouseSelection,
} from "../src/content/houseConfig";
import {
  HOUSE_SYNERGIES,
  previewHouseSynergies,
  resolveHouseSynergies,
} from "../src/content/houseSynergies";

test("Given the shipped roster, when house identities are inspected, then all six exact starting trait profiles are present", () => {
  const profiles = HOUSE_CONFIG.map(({ id, name, identity, unlockedByDefault, traits }) => [
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
  ]);

  assert.deepEqual(profiles, [
    ["house_a", "Ashvale", "aggressive skirmishers", true, 1, 1.1, 1, 1, 12, 0, 0],
    ["house_b", "Thornhold", "stubborn defenders", true, 1.2, 1, 1, 0.92, 0, 10, 0],
    ["house_c", "Greymoor", "steady providers", true, 1.05, 1, 1, 1, 0, 0, 1],
    ["house_d", "Duskmere", "fast, fragile", false, 0.82, 1, 0.85, 1.25, 0, 0, 0],
    ["house_e", "Stonewake", "slow, immovable", false, 1.45, 0.9, 1, 0.78, 0, 0, 0],
    ["house_f", "Highreach", "wealth-focused", false, 1, 0.92, 1, 1, -8, 0, 3],
  ]);
});

test("Given house constants, when defaults and spawn slots are inspected, then only the original trio is unlocked into three ordered map positions", () => {
  assert.deepEqual(HOUSE_IDS, [
    "house_a",
    "house_b",
    "house_c",
    "house_d",
    "house_e",
    "house_f",
  ]);
  assert.deepEqual(DEFAULT_HOUSE_IDS, ["house_a", "house_b", "house_c"]);
  assert.deepEqual(HOUSE_SPAWN_SLOTS, [
    { id: "left", x: 240, y: 180 },
    { id: "right", x: 720, y: 200 },
    { id: "bottom_center", x: 480, y: 450 },
  ]);
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

test("Given a validated ordered trio, when spawn placements expand, then picks map left, right, and bottom-center in order", () => {
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
      slot: { id: "left", x: 240, y: 180 },
    },
    {
      houseId: "house_c",
      slot: { id: "right", x: 720, y: 200 },
    },
    {
      houseId: "house_d",
      slot: { id: "bottom_center", x: 480, y: 450 },
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
