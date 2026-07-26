import assert from "node:assert/strict";
import test from "node:test";
import { BALANCE_CONFIG } from "../src/content/balanceConfig";
import { createRng } from "../src/engine/prng";
import {
  applyDamageToThreat,
  assignTraitor,
  spawnInvasion,
  stepThreat,
} from "../src/narrative/invasionDirector";
import type {
  ThreatEvent,
  ThreatTargetSnapshot,
} from "../src/narrative/threatTypes";

test("Given Phase 2C, when invasion APIs are inspected, then deterministic entry points exist", async () => {
  const director = await import("../src/narrative/invasionDirector");
  const disposition = await import("../src/agents/dispositionEngine");
  const rendering = await import("../src/render/drawThreats");

  assert.equal("assignTraitor" in director, true);
  assert.equal("spawnInvasion" in director, true);
  assert.equal("stepThreat" in director, true);
  assert.equal("applyDamageToThreat" in director, true);
  assert.equal("decideIntent" in disposition, true);
  assert.equal("intentToState" in disposition, true);
  assert.equal("drawThreats" in rendering, true);
});

function createThreat(overrides: Partial<ThreatEvent> = {}): ThreatEvent {
  return {
    type: "dark_mage_invasion",
    startTick: 900,
    traitorHouseId: "house_a",
    mage: { x: 400, y: 300, hp: BALANCE_CONFIG.DARK_MAGE_HP },
    creatures: [
      {
        id: "creature_00",
        x: 100,
        y: 100,
        hp: BALANCE_CONFIG.CREATURE_HP,
        lastAttackTick: -1,
      },
    ],
    engaged: false,
    ...overrides,
  };
}

function createTarget(
  id: string,
  x: number,
  y: number,
): ThreatTargetSnapshot {
  return {
    id,
    houseId: "house_a",
    x,
    y,
    hp: 100,
    state: "idle",
  };
}

test("Given reordered house ids and equal seeds, when a traitor is assigned, then the result is order-independent", () => {
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

test("Given a seeded world, when an invasion spawns, then every stable creature is inside the map", () => {
  const threat = spawnInvasion(
    ["house_a", "house_b", "house_c"],
    BALANCE_CONFIG.WORLD_WIDTH,
    BALANCE_CONFIG.WORLD_HEIGHT,
    BALANCE_CONFIG.INTERVENTION_DURATION_TICKS,
    createRng(20260810),
  );

  assert.equal(threat.creatures.length, BALANCE_CONFIG.CREATURE_COUNT);
  assert.deepEqual(
    threat.creatures.map(({ id }) => id),
    Array.from(
      { length: BALANCE_CONFIG.CREATURE_COUNT },
      (_, index) => `creature_${String(index).padStart(2, "0")}`,
    ),
  );
  assert.ok(
    threat.creatures.every(
      ({ x, y, hp, lastAttackTick }) =>
        x >= BALANCE_CONFIG.CREATURE_RADIUS &&
        x <=
          BALANCE_CONFIG.WORLD_WIDTH - BALANCE_CONFIG.CREATURE_RADIUS &&
        y >= BALANCE_CONFIG.CREATURE_RADIUS &&
        y <=
          BALANCE_CONFIG.WORLD_HEIGHT - BALANCE_CONFIG.CREATURE_RADIUS &&
        hp === BALANCE_CONFIG.CREATURE_HP &&
        lastAttackTick === -1,
    ),
  );
  assert.equal(threat.mage.hp, BALANCE_CONFIG.DARK_MAGE_HP);
  assert.equal(threat.engaged, false);
});

test("Given identical threat inputs, when a threat steps twice, then outputs match and inputs stay untouched", () => {
  const threat = createThreat();
  const targets = [createTarget("agent_b", 250, 250)];
  const threatBefore = structuredClone(threat);
  const targetsBefore = structuredClone(targets);

  const first = stepThreat(threat, targets, 910);
  const second = stepThreat(threat, targets, 910);

  assert.deepEqual(first, second);
  assert.deepEqual(threat, threatBefore);
  assert.deepEqual(targets, targetsBefore);
  assert.notStrictEqual(first.threat, threat);
});

test("Given an adjacent target, when attack cadence is stepped, then damage waits for the next eligible tick", () => {
  const target = createTarget("agent_a", 105, 100);
  const first = stepThreat(createThreat(), [target], 9);
  const coolingDown = stepThreat(first.threat, [target], 10);
  const eligibleAgain = stepThreat(coolingDown.threat, [target], 19);

  assert.deepEqual(first.damages, [
    {
      agentId: "agent_a",
      amount: BALANCE_CONFIG.CREATURE_ATTACK_DAMAGE,
    },
  ]);
  assert.equal(first.threat.creatures[0]?.lastAttackTick, 9);
  assert.deepEqual(coolingDown.damages, []);
  assert.deepEqual(eligibleAgain.damages, first.damages);
  assert.equal(eligibleAgain.threat.engaged, true);
});

test("Given equidistant targets, when a creature chooses prey, then ascending agent id wins", () => {
  const result = stepThreat(
    createThreat(),
    [
      createTarget("agent_z", 105, 100),
      createTarget("agent_a", 95, 100),
    ],
    9,
  );

  assert.equal(result.damages[0]?.agentId, "agent_a");
});

test("Given hits against creatures and mage, when damage is applied, then HP clamps and dead creatures are removed", () => {
  const threat = createThreat();
  const result = applyDamageToThreat(threat, [
    { creatureId: "creature_00", amount: 40 },
    { creatureId: "creature_00", amount: 30 },
    { creatureId: null, amount: 450 },
  ]);

  assert.deepEqual(result.creatures, []);
  assert.equal(result.mage.hp, 0);
  assert.equal(threat.creatures[0]?.hp, BALANCE_CONFIG.CREATURE_HP);
  assert.equal(threat.mage.hp, BALANCE_CONFIG.DARK_MAGE_HP);
});
