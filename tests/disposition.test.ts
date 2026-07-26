import assert from "node:assert/strict";
import test from "node:test";
import {
  decideIntent,
  intentToState,
  type AgentIntent,
} from "../src/agents/dispositionEngine";
import { stepAgent } from "../src/agents/movement";
import type {
  Agent,
  ThreatPresence,
} from "../src/agents/agentTypes";
import { BALANCE_CONFIG } from "../src/content/balanceConfig";
import type { Rng } from "../src/content/random";

function createAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: "house_a_00",
    houseId: "house_a",
    disposition: { aggression: 80, loyalty: 40 },
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

const NEARBY_THREAT: ThreatPresence = {
  x: 110,
  y: 100,
  hostile: true,
};

function createCountingRng(): {
  readonly rng: Rng;
  readonly count: () => number;
} {
  let draws = 0;
  const next = () => {
    draws += 1;
    return 0.5;
  };

  return {
    rng: {
      next,
      range(min, max) {
        return min + next() * (max - min);
      },
      int(minInclusive, maxExclusive) {
        return Math.floor(
          minInclusive + next() * (maxExclusive - minInclusive),
        );
      },
      pick<T>(items: readonly T[]) {
        const item = items[this.int(0, items.length)];
        if (item === undefined) {
          throw new RangeError("Cannot pick from an empty array.");
        }
        return item;
      },
    },
    count: () => draws,
  };
}

test("Given a disloyal traitor-house agent, when danger is sensed, then betrayal overrides aggression", () => {
  const intent = decideIntent(createAgent(), [NEARBY_THREAT], true);

  assert.deepEqual(intent, {
    kind: "flee",
    fromX: NEARBY_THREAT.x,
    fromY: NEARBY_THREAT.y,
  });
});

test("Given the same non-traitor agent, when danger is sensed, then high aggression engages", () => {
  const intent = decideIntent(createAgent(), [NEARBY_THREAT], false);

  assert.deepEqual(intent, {
    kind: "engage",
    towardX: NEARBY_THREAT.x,
    towardY: NEARBY_THREAT.y,
  });
});

test("Given dead, distant, or non-hostile conditions, when intent is decided, then the agent idles", () => {
  const dead = decideIntent(
    createAgent({ state: "dead", hp: 0 }),
    [NEARBY_THREAT],
    false,
  );
  const distant = decideIntent(
    createAgent(),
    [{ x: 500, y: 500, hostile: true }],
    false,
  );
  const peaceful = decideIntent(
    createAgent(),
    [{ ...NEARBY_THREAT, hostile: false }],
    false,
  );

  assert.deepEqual(dead, { kind: "idle" });
  assert.deepEqual(distant, { kind: "idle" });
  assert.deepEqual(peaceful, { kind: "idle" });
});

test("Given every intent variant, when mapped to simulation state, then the mapping is exact", () => {
  const intents: readonly AgentIntent[] = [
    { kind: "idle" },
    { kind: "flee", fromX: 0, fromY: 0 },
    { kind: "engage", towardX: 0, towardY: 0 },
  ];

  assert.deepEqual(intents.map(intentToState), [
    "idle",
    "fleeing",
    "fighting",
  ]);
});

test("Given flee and engage intents, when agents move, then directed paths consume zero RNG draws", () => {
  const fleeRng = createCountingRng();
  const engageRng = createCountingRng();
  const agent = createAgent();

  const fleeing = stepAgent(agent, fleeRng.rng, {
    kind: "flee",
    fromX: 200,
    fromY: 100,
  });
  const engaging = stepAgent(agent, engageRng.rng, {
    kind: "engage",
    towardX: 200,
    towardY: 100,
  });

  assert.equal(fleeRng.count(), 0);
  assert.equal(engageRng.count(), 0);
  assert.equal(
    fleeing.x,
    100 -
      BALANCE_CONFIG.WANDER_SPEED *
        BALANCE_CONFIG.AGENT_FLEE_SPEED_MULTIPLIER,
  );
  assert.equal(
    engaging.x,
    100 +
      BALANCE_CONFIG.WANDER_SPEED *
        BALANCE_CONFIG.AGENT_ENGAGE_SPEED_MULTIPLIER,
  );
});
