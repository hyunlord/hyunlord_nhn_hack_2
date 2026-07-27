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
  assert.ok(ids.every((id) => /^w\d+_creature_\d{2}$/.test(id)));
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
