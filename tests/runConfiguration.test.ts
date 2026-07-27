import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveStartingModifierBundle,
  EMPTY_STARTING_MODIFIER_BUNDLE,
  type StartingModifierBundle,
} from "../src/content/runConfiguration";
import {
  DEFAULT_HOUSE_IDS,
  HOUSE_SPAWN_SLOTS,
} from "../src/content/houseConfig";
import {
  applyProgressionAwards,
  chooseDraftCard,
  divineModifiersForState,
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

test("Given different persistent meta saves, when seed trio and derived bundle match, then complete initial run state is identical", () => {
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
    investmentRanks: { global_vigor: 2, house_a_ashvale_fury: 1 },
  };
  const bundle = deriveStartingModifierBundle(emptyMeta.investmentRanks);
  const configureRun = (_meta: typeof emptyMeta) =>
    createInitialState(4101, DEFAULT_HOUSE_IDS, bundle).state;

  assert.deepEqual(configureRun(emptyMeta), configureRun(progressedMeta));
});

test("Given no starting modifier bundle, when a run is created, then the initial state matches the former empty configuration", () => {
  const implicit = createInitialState(4102, DEFAULT_HOUSE_IDS).state;
  const explicit = createInitialState(
    4102,
    DEFAULT_HOUSE_IDS,
    EMPTY_STARTING_MODIFIER_BUNDLE,
  ).state;

  assert.deepEqual(explicit, implicit);
});

test("Given global and house investment ranks, when a starting bundle is derived, then effects remain plain and scoped", () => {
  const bundle = deriveStartingModifierBundle({
    global_vigor: 2,
    global_edge: 2,
    global_grace: 1,
    house_a_ashvale_fury: 1,
    house_d_duskmere_stride: 2,
  });

  assert.deepEqual(bundle, {
    globalEffects: [
      { maxHpBonus: 20 },
      { attackDamageMultiplier: 1.03 ** 2 },
    ],
    globalSharedEffects: [{ divineRegenMultiplier: 1.08 }],
    houseEffects: [
      {
        houseId: "house_a",
        effects: [{ attackDamageMultiplier: 1.04 }],
      },
      {
        houseId: "house_d",
        effects: [{ moveSpeedMultiplier: 1.04 ** 2 }],
      },
    ],
  } satisfies StartingModifierBundle);
});

test("Given a starting modifier bundle, when a run is created, then global effects reach every house and house effects stay scoped", () => {
  const state = createInitialState(
    4103,
    ["house_a", "house_d", "house_c"],
    {
      globalEffects: [{ maxHpBonus: 20, attackDamageMultiplier: 1.03 ** 2 }],
      globalSharedEffects: [],
      houseEffects: [
        {
          houseId: "house_a",
          effects: [{ attackDamageMultiplier: 1.04 }],
        },
        {
          houseId: "house_d",
          effects: [{ moveSpeedMultiplier: 1.04 ** 2 }],
        },
        {
          houseId: "house_f",
          effects: [{ tributePerKillBonus: 3 }],
        },
      ],
    },
  ).state;
  const ashvale = modifiersForHouse(state, "house_a");
  const duskmere = modifiersForHouse(state, "house_d");
  const greymoor = modifiersForHouse(state, "house_c");
  const ashvaleAgent = state.agents.find(
    ({ houseId, isHero }) => houseId === "house_a" && !isHero,
  );

  assert.equal(ashvale.maxHpBonus, 20);
  assert.equal(duskmere.maxHpBonus, 20);
  assert.equal(greymoor.maxHpBonus, 20);
  assert.equal(ashvale.attackDamageMultiplier, 1.1 * 1.03 ** 2 * 1.04);
  assert.equal(duskmere.attackDamageMultiplier, 1.03 ** 2);
  assert.equal(duskmere.moveSpeedMultiplier, 1.25 * 1.04 ** 2);
  assert.equal(greymoor.tributePerKillBonus, 1);
  assert.equal(ashvaleAgent?.hp, Math.round((100 + 20) * 1));
});

test("Given global grace investments, when a normal trio starts, then shared divine regen is applied once and house modifiers stay scoped", () => {
  const rankOne = createInitialState(
    4104,
    DEFAULT_HOUSE_IDS,
    deriveStartingModifierBundle({
      global_grace: 1,
      global_vigor: 1,
      house_a_ashvale_fury: 1,
    }),
  ).state;
  const rankFour = createInitialState(
    4105,
    DEFAULT_HOUSE_IDS,
    deriveStartingModifierBundle({ global_grace: 4 }),
  ).state;

  assert.equal(
    divineModifiersForState(rankOne).divineRegenMultiplier,
    1.08,
  );
  assert.equal(
    divineModifiersForState(rankFour).divineRegenMultiplier,
    1.08 ** 4,
  );
  for (const houseId of DEFAULT_HOUSE_IDS) {
    assert.equal(modifiersForHouse(rankOne, houseId).maxHpBonus, 10);
  }
  assert.equal(
    modifiersForHouse(rankOne, "house_a").attackDamageMultiplier,
    1.1 * 1.04,
  );
  assert.equal(
    modifiersForHouse(rankOne, "house_b").attackDamageMultiplier,
    1,
  );
  assert.equal(
    modifiersForHouse(rankOne, "house_c").attackDamageMultiplier,
    1,
  );
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
