import assert from "node:assert/strict";
import test from "node:test";
import { BALANCE_CONFIG } from "../src/content/balanceConfig";
import { createRng } from "../src/engine/prng";
import {
  applyDamageToThreat,
  spawnWave,
  stepThreat,
} from "../src/threat/waveDirector";
import type {
  DefenseStructureSnapshot,
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
        structureDamage: BALANCE_CONFIG.CREATURE_HALL_DAMAGE,
        lastAttackTick: -1,
        haltedUntilTick: -1,
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

const KEEP: DefenseStructureSnapshot = {
  kind: "keep",
  id: "keep",
  x: 120,
  y: 100,
  hp: BALANCE_CONFIG.KEEP_HP,
  radius: BALANCE_CONFIG.KEEP_RADIUS,
};

const HOUSE_A_BANNER: DefenseStructureSnapshot = {
  kind: "banner",
  id: "banner:house_a",
  houseId: "house_a",
  x: 120,
  y: 100,
  hp: BALANCE_CONFIG.BANNER_HP,
  radius: BALANCE_CONFIG.BANNER_RADIUS,
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

function createBaseCreature(): ThreatEvent["creatures"][number] {
  const baseCreature = createThreat().creatures[0];
  if (baseCreature === undefined) {
    throw new RangeError("Expected a creature fixture.");
  }
  return baseCreature;
}

test("Given no nearby agent, when a distant creature steps, then it moves toward the nearest defensive structure", () => {
  const threat = createDistantThreat();
  const farAgent = createTarget("agent_far", 400, 400);
  const result = stepThreat(threat, [farAgent], [KEEP], 0);

  assert.ok((result.threat.creatures[0]?.x ?? 0) > 20);
  assert.deepEqual(result.agentDamages, []);
  assert.deepEqual(result.defenseStructureDamages, []);
});

test("Given no nearby agent, when a distant creature keeps advancing, then it eventually damages the defensive structure on cadence", () => {
  const farAgent = createTarget("agent_far", 400, 400);
  let result = stepThreat(createDistantThreat(), [farAgent], [KEEP], 0);
  let tick = 0;

  while (result.defenseStructureDamages.length === 0) {
    tick += 1;
    assert.ok(tick < 200, "Creature did not reach the defensive structure.");
    result = stepThreat(result.threat, [farAgent], [KEEP], tick);
  }

  assert.deepEqual(result.agentDamages, []);
  assert.deepEqual(result.defenseStructureDamages, [
    {
      structureId: KEEP.id,
      amount: BALANCE_CONFIG.CREATURE_HALL_DAMAGE,
    },
  ]);
  assert.equal(result.threat.creatures[0]?.lastAttackTick, tick);
});

test("Given a nearby agent and a defensive structure, when a creature chooses a target, then agent aggro takes priority", () => {
  const nearbyAgent = createTarget("agent_near", 105, 100);

  const result = stepThreat(
    createThreat(),
    [nearbyAgent],
    [KEEP],
    9,
  );

  assert.deepEqual(result.agentDamages, [
    {
      agentId: nearbyAgent.id,
      amount: BALANCE_CONFIG.CREATURE_ATTACK_DAMAGE,
    },
  ]);
  assert.deepEqual(result.defenseStructureDamages, []);
});

test("Given a tower is the nearest structural objective, when a creature attacks, then tower damage is emitted instead of keep or banner damage", () => {
  const result = stepThreat(
    createThreat(),
    [],
    [{ ...KEEP, x: 300 }],
    BALANCE_CONFIG.CREATURE_ATTACK_INTERVAL_TICKS,
    [{ id: "tower_01", x: 105, y: 100, hp: 300, radius: 10 }],
  );

  assert.deepEqual(result.structureDamages, [
    {
      structureId: "tower_01",
      amount: BALANCE_CONFIG.CREATURE_HALL_DAMAGE,
    },
  ]);
  assert.deepEqual(result.defenseStructureDamages, []);
});

test("Given no surviving defensive structures, when threats step, then creatures and mage hold position", () => {
  const threat = createThreat({
    mage: {
      x: 80,
      y: 80,
      hp: BALANCE_CONFIG.DARK_MAGE_HP,
      structureDamage: BALANCE_CONFIG.CREATURE_HALL_DAMAGE,
      lastAttackTick: -1,
    },
  });

  const result = stepThreat(threat, [], [], 20);

  assert.deepEqual(result.threat.creatures, threat.creatures);
  assert.deepEqual(result.threat.mage, threat.mage);
  assert.deepEqual(result.agentDamages, []);
  assert.deepEqual(result.defenseStructureDamages, []);
});

test("Given a mage and surviving keep and banners, when the threat steps, then the mage ignores agents and damages the nearest banner", () => {
  const threat = createThreat({
    creatures: [],
    mage: {
      x: 100,
      y: 100,
      hp: BALANCE_CONFIG.DARK_MAGE_HP,
      structureDamage: BALANCE_CONFIG.CREATURE_HALL_DAMAGE,
      lastAttackTick: -1,
    },
  });

  const result = stepThreat(
    threat,
    [createTarget("agent_near", 101, 100)],
    [{ ...KEEP, x: 220 }, { ...HOUSE_A_BANNER, x: 80 }],
    BALANCE_CONFIG.CREATURE_ATTACK_INTERVAL_TICKS,
  );

  assert.deepEqual(result.agentDamages, []);
  assert.deepEqual(result.defenseStructureDamages, [
    {
      structureId: "banner:house_a",
      amount: BALANCE_CONFIG.CREATURE_HALL_DAMAGE,
    },
  ]);
});

test("Given reversed equal-distance defensive structures, when a creature attacks, then the stable structure id wins independent of input order", () => {
  const result = stepThreat(
    createThreat(),
    [],
    [
      { ...KEEP, x: 100, y: 105 },
      { ...HOUSE_A_BANNER, x: 100, y: 95 },
    ],
    BALANCE_CONFIG.CREATURE_ATTACK_INTERVAL_TICKS,
  );

  assert.deepEqual(result.defenseStructureDamages, [
    {
      structureId: "banner:house_a",
      amount: BALANCE_CONFIG.CREATURE_HALL_DAMAGE,
    },
  ]);
});

test("Given shipped keep and banner geometry, when a creature chooses without an agent target, then the nearer banner is selected before the keep", () => {
  const result = stepThreat(
    createThreat({
      creatures: [
        {
          ...createBaseCreature(),
          id: "w0_creature_00",
          x: 480,
          y: 248 - BALANCE_CONFIG.BANNER_RADIUS,
        },
      ],
    }),
    [],
    [
      {
        kind: "keep",
        id: "keep",
        x: 480,
        y: 300,
        hp: BALANCE_CONFIG.KEEP_HP,
        radius: BALANCE_CONFIG.KEEP_RADIUS,
      },
      {
        kind: "banner",
        id: "banner:house_a",
        houseId: "house_a",
        x: 480,
        y: 248,
        hp: BALANCE_CONFIG.BANNER_HP,
        radius: BALANCE_CONFIG.BANNER_RADIUS,
      },
    ],
    BALANCE_CONFIG.CREATURE_ATTACK_INTERVAL_TICKS,
  );

  assert.deepEqual(result.defenseStructureDamages, [
    {
      structureId: "banner:house_a",
      amount: BALANCE_CONFIG.CREATURE_HALL_DAMAGE,
    },
  ]);
});

test("Given a real spawned mage wave, when generated enemies attack a defensive structure, then emitted structure damage is finite and exact", () => {
  const expectedDamage = Math.round(
    BALANCE_CONFIG.CREATURE_HALL_DAMAGE * 1.2,
  );
  const generated = spawnWave(
    {
      index: 2,
      label: "producer contract",
      creatureCount: 1,
      creatureHpMultiplier: 1,
      creatureDamageMultiplier: 1.2,
      spawnEdges: 1,
      hasMage: true,
      tributeReward: 0,
    },
    BALANCE_CONFIG.WORLD_WIDTH,
    BALANCE_CONFIG.WORLD_HEIGHT,
    0,
    createRng(42),
  );
  if (generated.mage === null) {
    throw new RangeError("Expected generated mage fixture.");
  }
  const generatedCreature = generated.creatures[0];
  if (generatedCreature === undefined) {
    throw new RangeError("Expected generated creature fixture.");
  }

  const result = stepThreat(
    {
      ...generated,
      creatures: [{ ...generatedCreature, x: 100, y: 100 }],
      mage: { ...generated.mage, x: 100, y: 100 },
    },
    [],
    [{ ...HOUSE_A_BANNER, x: 100, y: 100 }],
    BALANCE_CONFIG.CREATURE_ATTACK_INTERVAL_TICKS,
  );

  assert.deepEqual(result.defenseStructureDamages, [
    { structureId: "banner:house_a", amount: expectedDamage },
    { structureId: "banner:house_a", amount: expectedDamage },
  ]);
  assert.ok(
    result.defenseStructureDamages.every(({ amount }) =>
      Number.isFinite(amount),
    ),
  );
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
      structureDamage: BALANCE_CONFIG.CREATURE_HALL_DAMAGE,
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
