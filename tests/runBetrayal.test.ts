import assert from "node:assert/strict";
import test from "node:test";
import { createRng, type Rng } from "../src/engine/prng";
import {
  beginNextWave,
  createInitialState,
} from "../src/engine/tick";

function sequenceRng(values: readonly number[]): Rng {
  let index = 0;
  const next = () => {
    const value = values[index] ?? 0.5;
    index += 1;
    return value;
  };
  return {
    next,
    range(min, max) {
      return min + this.next() * (max - min);
    },
    int(minInclusive, maxExclusive) {
      return Math.floor(this.range(minInclusive, maxExclusive));
    },
    pick<T>(items: readonly T[]): T {
      const item = items[this.int(0, items.length)];
      if (item === undefined) {
        throw new RangeError("Cannot pick from an empty array.");
      }
      return item;
    },
  };
}

test("Given Ashvale and Highreach reach wave three, when the seeded roll passes, then a deterministic traitor is assigned before spawn", () => {
  const initial = createInitialState(45, [
    "house_a",
    "house_f",
    "house_c",
  ]).state;
  const ready = {
    ...initial,
    phase: "intermission" as const,
    waveIndex: 1,
  };

  const triggered = beginNextWave(
    ready,
    sequenceRng([0.1, 0.8, 0.5, 0.5, 0.5]),
  );
  const missed = beginNextWave(
    ready,
    sequenceRng([0.9, 0.8, 0.5, 0.5, 0.5]),
  );

  assert.equal(triggered.activeThreat?.traitorHouseId, "house_f");
  assert.equal(triggered.betrayalHouseId, "house_f");
  assert.equal(missed.activeThreat?.traitorHouseId, null);
  assert.equal(missed.betrayalHouseId, null);
});

test("Given the same eligible wave-three state and RNG seed, when betrayal resolves twice, then the complete spawned state matches", () => {
  const initial = createInitialState(451, [
    "house_a",
    "house_f",
    "house_c",
  ]).state;
  const ready = {
    ...initial,
    phase: "intermission" as const,
    waveIndex: 1,
  };

  const first = beginNextWave(ready, createRng(19));
  const second = beginNextWave(ready, createRng(19));

  assert.deepEqual(first, second);
});

test("Given an ineligible trio reaches wave three, when spawning, then no betrayal roll is consumed", () => {
  const initial = createInitialState(46, [
    "house_a",
    "house_b",
    "house_c",
  ]).state;
  const ready = {
    ...initial,
    phase: "intermission" as const,
    waveIndex: 1,
  };
  let draws = 0;
  const base = sequenceRng([0.1, 0.5, 0.5, 0.5]);
  const counting: Rng = {
    ...base,
    next() {
      draws += 1;
      return base.next();
    },
  };

  const result = beginNextWave(ready, counting);

  assert.equal(result.activeThreat?.traitorHouseId, null);
  assert.equal(result.betrayalHouseId, null);
  assert.ok(draws > 0);
});
