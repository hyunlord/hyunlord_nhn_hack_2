import assert from "node:assert/strict";
import test from "node:test";
import type { Agent } from "../src/agents/agentTypes";
import { createAgents, createHouses } from "../src/agents/agentFactory";
import { stepAgent } from "../src/agents/movement";
import { BALANCE_CONFIG } from "../src/content/balanceConfig";
import { createRng, type Rng } from "../src/engine/prng";
import { advanceTick, createInitialState } from "../src/engine/tick";

function createAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: "house_a_00",
    houseId: "house_a",
    disposition: { aggression: 50, loyalty: 50 },
    x: 100,
    y: 100,
    heading: 0,
    state: "idle",
    hp: BALANCE_CONFIG.INITIAL_HP,
    lastDamagedTick: -1,
    lastAttackTick: -1,
    ...overrides,
  };
}

function createSequenceRng(values: readonly number[]): Rng {
  let index = 0;

  return {
    next() {
      const value = values[index];
      if (value === undefined) {
        throw new RangeError("The test RNG sequence was exhausted.");
      }
      index += 1;
      return value;
    },
    range(min, max) {
      return min + this.next() * (max - min);
    },
    int(minInclusive, maxExclusive) {
      return Math.floor(this.range(minInclusive, maxExclusive));
    },
    pick<T>(items: readonly T[]) {
      const item = items[this.int(0, items.length)];
      if (item === undefined) {
        throw new RangeError("Cannot pick from an empty array.");
      }
      return item;
    },
  };
}

test("Given equal seeds, when values are sampled, then PRNG output is identical", () => {
  const first = createRng(42);
  const second = createRng(42);

  assert.deepEqual(
    Array.from({ length: 10 }, () => first.next()),
    Array.from({ length: 10 }, () => second.next()),
  );
  assert.ok(createRng(7).range(10, 20) >= 10);
  assert.ok(createRng(7).int(2, 5) >= 2);
  assert.equal(createRng(7).pick(["a"]), "a");
});

test("Given configured houses, when a world is created, then 60 stable bounded agents spawn", () => {
  const rng = createRng(BALANCE_CONFIG.DEFAULT_SEED);
  const houses = createHouses(rng);
  const agents = createAgents(houses, rng);

  assert.equal(houses.length, 3);
  assert.equal(agents.length, 60);
  assert.equal(agents[0]?.id, "house_a_00");
  assert.equal(agents[59]?.id, "house_c_19");
  assert.ok(
    agents.every(
      (agent) =>
        agent.x >= BALANCE_CONFIG.AGENT_RADIUS &&
        agent.x <= BALANCE_CONFIG.WORLD_WIDTH - BALANCE_CONFIG.AGENT_RADIUS &&
        agent.y >= BALANCE_CONFIG.AGENT_RADIUS &&
        agent.y <= BALANCE_CONFIG.WORLD_HEIGHT - BALANCE_CONFIG.AGENT_RADIUS &&
        agent.disposition.aggression >= 20 &&
        agent.disposition.aggression <= 80 &&
        agent.disposition.loyalty >= 20 &&
        agent.disposition.loyalty <= 80,
    ),
  );
});

test("Given a living agent, when stepped, then movement is immutable and remains in bounds", () => {
  const agent = createAgent();
  const moved = stepAgent(agent, createSequenceRng([0.5]));

  assert.notStrictEqual(moved, agent);
  assert.equal(agent.x, 100);
  assert.equal(moved.x, 100 + BALANCE_CONFIG.WANDER_SPEED);
  assert.equal(moved.y, 100);
});

test("Given an agent reaching the right wall, when stepped, then it reflects inward", () => {
  const agent = createAgent({
    x: BALANCE_CONFIG.WORLD_WIDTH - BALANCE_CONFIG.AGENT_RADIUS - 0.1,
  });
  const moved = stepAgent(agent, createSequenceRng([0.5]));

  assert.equal(
    moved.x,
    BALANCE_CONFIG.WORLD_WIDTH - BALANCE_CONFIG.AGENT_RADIUS,
  );
  assert.ok(Math.abs(moved.heading - Math.PI) < Number.EPSILON);
});

test("Given a dead agent, when stepped, then it stays unchanged", () => {
  const agent = createAgent({ state: "dead" });

  assert.strictEqual(stepAgent(agent, createSequenceRng([])), agent);
});

test("Given a world, when advanced, then one immutable deterministic tick occurs", () => {
  const first = createInitialState(BALANCE_CONFIG.DEFAULT_SEED);
  const second = createInitialState(BALANCE_CONFIG.DEFAULT_SEED);
  const nextFirst = advanceTick(first.state, first.rng);
  const nextSecond = advanceTick(second.state, second.rng);

  assert.equal(first.state.tick, 0);
  assert.equal(nextFirst.tick, 1);
  assert.notStrictEqual(nextFirst, first.state);
  assert.notStrictEqual(nextFirst.agents, first.state.agents);
  assert.deepEqual(nextFirst, nextSecond);
  assert.equal(nextFirst.phase, "intervention");
  assert.equal(nextFirst.activeThreat, null);
  assert.deepEqual(nextFirst.highlights, []);
  assert.equal(nextFirst.ending, null);
});
