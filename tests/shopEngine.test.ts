import assert from "node:assert/strict";
import test from "node:test";
import {
  TOWER_CONFIG,
  createTower,
} from "../src/build/structures";
import {
  EMPTY_PURCHASES,
  priceForItem,
} from "../src/build/shop";
import { BALANCE_CONFIG } from "../src/content/balanceConfig";
import { applyTowerDamages } from "../src/engine/combatDamage";
import { createInitialState } from "../src/engine/tick";
import type { GameState } from "../src/engine/engine.types";
import {
  purchaseShopItem,
  purchaseTowerAt,
  shopAvailabilityForState,
} from "../src/engine/shopEngine";
import {
  cardApplicabilityWarnings,
} from "../src/progression/cardApplicability";

function intermissionState(tribute = 500): GameState {
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
  assert.strictEqual(purchaseTowerAt(state, 860, 300), state);
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
  assert.strictEqual(purchaseTowerAt(state, 860, 300), state);
});

test("Given no hero is dead, when availability is listed, then revive hero is disabled with its reason", () => {
  const revive = shopAvailabilityForState(intermissionState()).find(
    ({ item }) => item.id === "revive_hero",
  );

  assert.equal(revive?.available, false);
  assert.equal(revive?.reason, "no dead hero");
});

test("Given five fallen regulars in the weakest house, when Recruit Squad is purchased, then exactly those five return at full HP by their banner", () => {
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
  const banner = state.banners.find(({ houseId }) => houseId === "house_a");

  assert.equal(
    result.agents.filter(
      ({ id, hp }) => fallenIds.includes(id) && hp > 0,
    ).length,
    5,
  );
  assert.ok(
    result.agents
      .filter(({ id }) => fallenIds.includes(id))
      .every(({ x, y, hp }) => x === banner?.x && y === banner?.y && hp === 100),
  );
  assert.equal(result.shopPurchases.recruit_squad, 1);
  assert.equal(result.tribute, state.tribute - 40);
  assert.deepEqual(state, snapshot);
});

test("Given valid, keep-overlapping, and banner-overlapping tower positions, when placement commits, then only the valid click deducts tribute and creates a tower", () => {
  const state = intermissionState();
  const keepOverlap = purchaseTowerAt(state, state.keep.x, state.keep.y);
  const banner = state.banners[0];
  if (banner === undefined) {
    throw new RangeError("Expected banner fixture.");
  }
  const bannerOverlap = purchaseTowerAt(state, banner.x, banner.y);
  const destroyedBannerOverlap = purchaseTowerAt(
    {
      ...state,
      banners: state.banners.map((candidate) =>
        candidate.houseId === banner.houseId
          ? { ...candidate, hp: 0 }
          : candidate,
      ),
    },
    banner.x,
    banner.y,
  );
  const valid = purchaseTowerAt(state, 860, 300);

  assert.strictEqual(keepOverlap, state);
  assert.strictEqual(bannerOverlap, state);
  assert.equal(destroyedBannerOverlap.towers.length, state.towers.length);
  assert.equal(valid.towers.length, 1);
  assert.equal(valid.towers[0]?.hp, 300);
  assert.equal(valid.shopPurchases.raise_tower, 1);
  assert.equal(valid.tribute, state.tribute - 70);
});

test("Given Deeproot Dominion, when a tower is priced and purchased, then its tribute cost is reduced by exactly 40%", () => {
  const initial = intermissionState(42);
  const state = {
    ...initial,
    houseModifiers: initial.houseModifiers.map((entry) =>
      entry.houseId === "house_c"
        ? {
            ...entry,
            modifiers: {
              ...entry.modifiers,
              towerCostMultiplier: 0.6,
            },
          }
        : entry,
    ),
  };

  const tower = shopAvailabilityForState(state).find(
    ({ item }) => item.id === "raise_tower",
  );
  const result = purchaseTowerAt(state, 860, 300);

  assert.equal(tower?.cost, 42);
  assert.equal(tower?.available, true);
  assert.equal(result.tribute, 0);
  assert.equal(result.towers.length, 1);
});

test("Given a max-count tower field loses one tower, when a replacement is purchased, then only living towers constrain count and spacing", () => {
  const initial = intermissionState();
  const towers = Array.from(
    { length: TOWER_CONFIG.TOWER_MAX_COUNT },
    (_, index) => createTower(`tower_${index}`, 60 + index * 80, 520),
  );
  const damage = applyTowerDamages(
    towers,
    [
      {
        structureId: "tower_0",
        amount: TOWER_CONFIG.TOWER_HP,
      },
    ],
    73,
  );
  const state = {
    ...initial,
    towers: damage.towers,
  };

  const result = purchaseTowerAt(state, towers[0]?.x ?? 0, towers[0]?.y ?? 0);

  assert.equal(damage.destroyed.length, 1);
  assert.equal(result.towers.length, TOWER_CONFIG.TOWER_MAX_COUNT);
  assert.equal(result.towers.at(-1)?.x, towers[0]?.x);
  assert.equal(result.towers.at(-1)?.y, 520);
});

test("Given a damaged army, keep, and dead hero, when matching purchases resolve, then exact effects apply deterministically", () => {
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
    keep: { ...initial.keep, hp: 400 },
  };

  state = purchaseShopItem(state, "field_medicine");
  state = purchaseShopItem(state, "reinforce_keep");
  state = purchaseShopItem(state, "sharpen_arms");
  state = purchaseShopItem(state, "revive_hero");

  assert.equal(
    state.agents.find(({ id }) => id === regular.id)?.hp,
    65,
  );
  assert.equal(state.keep.hp, 700);
  assert.equal(state.runUpgrades.attackDamageMultiplier, 1.08);
  assert.ok((state.agents.find(({ id }) => id === hero.id)?.hp ?? 0) > 0);
});

test("Given reinforce keep is renamed, when prices and availability resolve, then the old id is absent and the existing curve remains", () => {
  const initial = intermissionState();
  const state = {
    ...initial,
    keep: { ...initial.keep, hp: 2_000 },
  };
  const availability = shopAvailabilityForState(state);
  const itemIds: readonly string[] = availability.map(({ item }) => item.id);

  assert.equal(priceForItem("reinforce_keep", EMPTY_PURCHASES), 45);
  assert.equal(
    priceForItem("reinforce_keep", {
      ...EMPTY_PURCHASES,
      reinforce_keep: 1,
    }),
    59,
  );
  assert.equal(itemIds.includes(`reinforce_${"hall"}`), false);
  assert.equal(
    availability.find(({ item }) => item.id === "reinforce_keep")?.available,
    true,
  );
});

test("Given damaged keep and banners, when reinforce keep is purchased, then the lowest hp ratio repairs exactly 300 and clamps at max", () => {
  const initial = intermissionState();
  let state: GameState = {
    ...initial,
    keep: { ...initial.keep, hp: 2_300 },
    banners: initial.banners.map((banner, index) =>
      index === 0
        ? { ...banner, hp: 100, maxHp: 420 }
        : index === 1
          ? { ...banner, hp: 400, maxHp: 420 }
          : banner,
    ),
  };

  state = purchaseShopItem(state, "reinforce_keep");
  assert.equal(state.banners[0]?.hp, 400);
  assert.equal(state.keep.hp, 2_300);

  state = purchaseShopItem(state, "reinforce_keep");
  assert.equal(state.banners[0]?.hp, 420);
});

test("Given equal repair ratios in shuffled banners, when reinforce keep is purchased, then stable structure id chooses the same banner", () => {
  const initial = intermissionState();
  const banners = [...initial.banners]
    .reverse()
    .map((banner) => ({ ...banner, hp: 210, maxHp: 420 }));
  const state = purchaseShopItem(
    {
      ...initial,
      keep: { ...initial.keep, hp: 1_200, maxHp: 2_400 },
      banners,
    },
    "reinforce_keep",
  );

  assert.equal(
    state.banners.find(({ houseId }) => houseId === "house_a")?.hp,
    420,
  );
  assert.equal(
    state.banners.find(({ houseId }) => houseId === "house_b")?.hp,
    210,
  );
  assert.equal(state.keep.hp, 1_200);
});

test("Given destroyed banners and full structures, when reinforce keep is requested, then destroyed banners are excluded and unavailable no-ops preserve state", () => {
  const initial = intermissionState();
  const destroyedOnly = {
    ...initial,
    keep: { ...initial.keep, hp: initial.keep.maxHp },
    banners: initial.banners.map((banner) =>
      banner.houseId === "house_a" ? { ...banner, hp: 0 } : banner,
    ),
  };

  assert.strictEqual(
    purchaseShopItem(destroyedOnly, "reinforce_keep"),
    destroyedOnly,
  );
});

test("Given house-scoped cards, when owning banner or fallback keep state is checked, then only houses without a live anchor warn", () => {
  const initial = intermissionState();
  const houseCard = {
    effect: {},
    houseId: "house_a",
  };

  assert.deepEqual(cardApplicabilityWarnings({
    card: houseCard,
    selectedHouseIds: initial.selectedHouseIds,
    agents: [],
    keep: { ...initial.keep, hp: BALANCE_CONFIG.KEEP_HP },
    banners: initial.banners.map((banner) =>
      banner.houseId === "house_a" ? { ...banner, hp: 0 } : banner,
    ),
  }), []);
  assert.deepEqual(cardApplicabilityWarnings({
    card: houseCard,
    selectedHouseIds: initial.selectedHouseIds,
    agents: [],
    keep: { ...initial.keep, hp: 0 },
    banners: initial.banners.map((banner) =>
      banner.houseId === "house_a" ? { ...banner, hp: 0 } : banner,
    ),
  }), [{ kind: "fallenHouseStronghold", houseId: "house_a" }]);
});
