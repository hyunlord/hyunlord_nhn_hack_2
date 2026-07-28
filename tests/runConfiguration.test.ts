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
  divineModifiersForState,
  modifiersForHouse,
} from "../src/engine/progressionEngine";
import { createInitialState } from "../src/engine/tick";
import { createDefaultMetaState } from "../src/meta/legacy";

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
