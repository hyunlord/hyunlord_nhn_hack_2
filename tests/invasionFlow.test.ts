import assert from "node:assert/strict";
import test from "node:test";
import type { Agent } from "../src/agents/agentTypes";
import { BALANCE_CONFIG } from "../src/content/balanceConfig";
import { createRng } from "../src/engine/prng";
import type { GameState } from "../src/engine/engine.types";
import {
  advanceTick,
  castMiracle,
  createInitialState,
} from "../src/engine/tick";
import type { ThreatEvent } from "../src/narrative/threatTypes";

function createAgent(
  template: Agent,
  id: string,
  houseId: Agent["houseId"],
  x: number,
): Agent {
  return {
    ...template,
    id,
    houseId,
    x,
    y: 100,
    heading: 0,
    disposition: { aggression: 80, loyalty: 40 },
    state: "idle",
    hp: 100,
    lastDamagedTick: -1,
    lastAttackTick: -1,
  };
}

function createThreat(overrides: Partial<ThreatEvent> = {}): ThreatEvent {
  return {
    type: "dark_mage_invasion",
    startTick: BALANCE_CONFIG.INTERVENTION_DURATION_TICKS,
    traitorHouseId: "house_a",
    mage: { x: 900, y: 550, hp: BALANCE_CONFIG.DARK_MAGE_HP },
    creatures: [],
    engaged: false,
    ...overrides,
  };
}

function createInvasionState(
  overrides: Partial<GameState> = {},
): GameState {
  const initial = createInitialState(BALANCE_CONFIG.DEFAULT_SEED).state;
  return {
    ...initial,
    tick: BALANCE_CONFIG.INTERVENTION_DURATION_TICKS,
    phase: "invasion",
    activeThreat: createThreat(),
    ...overrides,
  };
}

test("Given tick 899, when the next tick advances, then one seeded invasion spawns and marks its traitor house", () => {
  const initial = createInitialState(BALANCE_CONFIG.DEFAULT_SEED);
  const beforeSpawn = {
    ...initial.state,
    tick: BALANCE_CONFIG.INTERVENTION_DURATION_TICKS - 1,
  };

  const result = advanceTick(beforeSpawn, initial.rng);

  assert.equal(result.tick, BALANCE_CONFIG.INTERVENTION_DURATION_TICKS);
  assert.equal(result.phase, "invasion");
  assert.equal(
    result.activeThreat?.creatures.length,
    BALANCE_CONFIG.CREATURE_COUNT,
  );
  assert.equal(
    result.houses.filter(({ isTraitor }) => isTraitor).length,
    1,
  );
  assert.equal(
    result.houses.find(({ isTraitor }) => isTraitor)?.id,
    result.activeThreat?.traitorHouseId,
  );
});

test("Given an unengaged invasion at tick 1199, when fallback time arrives, then observation begins without an ending", () => {
  const state = createInvasionState({
    tick:
      BALANCE_CONFIG.INTERVENTION_DURATION_TICKS +
      BALANCE_CONFIG.OBSERVATION_HANDOFF_TICKS -
      1,
  });

  const result = advanceTick(state, createRng(7));

  assert.equal(
    result.tick,
    BALANCE_CONFIG.INTERVENTION_DURATION_TICKS +
      BALANCE_CONFIG.OBSERVATION_HANDOFF_TICKS,
  );
  assert.equal(result.phase, "observation");
  assert.equal(result.ending, null);
});

test("Given adjacent agents and a creature, when first blood is drawn, then combat and helping are tracked", () => {
  const base = createInvasionState();
  const template = base.agents[0];
  if (template === undefined) {
    throw new RangeError("Expected an initial agent fixture.");
  }
  const agents = [
    createAgent(template, "house_a_00", "house_a", 100),
    createAgent(template, "house_b_00", "house_b", 104),
    createAgent(template, "house_c_00", "house_c", 106),
  ];
  const activeThreat = createThreat({
    traitorHouseId: null,
    mage: { x: 900, y: 550, hp: BALANCE_CONFIG.DARK_MAGE_HP },
    creatures: [
      {
        id: "creature_00",
        x: 108,
        y: 100,
        hp: BALANCE_CONFIG.CREATURE_HP,
        lastAttackTick: -1,
      },
    ],
  });
  const state = createInvasionState({ agents, activeThreat });

  const result = advanceTick(state, createRng(11));

  assert.equal(result.phase, "observation");
  assert.equal(result.activeThreat?.engaged, true);
  assert.equal(result.agents[0]?.state, "helping");
  assert.equal(result.agents[1]?.state, "helping");
  assert.equal(result.agents[2]?.state, "fighting");
  assert.ok(
    (result.activeThreat?.creatures[0]?.hp ??
      BALANCE_CONFIG.CREATURE_HP) <
      BALANCE_CONFIG.CREATURE_HP,
  );
  assert.ok(result.agents.some(({ hp }) => hp < 100));
});

test("Given equal nearby defenders, when one house is the traitor, then its disloyal agent alone flees", () => {
  const base = createInvasionState();
  const template = base.agents[0];
  if (template === undefined) {
    throw new RangeError("Expected an initial agent fixture.");
  }
  const agents = [
    createAgent(template, "house_a_00", "house_a", 100),
    createAgent(template, "house_b_00", "house_b", 100),
    createAgent(template, "house_c_00", "house_c", 100),
  ];
  const state = createInvasionState({
    agents,
    activeThreat: createThreat({
      creatures: [
        {
          id: "creature_00",
          x: 120,
          y: 100,
          hp: BALANCE_CONFIG.CREATURE_HP,
          lastAttackTick: 900,
        },
      ],
    }),
  });

  const result = advanceTick(state, createRng(13));

  assert.equal(result.agents[0]?.state, "fleeing");
  assert.notEqual(result.agents[1]?.state, "fleeing");
  assert.notEqual(result.agents[2]?.state, "fleeing");
});

test("Given an invasion phase, when a miracle is affordable, then divine intervention remains castable", () => {
  const state = createInvasionState();
  const result = castMiracle(state, {
    type: "lightning",
    targetX: state.agents[0]?.x ?? 0,
    targetY: state.agents[0]?.y ?? 0,
    tick: state.tick,
  });

  assert.equal(result.divinePower, state.divinePower - 30);
  assert.equal(result.activeEffects.length, 1);
});

test("Given the default seeded playthrough, when the invasion develops, then the traitor house visibly scatters most", () => {
  const world = createInitialState(BALANCE_CONFIG.DEFAULT_SEED);
  let state = world.state;
  const peakFleeingByHouse = new Map(
    state.houses.map((house) => [house.id, 0]),
  );
  for (let tick = 0; tick < 1_400; tick += 1) {
    state = advanceTick(state, world.rng);
    for (const house of state.houses) {
      const fleeing = state.agents.filter(
        (agent) =>
          agent.houseId === house.id && agent.state === "fleeing",
      ).length;
      peakFleeingByHouse.set(
        house.id,
        Math.max(peakFleeingByHouse.get(house.id) ?? 0, fleeing),
      );
    }
  }
  const traitor = state.houses.find(({ isTraitor }) => isTraitor);
  if (traitor === undefined) {
    throw new RangeError("Expected one traitor house after invasion spawn.");
  }
  const peakFleeing = state.houses.map((house) => ({
    houseId: house.id,
    fleeing: peakFleeingByHouse.get(house.id) ?? 0,
  }));
  const traitorFleeing =
    peakFleeing.find(({ houseId }) => houseId === traitor.id)?.fleeing ??
    0;

  assert.ok(
    peakFleeing
      .filter(({ houseId }) => houseId !== traitor.id)
      .every(({ fleeing }) => traitorFleeing > fleeing),
  );
});
