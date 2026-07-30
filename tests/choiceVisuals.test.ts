import assert from "node:assert/strict";
import test from "node:test";
import { HOUSE_CONFIG } from "../src/content/houseConfig";
import {
  cardEffectIcon,
  houseTraitIcons,
  pageCount,
  pageItems,
  shopItemIcon,
} from "../src/ui/choicePresentation/choiceVisuals";

test("choice effects use one stable semantic icon", () => {
  assert.equal(cardEffectIcon({ attackDamageMultiplier: 1.12 }), "attack");
  assert.equal(cardEffectIcon({ maxHpBonus: 25 }), "defense");
  assert.equal(cardEffectIcon({ tributePerKillBonus: 1 }), "tribute");
  assert.equal(cardEffectIcon({ interWaveHealBonus: 10 }), "healing");
  assert.equal(cardEffectIcon({ moveSpeedMultiplier: 1.15 }), "mobility");
  assert.equal(cardEffectIcon({ divineRegenMultiplier: 1.1 }), "divine");
});

test("house cards expose no more than two trait icons", () => {
  for (const house of HOUSE_CONFIG) {
    assert.ok(houseTraitIcons(house).length <= 2);
  }
  assert.deepEqual(houseTraitIcons(HOUSE_CONFIG[0]), ["attack"]);
  assert.deepEqual(houseTraitIcons(HOUSE_CONFIG[5]), ["attack", "tribute"]);
});

test("house and shop inventories page as deterministic groups of three", () => {
  assert.equal(pageCount(HOUSE_CONFIG), 2);
  assert.deepEqual(
    pageItems(HOUSE_CONFIG, 1).map(({ id }) => id),
    ["house_d", "house_e", "house_f"],
  );
  assert.equal(shopItemIcon("raise_tower"), "defense");
  assert.equal(shopItemIcon("recruit_squad"), "population");
});
