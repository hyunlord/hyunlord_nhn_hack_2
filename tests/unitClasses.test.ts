import assert from "node:assert/strict";
import test from "node:test";
import {
  createAgents,
  createHouses,
  createRecruits,
} from "../src/agents/agentFactory";
import {
  apportionUnitClasses,
  UNIT_CLASSES,
} from "../src/content/unitClassConfig";
import { BALANCE_CONFIG } from "../src/content/balanceConfig";
import { HOUSE_CONFIG, HOUSE_SPAWN_SLOTS } from "../src/content/houseConfig";
import { createRng } from "../src/engine/prng";

test("Given Ashvale and Stonewake, when their armies are created, then each receives its configured starting population", () => {
  // Given
  const houses = createHouses(createRng(10), [
    "house_a",
    "house_e",
    "house_d",
  ]);

  // When
  const agents = createAgents(houses, createRng(10));

  // Then
  assert.equal(
    agents.filter(({ houseId, isHero }) => houseId === "house_a" && !isHero)
      .length,
    26,
  );
  assert.equal(
    agents.filter(({ houseId, isHero }) => houseId === "house_e" && !isHero)
      .length,
    18,
  );
});

test("Given Ashvale's uneven roster, when its twenty-six agents are apportioned, then fixed class order breaks the largest-remainder tie", () => {
  // Given
  const houses = createHouses(createRng(12), [
    "house_a",
    "house_b",
    "house_c",
  ]);

  // When
  const ashvale = createAgents(houses, createRng(12)).filter(
    ({ houseId, isHero }) => houseId === "house_a" && !isHero,
  );

  // Then
  assert.deepEqual(
    Object.fromEntries(
      ["melee", "spear", "archer", "skirmisher"].map((unitClass) => [
        unitClass,
        ashvale.filter((agent) => agent.unitClass === unitClass).length,
      ]),
    ),
    { melee: 13, spear: 0, archer: 0, skirmisher: 13 },
  );
});

test("Given Greymoor's mixed roster, when agents are created, then class base HP is modified by the house after class resolution", () => {
  // Given
  const houses = createHouses(createRng(14), [
    "house_c",
    "house_a",
    "house_b",
  ]);

  // When
  const greymoor = createAgents(houses, createRng(14)).filter(
    ({ houseId, isHero }) => houseId === "house_c" && !isHero,
  );
  const hpByClass = Object.fromEntries(
    greymoor.map(({ unitClass, hp }) => [unitClass, hp]),
  );

  // Then
  assert.deepEqual(hpByClass, {
    melee: 105,
    spear: 147,
    archer: 68,
  });
});

test("Given the class catalog, when its public contract is inspected, then all four exact class definitions ship", () => {
  // Given
  const expected = {
    melee: {
      id: "melee",
      name: "Warrior",
      maxHp: 100,
      attackDamage: 20,
      attackIntervalTicks: 10,
      attackRange: 13,
      preferredRange: 13,
      moveSpeed: 0.6,
      drawRadius: 4,
      drawShape: "circle",
    },
    spear: {
      id: "spear",
      name: "Spearman",
      maxHp: 140,
      attackDamage: 16,
      attackIntervalTicks: 12,
      attackRange: 20,
      preferredRange: 20,
      moveSpeed: 0.5,
      drawRadius: 4.5,
      drawShape: "diamond",
    },
    archer: {
      id: "archer",
      name: "Archer",
      maxHp: 65,
      attackDamage: 18,
      attackIntervalTicks: 14,
      attackRange: 70,
      preferredRange: 58,
      moveSpeed: 0.55,
      drawRadius: 3.5,
      drawShape: "triangle",
    },
    skirmisher: {
      id: "skirmisher",
      name: "Skirmisher",
      maxHp: 75,
      attackDamage: 14,
      attackIntervalTicks: 8,
      attackRange: 13,
      preferredRange: 13,
      moveSpeed: 0.9,
      drawRadius: 3,
      drawShape: "dot",
    },
  };

  // When
  const catalog = UNIT_CLASSES;

  // Then
  assert.deepEqual(catalog, expected);
});

test("Given an uneven roster, when seven slots are apportioned twice, then exact totals and fixed tie order are deterministic", () => {
  // Given
  const roster = { melee: 40, spear: 20, archer: 40, skirmisher: 0 };

  // When
  const first = apportionUnitClasses(7, roster);
  const second = apportionUnitClasses(7, roster);

  // Then
  assert.deepEqual(first, [
    { unitClass: "melee", count: 3 },
    { unitClass: "spear", count: 1 },
    { unitClass: "archer", count: 3 },
    { unitClass: "skirmisher", count: 0 },
  ]);
  assert.deepEqual(second, first);
  assert.equal(
    first.reduce((total, { count }) => total + count, 0),
    7,
  );
});

test("Given the six houses, when roster and population settings are inspected, then the exact fixed table ships", () => {
  // Given
  const expected = [
    ["house_a", { melee: 50, spear: 0, archer: 0, skirmisher: 50 }, 26, 8, 2, 52, 6],
    ["house_b", { melee: 30, spear: 70, archer: 0, skirmisher: 0 }, 22, 6, 2, 44, 5],
    ["house_c", { melee: 40, spear: 20, archer: 40, skirmisher: 0 }, 25, 7, 2, 50, 6],
    ["house_d", { melee: 0, spear: 0, archer: 30, skirmisher: 70 }, 34, 10, 3, 72, 8],
    ["house_e", { melee: 15, spear: 85, archer: 0, skirmisher: 0 }, 18, 5, 1, 36, 4],
    ["house_f", { melee: 40, spear: 0, archer: 60, skirmisher: 0 }, 24, 7, 2, 48, 5],
  ];

  // When
  const table = HOUSE_CONFIG.map((house) => [
    house.id,
    house.roster,
    house.startingPopulation,
    house.populationGrowthBase,
    house.populationGrowthPerLevel,
    house.populationCapBase,
    house.populationCapPerLevel,
  ]);

  // Then
  assert.deepEqual(table, expected);
});

test("Given resolved house and investment modifiers, when a mixed army is created, then HP applies those modifiers after each class base", () => {
  // Given
  const houses = createHouses(createRng(20), [
    "house_c",
    "house_a",
    "house_b",
  ]);
  const modifiers = new Map([
    [
      "house_c",
      {
        maxHpBonus: 10,
        maxHpMultiplier: 1.2,
        heroMaxHpMultiplier: 1,
      },
    ],
  ]);

  // When
  const agents = createAgents(houses, createRng(20), modifiers).filter(
    ({ houseId, isHero }) => houseId === "house_c" && !isHero,
  );
  const hpByClass = Object.fromEntries(
    agents.map(({ unitClass, hp }) => [unitClass, hp]),
  );

  // Then
  assert.deepEqual(hpByClass, {
    melee: 132,
    spear: 180,
    archer: 90,
  });
});

test("Given the stronghold spawn slots, when default agents are created, then every regular camp stays inside radius fifty-five without overlapping", () => {
  // Given
  const houses = createHouses(createRng(72), [
    "house_a",
    "house_b",
    "house_c",
  ]);

  // When
  const agents = createAgents(houses, createRng(72)).filter(
    ({ isHero }) => !isHero,
  );
  const agentsByHouse = new Map(
    houses.map((house, index) => {
      const slot = HOUSE_SPAWN_SLOTS[index];
      if (slot === undefined) {
        throw new RangeError(`Missing spawn slot for ${house.id}.`);
      }
      return [
        house.id,
        {
          agents: agents.filter(({ houseId }) => houseId === house.id),
          slot,
        },
      ] as const;
    }),
  );
  let minimumInterCampDistance = Number.POSITIVE_INFINITY;
  for (const first of agents) {
    for (const second of agents) {
      if (first.houseId !== second.houseId) {
        minimumInterCampDistance = Math.min(
          minimumInterCampDistance,
          Math.hypot(first.x - second.x, first.y - second.y),
        );
      }
    }
  }

  // Then
  assert.equal(BALANCE_CONFIG.HOUSE_SPAWN_RADIUS, 55);
  for (const { agents: houseAgents, slot } of agentsByHouse.values()) {
    assert.ok(
      houseAgents.every(
        ({ x, y }) =>
          Math.hypot(x - slot.x, y - slot.y) <=
          BALANCE_CONFIG.HOUSE_SPAWN_RADIUS,
      ),
    );
  }
  assert.ok(minimumInterCampDistance > 0);
});

test("Given a synthetic placement outside the spawn radius, when the spawn contract is evaluated, then distance fifty-five point zero one is rejected", () => {
  // Given
  const [slot] = HOUSE_SPAWN_SLOTS;
  if (slot === undefined) {
    throw new RangeError("Expected a spawn slot.");
  }
  const syntheticPlacement = {
    x: slot.x + 55.01,
    y: slot.y,
  };

  // When
  const isInsideSpawnRadius =
    Math.hypot(syntheticPlacement.x - slot.x, syntheticPlacement.y - slot.y) <=
    BALANCE_CONFIG.HOUSE_SPAWN_RADIUS;

  // Then
  assert.equal(BALANCE_CONFIG.HOUSE_SPAWN_RADIUS, 55);
  assert.equal(isInsideSpawnRadius, false);
});

test("Given a recruit batch at a surviving hall, when recruits are created, then roster allocation and nearby placement are deterministic at full HP", () => {
  // Given
  const request = {
    houseId: "house_a" as const,
    count: 3,
    idStart: 26,
    spawn: { x: 333, y: 222 },
    rng: createRng(99),
  };

  // When
  const recruits = createRecruits(request);
  const replay = createRecruits({
    ...request,
    rng: createRng(99),
  });

  // Then
  assert.deepEqual(recruits, replay);
  assert.deepEqual(
    recruits.map(({ id, unitClass, hp }) => ({ id, unitClass, hp })),
    [
      { id: "house_a_26", unitClass: "melee", hp: 100 },
      { id: "house_a_27", unitClass: "melee", hp: 100 },
      { id: "house_a_28", unitClass: "skirmisher", hp: 75 },
    ],
  );
  assert.ok(
    recruits.every(
      ({ x, y }) =>
        Math.hypot(x - request.spawn.x, y - request.spawn.y) <=
        BALANCE_CONFIG.HOUSE_SPAWN_RADIUS,
    ),
  );
  assert.ok(
    recruits.some(
      ({ x, y }) => x !== request.spawn.x || y !== request.spawn.y,
    ),
  );
});
