import assert from "node:assert/strict";
import test from "node:test";
import {
  EMPTY_PURCHASES,
  priceForItem,
  shopAvailability,
} from "../src/build/shop";
import {
  TOWER_CONFIG,
  createTower,
  validateTowerPlacement,
} from "../src/build/structures";
import type { TowerPlacementContext } from "../src/build/build.types";

test("Given shop purchases, when prices resolve, then exact growth curves are rounded", () => {
  assert.equal(priceForItem("recruit_squad", EMPTY_PURCHASES), 40);
  assert.equal(
    priceForItem("raise_tower", { ...EMPTY_PURCHASES, raise_tower: 2 }),
    93,
  );
  assert.equal(
    priceForItem("sharpen_arms", {
      ...EMPTY_PURCHASES,
      sharpen_arms: 1,
    }),
    80,
  );
});

test("Given a neutral shop snapshot, when availability resolves, then every item exposes cost and visible reason", () => {
  const availability = shopAvailability({
    tribute: 69,
    purchases: EMPTY_PURCHASES,
    towerCount: 0,
    damagedAgentCount: 0,
    damagedStructureCount: 0,
    deadHeroCount: 0,
    deadRegularAgentCount: 1,
  });

  assert.equal(availability.length, 6);
  assert.equal(
    availability.find(({ item }) => item.id === "recruit_squad")?.available,
    true,
  );
  assert.equal(
    availability.find(({ item }) => item.id === "raise_tower")?.reason,
    "not enough tribute",
  );
  assert.equal(
    availability.find(({ item }) => item.id === "revive_hero")?.reason,
    "no dead hero",
  );
});

test("Given tower placement candidates, when pure validation runs, then bounds, spacing, defense structure distance, and max living towers are enforced", () => {
  const base = {
    worldWidth: 960,
    worldHeight: 600,
    structures: [
      { id: "keep", x: 120, y: 120, hp: 900, maxHp: 900, radius: 16 },
    ],
    towers: [createTower("tower_0", 300, 300)],
  } satisfies TowerPlacementContext;

  assert.equal(
    validateTowerPlacement(20, 20, base).ok,
    true,
  );
  assert.equal(
    validateTowerPlacement(4, 20, base).reason,
    "outside buildable bounds",
  );
  assert.equal(
    validateTowerPlacement(330, 300, base).reason,
    "too close to another tower",
  );
  assert.equal(
    validateTowerPlacement(130, 120, base).reason,
    "too close to keep or banner",
  );
  assert.equal(
    validateTowerPlacement(800, 300, {
      ...base,
      towers: Array.from({ length: TOWER_CONFIG.TOWER_MAX_COUNT }, (_, index) =>
        createTower(`tower_${index}`, 60 + index * 80, 520),
      ),
    }).reason,
    "tower limit reached",
  );
});
