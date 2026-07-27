import assert from "node:assert/strict";
import test from "node:test";
import { BALANCE_CONFIG } from "../src/content/balanceConfig";
import {
  applyDamageToThreat,
  stepThreat,
} from "../src/threat/waveDirector";
import type {
  HallSnapshot,
  ThreatEvent,
  ThreatTargetSnapshot,
} from "../src/threat/threatTypes";

function createThreat(
  overrides: Partial<ThreatEvent> = {},
): ThreatEvent {
  return {
    type: "monster_horde",
    waveIndex: 0,
    startTick: BALANCE_CONFIG.PREPARATION_TICKS,
    traitorHouseId: null,
    mage: null,
    creatures: [
      {
        id: "w0_creature_00",
        x: 100,
        y: 100,
        hp: BALANCE_CONFIG.CREATURE_HP,
        agentDamage: BALANCE_CONFIG.CREATURE_ATTACK_DAMAGE,
        hallDamage: BALANCE_CONFIG.CREATURE_HALL_DAMAGE,
        lastAttackTick: -1,
      },
    ],
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

const HALL: HallSnapshot = {
  id: "house_a",
  x: 120,
  y: 100,
  hp: BALANCE_CONFIG.HALL_HP,
};

function createDistantThreat(): ThreatEvent {
  const baseCreature = createThreat().creatures[0];
  if (baseCreature === undefined) {
    throw new RangeError("Expected a creature fixture.");
  }
  return createThreat({
    creatures: [{ ...baseCreature, x: 20 }],
  });
}

test("Given no nearby agent, when a distant creature steps, then it moves toward the hall", () => {
  const threat = createDistantThreat();
  const farAgent = createTarget("agent_far", 400, 400);
  const result = stepThreat(threat, [farAgent], [HALL], 0);

  assert.ok((result.threat.creatures[0]?.x ?? 0) > 20);
  assert.deepEqual(result.agentDamages, []);
  assert.deepEqual(result.hallDamages, []);
});

test("Given no nearby agent, when a distant creature keeps advancing, then it eventually damages the hall on cadence", () => {
  const farAgent = createTarget("agent_far", 400, 400);
  let result = stepThreat(createDistantThreat(), [farAgent], [HALL], 0);
  let tick = 0;

  while (result.hallDamages.length === 0) {
    tick += 1;
    assert.ok(tick < 200, "Creature did not reach the hall.");
    result = stepThreat(result.threat, [farAgent], [HALL], tick);
  }

  assert.deepEqual(result.agentDamages, []);
  assert.deepEqual(result.hallDamages, [
    {
      hallId: HALL.id,
      amount: BALANCE_CONFIG.CREATURE_HALL_DAMAGE,
    },
  ]);
  assert.equal(result.threat.creatures[0]?.lastAttackTick, tick);
});

test("Given a nearby agent and a hall, when a creature chooses a target, then agent aggro takes priority", () => {
  const nearbyAgent = createTarget("agent_near", 105, 100);

  const result = stepThreat(
    createThreat(),
    [nearbyAgent],
    [HALL],
    9,
  );

  assert.deepEqual(result.agentDamages, [
    {
      agentId: nearbyAgent.id,
      amount: BALANCE_CONFIG.CREATURE_ATTACK_DAMAGE,
    },
  ]);
  assert.deepEqual(result.hallDamages, []);
});

test("Given a tower is the nearest structural objective, when a creature attacks, then tower damage is emitted instead of hall damage", () => {
  const result = stepThreat(
    createThreat(),
    [],
    [{ ...HALL, x: 300 }],
    BALANCE_CONFIG.CREATURE_ATTACK_INTERVAL_TICKS,
    [{ id: "tower_01", x: 105, y: 100, hp: 300, radius: 10 }],
  );

  assert.deepEqual(result.structureDamages, [
    {
      structureId: "tower_01",
      amount: BALANCE_CONFIG.CREATURE_HALL_DAMAGE,
    },
  ]);
  assert.deepEqual(result.hallDamages, []);
});

test("Given no surviving halls, when threats step, then creatures and mage hold position", () => {
  const threat = createThreat({
    mage: {
      x: 80,
      y: 80,
      hp: BALANCE_CONFIG.DARK_MAGE_HP,
      hallDamage: BALANCE_CONFIG.CREATURE_HALL_DAMAGE,
      lastAttackTick: -1,
    },
  });

  const result = stepThreat(threat, [], [], 20);

  assert.deepEqual(result.threat.creatures, threat.creatures);
  assert.deepEqual(result.threat.mage, threat.mage);
  assert.deepEqual(result.agentDamages, []);
  assert.deepEqual(result.hallDamages, []);
});

test("Given a mage and surviving halls, when the threat steps, then the mage ignores agents and advances toward the nearest hall", () => {
  const threat = createThreat({
    creatures: [],
    mage: {
      x: 100,
      y: 100,
      hp: BALANCE_CONFIG.DARK_MAGE_HP,
      hallDamage: BALANCE_CONFIG.CREATURE_HALL_DAMAGE,
      lastAttackTick: -1,
    },
  });

  const result = stepThreat(
    threat,
    [createTarget("agent_near", 101, 100)],
    [{ ...HALL, x: 200 }],
    20,
  );

  assert.equal(
    result.threat.mage?.x,
    100 + BALANCE_CONFIG.DARK_MAGE_SPEED,
  );
  assert.equal(result.threat.mage?.y, 100);
  assert.deepEqual(result.agentDamages, []);
});

test("Given simultaneous hits, when threat damage is applied, then dead creatures are removed and nullable mage HP clamps", () => {
  const threat = createThreat();
  const killed = applyDamageToThreat(threat, [
    { creatureId: "w0_creature_00", amount: 100 },
    { creatureId: null, amount: 500 },
  ]);
  const mageThreat = createThreat({
    creatures: [],
    mage: {
      x: 100,
      y: 100,
      hp: BALANCE_CONFIG.DARK_MAGE_HP,
      hallDamage: BALANCE_CONFIG.CREATURE_HALL_DAMAGE,
      lastAttackTick: -1,
    },
  });
  const mageKilled = applyDamageToThreat(mageThreat, [
    { creatureId: null, amount: 500 },
  ]);

  assert.deepEqual(killed.creatures, []);
  assert.equal(killed.mage, null);
  assert.equal(mageKilled.mage?.hp, 0);
  assert.equal(threat.creatures[0]?.hp, BALANCE_CONFIG.CREATURE_HP);
});
