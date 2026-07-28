import assert from "node:assert/strict";
import test from "node:test";
import { BALANCE_CONFIG } from "../src/content/balanceConfig";
import { createDefenseStructures } from "../src/engine/defenseStructures";
import type { Banner, GameState, Keep } from "../src/engine/engine.types";

function assertApproxEqual(actual: number, expected: number): void {
  assert.ok(Math.abs(actual - expected) < 0.000001, `${actual} !== ${expected}`);
}

test("Given balance constants, when keep and banner geometry is inspected, then exact structure values ship", () => {
  assert.equal(BALANCE_CONFIG.KEEP_HP, 2_400);
  assert.equal(BALANCE_CONFIG.KEEP_RADIUS, 26);
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
