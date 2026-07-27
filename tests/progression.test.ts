import assert from "node:assert/strict";
import test from "node:test";
import { CARD_DEFINITIONS } from "../src/content/cardConfig";
import { createRng } from "../src/engine/prng";
import {
  eligibleCards,
  generateOffer,
} from "../src/progression/cardPool";
import {
  resolveModifiers,
  type ResolvedModifiers,
} from "../src/progression/modifiers";
import type {
  CardDefinition,
  HouseProgress,
} from "../src/progression/progression.types";
import {
  LEVEL_THRESHOLDS,
  levelForXp,
  xpForDamage,
  xpForKill,
  xpToNextLevel,
} from "../src/progression/xp";

const NEUTRAL_MODIFIERS: ResolvedModifiers = {
  attackDamageMultiplier: 1,
  attackIntervalMultiplier: 1,
  maxHpBonus: 0,
  maxHpMultiplier: 1,
  moveSpeedMultiplier: 1,
  threatSenseRadiusBonus: 0,
  breakHpRatioDelta: 0,
  hallDefenseRadiusBonus: 0,
  divineRegenMultiplier: 1,
  divineCostMultiplier: 1,
  miracleRadiusMultiplier: 1,
  miracleHealMultiplier: 1,
  tributePerKillBonus: 0,
  interWaveHealBonus: 0,
  heroDamageMultiplier: 1,
  heroMaxHpMultiplier: 1,
  heroRespawnTicksMultiplier: 1,
  heroAuraRadiusBonus: 0,
  heroOnKillHeal: 0,
  damageTakenMultiplier: 1,
  divinePowerPerAgentDeath: 0,
  ignoreBreak: false,
  towerCostMultiplier: 1,
  heroRespawnHpMultiplier: 1,
};

function progress(
  cards: HouseProgress["cards"] = [],
): HouseProgress {
  return { houseId: "house_a", xp: 500, level: 2, cards };
}

test("Given no cards or automatic growth, when modifiers resolve, then every field is exactly neutral", () => {
  assert.deepEqual(resolveModifiers(CARD_DEFINITIONS, [], 0), NEUTRAL_MODIFIERS);
});

test("Given two Sharpened Edge stacks, when modifiers resolve, then multipliers compound to 1.2544", () => {
  const result = resolveModifiers(
    CARD_DEFINITIONS,
    [{ cardId: "common_sharpened_edge", stacks: 2 }],
    0,
  );

  assert.ok(Math.abs(result.attackDamageMultiplier - 1.2544) < 1e-12);
});

test("Given combat contribution and cumulative XP, when progression is queried, then thresholds are exact", () => {
  assert.deepEqual(LEVEL_THRESHOLDS, [0, 500, 1200, 2200, 3500]);
  assert.equal(xpForDamage(19.5), 19.5);
  assert.equal(xpForKill(), 25);
  assert.equal(levelForXp(499), 1);
  assert.equal(levelForXp(501), 2);
  assert.equal(levelForXp(3500), 5);
  assert.equal(xpToNextLevel(499), 1);
  assert.equal(xpToNextLevel(501), 699);
  assert.equal(xpToNextLevel(3500), null);
});

test("Given reordered definitions and equal seeds, when offers generate, then card ids are deterministic and order-independent", () => {
  const forward = generateOffer(
    CARD_DEFINITIONS,
    progress(),
    createRng(91),
  );
  const reversed = generateOffer(
    [...CARD_DEFINITIONS].reverse(),
    progress(),
    createRng(91),
  );

  assert.deepEqual(forward, reversed);
  assert.equal(new Set(forward.cardIds).size, forward.cardIds.length);
  assert.equal(forward.cardIds.length, 3);
  assert.ok(
    forward.cardIds.some(
      (cardId) =>
        CARD_DEFINITIONS.find(({ id }) => id === cardId)?.kind === "house",
    ),
  );
});

test("Given owned and foreign heroes, when eligibility is filtered, then only the matching defined hero can appear", () => {
  const fixtures: readonly CardDefinition[] = [
    ...CARD_DEFINITIONS,
    {
      id: "hero_matching",
      kind: "hero",
      rarity: "rare",
      heroId: "hero_ashvale",
      houseId: "house_a",
      name: "Matching Hero",
      description: "Available to its owning house.",
      maxStacks: 1,
      effect: { heroDamageMultiplier: 1.2 },
    },
    {
      id: "hero_foreign",
      kind: "hero",
      rarity: "rare",
      heroId: "hero_thornhold",
      houseId: "house_b",
      name: "Foreign Hero",
      description: "Unavailable to another house.",
      maxStacks: 1,
      effect: { heroDamageMultiplier: 1.2 },
    },
    {
      id: "hero_undefined",
      kind: "hero",
      rarity: "rare",
      heroId: "hero_missing",
      houseId: "house_a",
      name: "Undefined Hero",
      description: "Unavailable without a defined owned hero.",
      maxStacks: 1,
      effect: {},
    },
  ];
  const owned = [{ cardId: "common_sharpened_edge", stacks: 2 }];
  const ownedHeroIds = ["hero_ashvale"];
  const eligible = eligibleCards(
    fixtures,
    "house_a",
    owned,
    ownedHeroIds,
  );
  const ids = eligible.map(({ id }) => id);
  const offer = generateOffer(
    fixtures,
    progress(owned),
    createRng(7),
    ownedHeroIds,
  );

  assert.ok(!ids.includes("common_sharpened_edge"));
  assert.ok(ids.includes("hero_matching"));
  assert.ok(!ids.includes("hero_foreign"));
  assert.ok(!ids.includes("hero_undefined"));
  assert.ok(!ids.some((id) => id.startsWith("house_b_")));
  assert.ok(!ids.some((id) => id.startsWith("house_c_")));
  assert.equal(new Set(offer.cardIds).size, offer.cardIds.length);
  assert.ok(!offer.cardIds.includes("common_sharpened_edge"));
});

test("Given the Phase 3E card pool, when its budget is inspected, then thirty cards obey their rarity damage ceilings", () => {
  const damageCards = CARD_DEFINITIONS.filter(
    ({ effect }) => effect.attackDamageMultiplier !== undefined,
  );

  assert.equal(CARD_DEFINITIONS.length, 30);
  assert.equal(damageCards.length, 2);
  assert.ok(
    damageCards.every(
      ({ effect, rarity }) =>
        (effect.attackDamageMultiplier ?? 1) <=
        (
          rarity === "common"
            ? 1.08
            : rarity === "rare"
              ? 1.15
              : 1.25
        ),
    ),
  );
});
