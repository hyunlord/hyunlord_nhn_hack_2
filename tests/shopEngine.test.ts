import assert from "node:assert/strict";
import test from "node:test";
import { createInitialState } from "../src/engine/tick";
import type { GameState } from "../src/engine/engine.types";
import {
  purchaseShopItem,
  purchaseTowerAt,
  shopAvailabilityForState,
} from "../src/engine/shopEngine";

function intermissionState(tribute = 500) {
  return {
    ...createInitialState(91).state,
    phase: "intermission" as const,
    tribute,
  };
}

test("Given an unaffordable purchase, when shop resolution runs, then the exact state reference is rejected", () => {
  const state = intermissionState(0);

  assert.strictEqual(
    purchaseShopItem(state, "sharpen_arms"),
    state,
  );
  assert.strictEqual(purchaseTowerAt(state, 480, 300), state);
});

test("Given tribute outside intermission, when any purchase is requested, then the exact state reference is rejected", () => {
  const state = {
    ...intermissionState(),
    phase: "wave" as const,
  };

  assert.strictEqual(
    purchaseShopItem(state, "field_medicine"),
    state,
  );
  assert.strictEqual(purchaseTowerAt(state, 480, 300), state);
});

test("Given no hero is dead, when availability is listed, then revive hero is disabled with its reason", () => {
  const revive = shopAvailabilityForState(intermissionState()).find(
    ({ item }) => item.id === "revive_hero",
  );

  assert.equal(revive?.available, false);
  assert.equal(revive?.reason, "no dead hero");
});

test("Given five fallen regulars in the weakest house, when Recruit Squad is purchased, then exactly those five return at full HP by their hall", () => {
  const initial = intermissionState();
  const fallenIds = initial.agents
    .filter(
      ({ houseId, isHero }) => houseId === "house_a" && !isHero,
    )
    .slice(0, 5)
    .map(({ id }) => id);
  const state = {
    ...initial,
    agents: initial.agents.map((agent) =>
      fallenIds.includes(agent.id)
        ? { ...agent, hp: 0, state: "dead" as const }
        : agent,
    ),
  };
  const snapshot = structuredClone(state);

  const result = purchaseShopItem(state, "recruit_squad");
  const hall = state.halls.find(({ houseId }) => houseId === "house_a");

  assert.equal(
    result.agents.filter(
      ({ id, hp }) => fallenIds.includes(id) && hp > 0,
    ).length,
    5,
  );
  assert.ok(
    result.agents
      .filter(({ id }) => fallenIds.includes(id))
      .every(({ x, y, hp }) => x === hall?.x && y === hall?.y && hp === 100),
  );
  assert.equal(result.shopPurchases.recruit_squad, 1);
  assert.equal(result.tribute, state.tribute - 40);
  assert.deepEqual(state, snapshot);
});

test("Given valid and invalid tower positions, when placement commits, then only the valid click deducts tribute and creates a tower", () => {
  const state = intermissionState();
  const invalid = purchaseTowerAt(
    state,
    state.halls[0]?.x ?? 0,
    state.halls[0]?.y ?? 0,
  );
  const valid = purchaseTowerAt(state, 480, 300);

  assert.strictEqual(invalid, state);
  assert.equal(valid.towers.length, 1);
  assert.equal(valid.towers[0]?.hp, 300);
  assert.equal(valid.shopPurchases.raise_tower, 1);
  assert.equal(valid.tribute, state.tribute - 70);
});

test("Given a damaged army, hall, and dead hero, when matching purchases resolve, then exact effects apply deterministically", () => {
  const initial = intermissionState();
  const regular = initial.agents.find(({ isHero }) => !isHero);
  const hero = initial.agents.find(({ isHero }) => isHero);
  if (regular === undefined || hero === undefined) {
    throw new RangeError("Expected agent fixtures.");
  }
  let state: GameState = {
    ...initial,
    agents: initial.agents.map((agent) =>
      agent.id === regular.id
        ? { ...agent, hp: 20 }
        : agent.id === hero.id
          ? {
              ...agent,
              hp: 0,
              state: "dead" as const,
              respawnAtTick: 900,
            }
          : agent,
    ),
    halls: initial.halls.map((hall, index) =>
      index === 0 ? { ...hall, hp: 400 } : hall,
    ),
  };

  state = purchaseShopItem(state, "field_medicine");
  state = purchaseShopItem(state, "reinforce_hall");
  state = purchaseShopItem(state, "sharpen_arms");
  state = purchaseShopItem(state, "revive_hero");

  assert.equal(
    state.agents.find(({ id }) => id === regular.id)?.hp,
    65,
  );
  assert.equal(state.halls[0]?.hp, 700);
  assert.equal(state.runUpgrades.attackDamageMultiplier, 1.08);
  assert.ok((state.agents.find(({ id }) => id === hero.id)?.hp ?? 0) > 0);
});
