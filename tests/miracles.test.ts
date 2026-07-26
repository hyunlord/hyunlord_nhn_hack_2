import assert from "node:assert/strict";
import test from "node:test";
import type {
  MiracleEvent,
  MiracleTargetSnapshot,
} from "../src/divine/divine.types";
import { canCast, resolveMiracle } from "../src/divine/miracleResolver";
import { createRng } from "../src/engine/prng";
import {
  advanceTick,
  castMiracle,
  createInitialState,
} from "../src/engine/tick";

const LIGHTNING_EVENT: MiracleEvent = {
  type: "lightning",
  targetX: 100,
  targetY: 100,
  tick: 12,
};

function createTarget(
  id: string,
  houseId: string,
  x: number,
  hp = 100,
): MiracleTargetSnapshot {
  return { id, houseId, x, y: 100, hp };
}

test("Given the divine resolver API, when affordability is requested, then a shared canCast rule exists", async () => {
  const resolver = await import("../src/divine/miracleResolver");

  assert.equal(typeof resolver.canCast, "function");
});

test("Given the engine API, when world application is requested, then castMiracle exists", async () => {
  const engine = await import("../src/engine/tick");

  assert.equal(typeof engine.castMiracle, "function");
});

test("Given power and cooldown values, when affordability is checked, then both requirements must pass", () => {
  assert.equal(canCast("lightning", 30, 0), true);
  assert.equal(canCast("lightning", 29, 0), false);
  assert.equal(canCast("lightning", 100, 1), false);
  assert.equal(canCast("lightning", 30, -1), true);
});

test("Given targets at three distances, when lightning resolves, then damage uses linear falloff", () => {
  const radius = 55;
  const targets = [
    createTarget("center", "house_a", 100),
    createTarget("half", "house_a", 100 + radius / 2),
    createTarget("outside", "house_a", 100 + radius + 0.01),
  ];

  const outcome = resolveMiracle(LIGHTNING_EVENT, targets);

  assert.deepEqual(outcome.damages, [
    { agentId: "center", amount: 60 },
    { agentId: "half", amount: 30 },
  ]);
});

test("Given a dead target, when a miracle resolves, then it is excluded from effects and dominance", () => {
  const event: MiracleEvent = {
    type: "blessing",
    targetX: 100,
    targetY: 100,
    tick: 20,
  };
  const targets = [
    createTarget("dead-a", "house_a", 100, 0),
    createTarget("living-b", "house_b", 100),
  ];

  const outcome = resolveMiracle(event, targets);

  assert.deepEqual(outcome.heals, [{ agentId: "living-b", amount: 25 }]);
  assert.deepEqual(outcome.housePowerDeltas, [
    { houseId: "house_b", amount: 8 },
  ]);
});

test("Given tied dominant houses in different input orders, when blessing resolves, then the lower house id wins", () => {
  const event: MiracleEvent = {
    type: "blessing",
    targetX: 100,
    targetY: 100,
    tick: 30,
  };
  const firstOrder = [
    createTarget("b", "house_b", 100),
    createTarget("a", "house_a", 100),
  ];
  const secondOrder = [...firstOrder].reverse();

  const first = resolveMiracle(event, firstOrder);
  const second = resolveMiracle(event, secondOrder);

  assert.deepEqual(first.housePowerDeltas, [
    { houseId: "house_a", amount: 8 },
  ]);
  assert.deepEqual(second.housePowerDeltas, first.housePowerDeltas);
});

test("Given identical inputs, when resolution runs twice, then outcomes are deeply equal and sorted", () => {
  const targets = [
    createTarget("z-agent", "house_b", 100),
    createTarget("a-agent", "house_a", 100),
  ];

  const first = resolveMiracle(LIGHTNING_EVENT, targets);
  const second = resolveMiracle(LIGHTNING_EVENT, targets);

  assert.deepEqual(first, second);
  assert.deepEqual(
    first.damages.map(({ agentId }) => agentId),
    ["a-agent", "z-agent"],
  );
  assert.equal(first.id, "lightning_12");
  assert.equal(first.durationTicks, 24);
});

function createCastableWorld() {
  const initial = createInitialState(20260810).state;
  const agent = initial.agents[0];
  if (agent === undefined) {
    throw new RangeError("Expected the initial world to contain an agent.");
  }

  return {
    ...initial,
    tick: 40,
    divinePower: 100,
    miracleCooldowns: { lightning: 0, blessing: 0, curse: 0 },
    activeEffects: [],
    agents: [
      {
        ...agent,
        x: 100,
        y: 100,
        hp: 50,
        lastDamagedTick: -1,
      },
    ],
  };
}

test("Given insufficient power or cooldown, when casting, then the same state reference is rejected", () => {
  const state = createCastableWorld();
  const event: MiracleEvent = {
    type: "lightning",
    targetX: 100,
    targetY: 100,
    tick: state.tick,
  };
  const insufficient = { ...state, divinePower: 29 };
  const coolingDown = {
    ...state,
    miracleCooldowns: { ...state.miracleCooldowns, lightning: 1 },
  };

  assert.strictEqual(castMiracle(insufficient, event), insufficient);
  assert.strictEqual(castMiracle(coolingDown, event), coolingDown);
});

test("Given a valid lightning cast, when applied, then damage and death are immutable", () => {
  const state = createCastableWorld();
  const originalAgent = state.agents[0];
  const originalHousePowers = state.houses.map(({ power }) => power);
  const event: MiracleEvent = {
    type: "lightning",
    targetX: 100,
    targetY: 100,
    tick: state.tick,
  };

  const result = castMiracle(state, event);

  assert.notStrictEqual(result, state);
  assert.equal(state.agents[0]?.hp, originalAgent?.hp);
  assert.deepEqual(
    state.houses.map(({ power }) => power),
    originalHousePowers,
  );
  assert.equal(result.agents[0]?.hp, 0);
  assert.equal(result.agents[0]?.state, "dead");
  assert.equal(result.agents[0]?.lastDamagedTick, state.tick);
  assert.equal(result.divinePower, 70);
  assert.equal(result.miracleCooldowns.lightning, 20);
  assert.equal(result.activeEffects.length, 1);
});

test("Given blessing and curse casts, when applied, then HP and dominant house power are clamped", () => {
  const state = createCastableWorld();
  const blessingState = {
    ...state,
    houses: state.houses.map((house, index) =>
      index === 0 ? { ...house, power: 95 } : house,
    ),
  };
  const blessing = castMiracle(blessingState, {
    type: "blessing",
    targetX: 100,
    targetY: 100,
    tick: blessingState.tick,
  });
  const curseState = {
    ...state,
    houses: state.houses.map((house, index) =>
      index === 0 ? { ...house, power: 5 } : house,
    ),
  };
  const curse = castMiracle(curseState, {
    type: "curse",
    targetX: 100,
    targetY: 100,
    tick: curseState.tick,
  });

  assert.equal(blessing.agents[0]?.hp, 75);
  assert.equal(blessing.houses[0]?.power, 100);
  assert.equal(blessing.divinePower, 80);
  assert.equal(curse.agents[0]?.hp, 38);
  assert.equal(curse.houses[0]?.power, 0);
  assert.equal(curse.divinePower, 75);
});

test("Given regenerating power, cooldowns, and an expiring effect, when a tick advances, then maintenance runs in bounds", () => {
  const state = createCastableWorld();
  const cast = castMiracle(state, {
    type: "blessing",
    targetX: 100,
    targetY: 100,
    tick: state.tick,
  });
  const beforeExpiry = {
    ...cast,
    tick: 63,
    divinePower: 99.9,
    miracleCooldowns: { lightning: 1, blessing: 2, curse: 0 },
  };

  const result = advanceTick(beforeExpiry, createRng(1));

  assert.equal(result.tick, 64);
  assert.equal(result.divinePower, 100);
  assert.deepEqual(result.miracleCooldowns, {
    lightning: 0,
    blessing: 1,
    curse: 0,
  });
  assert.deepEqual(result.activeEffects, []);
});
