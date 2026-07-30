import assert from "node:assert/strict";
import test from "node:test";
import {
  applyProgressionAwards,
  chooseDraftCard,
  modifiersForHouse,
} from "../src/engine/progressionEngine";
import { createRng } from "../src/engine/prng";
import { createInitialState } from "../src/engine/tick";

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
  assert.equal(state.agents.filter(({ isHero }) => !isHero).length, 84);
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
    [{ houseId: "house_a", xp: 2000 }],
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
