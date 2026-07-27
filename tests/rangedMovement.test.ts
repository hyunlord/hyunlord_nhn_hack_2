import assert from "node:assert/strict";
import test from "node:test";
import { stepAgent } from "../src/agents/movement";
import type { Agent } from "../src/agents/agentTypes";
import type { Rng } from "../src/content/random";

function archerAt(x: number): Agent {
  return {
    id: "house_c_archer_00",
    houseId: "house_c",
    unitClass: "archer",
    disposition: { aggression: 80, loyalty: 80 },
    x,
    y: 100,
    heading: 0,
    state: "fighting",
    hp: 65,
    lastDamagedTick: -1,
    lastAttackTick: -1,
    isHero: false,
    heroId: null,
    heroLevel: 1,
    heroLevelUpTick: -1,
    respawnAtTick: null,
    breakImmuneUntilTick: -1,
  };
}

function countingRng(): {
  readonly rng: Rng;
  readonly draws: () => number;
} {
  let count = 0;
  const next = () => {
    count += 1;
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
          throw new RangeError("Cannot pick from an empty list.");
        }
        return item;
      },
    },
    draws: () => count,
  };
}

test("Given an archer at three engagement distances, when it moves, then it advances, retreats, and holds across the preferred-range bands", () => {
  const far = archerAt(0);
  const near = archerAt(70);
  const band = archerAt(50);
  const farRng = countingRng();
  const nearRng = countingRng();
  const bandRng = countingRng();
  const engage = {
    kind: "engage" as const,
    towardX: 100,
    towardY: 100,
    targetId: "creature_0",
    preferredRange: 58,
  };

  const advanced = stepAgent(far, farRng.rng, engage);
  const retreated = stepAgent(near, nearRng.rng, engage);
  const held = stepAgent(band, bandRng.rng, engage);

  assert.ok(advanced.x > far.x);
  assert.ok(retreated.x < near.x);
  assert.equal(held.x, band.x);
  assert.equal(held.y, band.y);
  assert.equal(farRng.draws(), 0);
  assert.equal(nearRng.draws(), 0);
  assert.equal(bandRng.draws(), 0);
});

test("Given a spearman inside the 1.1 preferred-range band, when it engages, then it holds without RNG", () => {
  const agent = {
    ...archerAt(79),
    unitClass: "spear" as const,
  };
  const rng = countingRng();

  const moved = stepAgent(agent, rng.rng, {
    kind: "engage",
    towardX: 100,
    towardY: 100,
    targetId: "creature_0",
    preferredRange: 20,
  });

  assert.equal(moved.x, agent.x);
  assert.equal(moved.y, agent.y);
  assert.equal(rng.draws(), 0);
});

test("Given a melee unit just outside attack range, when it engages, then it closes instead of holding", () => {
  const agent = {
    ...archerAt(86),
    unitClass: "melee" as const,
  };
  const rng = countingRng();

  const moved = stepAgent(agent, rng.rng, {
    kind: "engage",
    towardX: 100,
    towardY: 100,
    targetId: "creature_0",
    preferredRange: 13,
  });

  assert.ok(Math.hypot(100 - moved.x, 100 - moved.y) < 14);
  assert.equal(rng.draws(), 0);
});

test("Given melee and skirmisher units inside their preferred range, when they engage, then they keep advancing without RNG", () => {
  const engage = {
    kind: "engage" as const,
    towardX: 100,
    towardY: 100,
    targetId: "creature_0",
    preferredRange: 13,
  };

  for (const unitClass of ["melee", "skirmisher"] as const) {
    const agent = {
      ...archerAt(95),
      unitClass,
    };
    const rng = countingRng();

    const moved = stepAgent(agent, rng.rng, engage);

    assert.ok(moved.x > agent.x, unitClass);
    assert.equal(rng.draws(), 0, unitClass);
  }
});
