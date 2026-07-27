import assert from "node:assert/strict";
import test from "node:test";
import { BALANCE_CONFIG } from "../src/content/balanceConfig";
import {
  WAVE_DEFINITIONS,
  type WaveDefinition,
} from "../src/content/waveConfig";
import { createRng } from "../src/engine/prng";
import {
  assignTraitor,
  spawnWave,
} from "../src/threat/waveDirector";

test("Given Phase 3A, when wave modules are loaded, then config and deterministic threat APIs exist", async () => {
  const config = await import("../src/content/waveConfig");
  const director = await import("../src/threat/waveDirector");

  assert.equal(config.WAVE_DEFINITIONS.length > 0, true);
  assert.equal("spawnWave" in director, true);
  assert.equal("stepThreat" in director, true);
  assert.equal("applyDamageToThreat" in director, true);
  assert.equal("assignTraitor" in director, true);
});

function getDefinition(index: number): WaveDefinition {
  const definition = WAVE_DEFINITIONS[index];
  if (definition === undefined) {
    throw new RangeError(`Missing wave definition ${index}.`);
  }
  return definition;
}

function spawnEdgeOf(
  x: number,
  y: number,
): "top" | "right" | "bottom" | "left" {
  const radius = BALANCE_CONFIG.CREATURE_RADIUS;
  if (y === radius) {
    return "top";
  }
  if (x === BALANCE_CONFIG.WORLD_WIDTH - radius) {
    return "right";
  }
  if (y === BALANCE_CONFIG.WORLD_HEIGHT - radius) {
    return "bottom";
  }
  if (x === radius) {
    return "left";
  }
  throw new RangeError(`Creature ${x},${y} is not on a spawn edge.`);
}

test("Given reordered house ids and equal seeds, when a dormant traitor is assigned directly, then the result is order-independent", () => {
  const first = assignTraitor(
    ["house_c", "house_a", "house_b"],
    createRng(20260810),
  );
  const second = assignTraitor(
    ["house_b", "house_c", "house_a"],
    createRng(20260810),
  );

  assert.equal(first, second);
});

test("Given every configured wave, when spawned, then scaling, mage presence, and run-unique ids follow data", () => {
  const threats = WAVE_DEFINITIONS.map((definition) =>
    spawnWave(
      definition,
      BALANCE_CONFIG.WORLD_WIDTH,
      BALANCE_CONFIG.WORLD_HEIGHT,
      300,
      createRng(20260810 + definition.index),
    ),
  );
  const ids = threats.flatMap((threat) =>
    threat.creatures.map(({ id }) => id),
  );

  assert.deepEqual(
    threats.map(({ creatures }) => creatures.length),
    WAVE_DEFINITIONS.map(({ creatureCount }) => creatureCount),
  );
  assert.equal(threats[0]?.mage, null);
  assert.equal(threats[1]?.mage, null);
  assert.notEqual(threats[2]?.mage, null);
  assert.ok(threats.every(({ traitorHouseId }) => traitorHouseId === null));
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every((id) => /^w\d+_creature_\d{2,3}$/.test(id)));
  assert.equal(
    threats[1]?.creatures[0]?.hp,
    Math.round(
      BALANCE_CONFIG.CREATURE_HP *
        getDefinition(1).creatureHpMultiplier,
    ),
  );
  assert.ok(
    (threats[1]?.creatures[0]?.hp ?? 0) >
      (threats[0]?.creatures[0]?.hp ?? Number.POSITIVE_INFINITY),
  );
});

test("Given the Phase 3I wave table, when creature counts are read, then only the structural counts increase", () => {
  assert.deepEqual(
    WAVE_DEFINITIONS.map(
      ({
        creatureCount,
        creatureHpMultiplier,
        creatureDamageMultiplier,
        spawnEdges,
        hasMage,
        tributeReward,
      }) => ({
        creatureCount,
        creatureHpMultiplier,
        creatureDamageMultiplier,
        spawnEdges,
        hasMage,
        tributeReward,
      }),
    ),
    [
      {
        creatureCount: 36,
        creatureHpMultiplier: 1.8,
        creatureDamageMultiplier: 1,
        spawnEdges: 1,
        hasMage: false,
        tributeReward: 60,
      },
      {
        creatureCount: 60,
        creatureHpMultiplier: 2.5,
        creatureDamageMultiplier: 1.1,
        spawnEdges: 2,
        hasMage: false,
        tributeReward: 90,
      },
      {
        creatureCount: 112,
        creatureHpMultiplier: 5,
        creatureDamageMultiplier: 1.2,
        spawnEdges: 3,
        hasMage: true,
        tributeReward: 140,
      },
    ],
  );
});

test("Given wave three, when spawned with an equal seed, then every creature is distributed evenly across three distinct deterministic edges", () => {
  const definition = getDefinition(2);
  const first = spawnWave(
    definition,
    BALANCE_CONFIG.WORLD_WIDTH,
    BALANCE_CONFIG.WORLD_HEIGHT,
    300,
    createRng(20260810),
  );
  const second = spawnWave(
    definition,
    BALANCE_CONFIG.WORLD_WIDTH,
    BALANCE_CONFIG.WORLD_HEIGHT,
    300,
    createRng(20260810),
  );
  const counts = new Map<string, number>();

  for (const creature of first.creatures) {
    const edge = spawnEdgeOf(creature.x, creature.y);
    counts.set(edge, (counts.get(edge) ?? 0) + 1);
  }

  assert.equal(definition.spawnEdges, 3);
  assert.equal(counts.size, 3);
  const edgeCounts = [...counts.values()];
  assert.equal(
    edgeCounts.reduce((sum, count) => sum + count, 0),
    definition.creatureCount,
  );
  assert.ok(Math.max(...edgeCounts) - Math.min(...edgeCounts) <= 1);
  assert.deepEqual(first, second);
  assert.deepEqual(
    WAVE_DEFINITIONS.map(({ spawnEdges }) => spawnEdges),
    [1, 2, 3],
  );
});
