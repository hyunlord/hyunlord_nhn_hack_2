import assert from "node:assert/strict";
import test from "node:test";
import { BALANCE_CONFIG } from "../src/content/balanceConfig";
import { applyDefenseStructureDamages } from "../src/engine/combatDamage";
import { createDefenseStructures } from "../src/engine/defenseStructures";
import type { Banner, GameState, Keep } from "../src/engine/engine.types";

function assertApproxEqual(actual: number, expected: number): void {
  assert.ok(Math.abs(actual - expected) < 0.000001, `${actual} !== ${expected}`);
}

test("Given balance constants, when keep and banner geometry is inspected, then exact structure values ship", () => {
  assert.equal(BALANCE_CONFIG.KEEP_HP, 2_400);
  assert.equal(BALANCE_CONFIG.KEEP_RADIUS, 26);
  assert.equal(BALANCE_CONFIG.KEEP_DEFENSE_RADIUS, 200);
  assert.equal(BALANCE_CONFIG.BANNER_HP, 420);
  assert.equal(BALANCE_CONFIG.BANNER_RADIUS, 11);
  assert.equal(BALANCE_CONFIG.BANNER_ORBIT_RADIUS, 52);
});

test("Given an ordered house selection, when defense structures are created, then the keep and banners use fixed center and pick order", () => {
  const structures = createDefenseStructures([
    "house_f",
    "house_a",
    "house_d",
  ]);

  assert.deepEqual(structures.keep, {
    x: 480,
    y: 300,
    hp: 2_400,
    maxHp: 2_400,
  });
  assert.equal(structures.banners.length, 3);
  assert.deepEqual(
    structures.banners.map(({ houseId, hp, maxHp }) => ({
      houseId,
      hp,
      maxHp,
    })),
    [
      { houseId: "house_f", hp: 420, maxHp: 420 },
      { houseId: "house_a", hp: 420, maxHp: 420 },
      { houseId: "house_d", hp: 420, maxHp: 420 },
    ],
  );
  assertApproxEqual(structures.banners[0].x, 480);
  assertApproxEqual(structures.banners[0].y, 248);
  assertApproxEqual(structures.banners[1].x, 525.0333209967908);
  assertApproxEqual(structures.banners[1].y, 326);
  assertApproxEqual(structures.banners[2].x, 434.9666790032092);
  assertApproxEqual(structures.banners[2].y, 326);
});

test("Given engine structure types, when game state contracts are checked, then keep and banners are the structure fields", () => {
  const keep: Keep = { x: 480, y: 300, hp: 2_400, maxHp: 2_400 };
  const banner: Banner = {
    houseId: "house_a",
    x: 480,
    y: 248,
    hp: 420,
    maxHp: 420,
  };
  const structures: Pick<GameState, "keep" | "banners"> = {
    keep,
    banners: [banner],
  };

  assert.deepEqual(structures, { keep, banners: [banner] });
});

test("Given defense structures, when assigned into GameState structure fields, then banners need no cast", () => {
  const structures: Pick<GameState, "keep" | "banners"> =
    createDefenseStructures(["house_b", "house_c", "house_f"]);

  assert.equal(structures.banners.length, 3);
});

test("Given banner damage for house_a, when defense structure damage is reduced, then only banner:house_a loses HP", () => {
  const structures = createDefenseStructures([
    "house_a",
    "house_b",
    "house_c",
  ]);

  const result = applyDefenseStructureDamages(
    structures.keep,
    structures.banners,
    [
      { structureId: "banner:house_a", amount: 100 },
      { structureId: "banner:house_a", amount: 50 },
    ],
  );

  assert.equal(result.keep.hp, BALANCE_CONFIG.KEEP_HP);
  assert.equal(
    result.banners.find(({ houseId }) => houseId === "house_a")?.hp,
    BALANCE_CONFIG.BANNER_HP - 150,
  );
  assert.equal(
    result.banners.find(({ houseId }) => houseId === "house_b")?.hp,
    BALANCE_CONFIG.BANNER_HP,
  );
});

test("Given lethal keep damage, when defense structure damage is reduced, then keep HP clamps at zero and banners are unchanged", () => {
  const structures = createDefenseStructures([
    "house_a",
    "house_b",
    "house_c",
  ]);

  const result = applyDefenseStructureDamages(
    structures.keep,
    structures.banners,
    [
      { structureId: "keep", amount: BALANCE_CONFIG.KEEP_HP - 1 },
      { structureId: "keep", amount: 12 },
    ],
  );

  assert.equal(result.keep.hp, 0);
  assert.deepEqual(result.banners, structures.banners);
});
