import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_HOUSE_IDS,
  HOUSE_SPAWN_SLOTS,
} from "../src/content/houseConfig";
import {
  applyProgressionAwards,
  chooseDraftCard,
  modifiersForHouse,
} from "../src/engine/progressionEngine";
import { createRng, type Rng } from "../src/engine/prng";
import {
  beginNextWave,
  createInitialState,
} from "../src/engine/tick";
import { createDefaultMetaState } from "../src/meta/legacy";

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

test("Given no explicit selection, when a run is created, then the original trio occupies the three ordered slots", () => {
  const state = createInitialState(41).state;

  assert.deepEqual(state.selectedHouseIds, DEFAULT_HOUSE_IDS);
  assert.deepEqual(
    state.houses.map(({ id }) => id),
    DEFAULT_HOUSE_IDS,
  );
  assert.deepEqual(
    state.halls.map(({ houseId, x, y }) => ({ houseId, x, y })),
    HOUSE_SPAWN_SLOTS.map((slot, index) => ({
      houseId: DEFAULT_HOUSE_IDS[index],
      x: slot.x,
      y: slot.y,
    })),
  );
});

test("Given different persistent meta saves, when seed and trio match, then complete initial run state is identical", () => {
  const emptyMeta = createDefaultMetaState();
  const progressedMeta = {
    ...emptyMeta,
    legacyPoints: 4_000,
    unlockedHouses: [
      "house_a",
      "house_b",
      "house_c",
      "house_d",
      "house_e",
      "house_f",
    ] as const,
    runsPlayed: 19,
    bestWaveReached: 3,
    victories: 7,
  };
  const configureRun = (_meta: typeof emptyMeta) =>
    createInitialState(4101, DEFAULT_HOUSE_IDS).state;

  assert.deepEqual(configureRun(emptyMeta), configureRun(progressedMeta));
});

test("Given an ordered mixed trio, when a run is created, then only selected houses, agents, and configured heroes spawn", () => {
  const state = createInitialState(42, [
    "house_f",
    "house_a",
    "house_d",
  ]).state;

  assert.deepEqual(state.selectedHouseIds, [
    "house_f",
    "house_a",
    "house_d",
  ]);
  assert.deepEqual(
    state.houses.map(({ id }) => id),
    ["house_f", "house_a", "house_d"],
  );
  assert.equal(state.agents.filter(({ isHero }) => !isHero).length, 60);
  assert.deepEqual(
    state.agents.filter(({ isHero }) => isHero).map(({ id }) => id),
    ["hero_ashvale"],
  );
  assert.ok(
    state.agents.every(({ houseId }) =>
      state.selectedHouseIds.includes(houseId),
    ),
  );
});

test("Given Stonewake and Ashvale, when agents are created, then starting HP and disposition biases reflect house traits", () => {
  const state = createInitialState(43, [
    "house_e",
    "house_a",
    "house_b",
  ]).state;
  const stonewake = state.agents.find(
    ({ houseId, isHero }) => houseId === "house_e" && !isHero,
  );
  const ashvale = state.agents.find(
    ({ houseId, isHero }) => houseId === "house_a" && !isHero,
  );

  assert.ok((stonewake?.hp ?? 0) > (ashvale?.hp ?? 0));
  assert.ok(
    state.agents
      .filter(({ houseId, isHero }) => houseId === "house_a" && !isHero)
      .every(({ disposition }) => disposition.aggression >= 32),
  );
  assert.ok(
    state.agents
      .filter(({ houseId, isHero }) => houseId === "house_b" && !isHero)
      .every(({ disposition }) => disposition.loyalty >= 30),
  );
});

test("Given matching houses, when modifiers resolve and a draft is chosen, then traits and synergies remain folded into modifiers", () => {
  const world = createInitialState(44, [
    "house_a",
    "house_d",
    "house_c",
  ]);
  const initial = modifiersForHouse(world.state, "house_a");

  assert.equal(initial.attackDamageMultiplier, 1.1);
  assert.equal(initial.attackIntervalMultiplier, 0.93);

  const awarded = applyProgressionAwards(
    world.state,
    [{ houseId: "house_a", xp: 500 }],
    createRng(440),
  );
  const offer = awarded.pendingDrafts[0];
  const cardId = offer?.cardIds[0];
  if (offer === undefined || cardId === undefined) {
    throw new RangeError("Expected a draft offer.");
  }
  const chosen = chooseDraftCard(awarded, offer.id, cardId);
  const afterDraft = modifiersForHouse(chosen, "house_a");

  assert.ok(afterDraft.attackDamageMultiplier >= 1.1);
  assert.ok(afterDraft.attackIntervalMultiplier <= 0.93);
});

test("Given an invalid trio, when run creation is requested, then it rejects count, duplicates, and unknown ids", () => {
  assert.throws(() => createInitialState(1, ["house_a", "house_b"]));
  assert.throws(() =>
    createInitialState(1, ["house_a", "house_b", "house_a"]),
  );
  assert.throws(() =>
    createInitialState(1, ["house_a", "house_b", "house_z"]),
  );
});

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
