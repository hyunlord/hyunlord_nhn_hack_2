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
  disableHeroRespawn: false,
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

test("Given the new Phase 3F common pool, when modifiers resolve, then small low-impact effects are represented", () => {
  const result = resolveModifiers(
    CARD_DEFINITIONS,
    [
      { cardId: "common_stout_sinew", stacks: 3 },
      { cardId: "common_quickened_cadence", stacks: 3 },
      { cardId: "common_tithe_mark", stacks: 3 },
      { cardId: "common_bright_channel", stacks: 3 },
      { cardId: "common_far_ward", stacks: 3 },
      { cardId: "common_warm_embers", stacks: 3 },
    ],
    0,
  );

  assert.equal(result.maxHpBonus, 36);
  assert.ok(Math.abs(result.attackIntervalMultiplier - 0.884736) < 1e-12);
  assert.equal(result.tributePerKillBonus, 3);
  assert.ok(Math.abs(result.divineRegenMultiplier - 1.331) < 1e-12);
  assert.equal(result.hallDefenseRadiusBonus, 90);
  assert.equal(result.interWaveHealBonus, 30);
});

test("Given Phase 3F legendary bargains, when modifiers resolve, then upsides and costs are both typed", () => {
  const result = resolveModifiers(
    CARD_DEFINITIONS,
    [
      { cardId: "legend_zealots_bargain", stacks: 1 },
      { cardId: "legend_hollow_crown", stacks: 1 },
    ],
    0,
  );

  assert.equal(result.attackDamageMultiplier, 1.4);
  assert.equal(result.breakHpRatioDelta, 0.2);
  assert.equal(result.divineRegenMultiplier, 2);
  assert.equal(result.disableHeroRespawn, true);
});

test("Given class-scoped cards, when modifiers resolve for an exact class, then only that class receives the effect", () => {
  const owned = [
    { cardId: "common_stout_sinew", stacks: 1 },
    { cardId: "class_massed_volley", stacks: 1 },
    { cardId: "class_braced_line", stacks: 1 },
    { cardId: "class_running_blades", stacks: 1 },
    { cardId: "class_shieldbreaker", stacks: 1 },
  ];

  const archer = resolveModifiers(
    CARD_DEFINITIONS,
    owned,
    0,
    [],
    "archer",
  );
  const spearman = resolveModifiers(
    CARD_DEFINITIONS,
    owned,
    0,
    [],
    "spear",
  );
  const skirmisher = resolveModifiers(
    CARD_DEFINITIONS,
    owned,
    0,
    [],
    "skirmisher",
  );
  const warrior = resolveModifiers(
    CARD_DEFINITIONS,
    owned,
    0,
    [],
    "melee",
  );

  assert.equal(archer.attackIntervalMultiplier, 0.85);
  assert.equal(archer.maxHpBonus, 12);
  assert.equal(spearman.maxHpBonus, 42);
  assert.equal(spearman.moveSpeedMultiplier, 1);
  assert.equal(skirmisher.moveSpeedMultiplier, 1.2);
  assert.equal(skirmisher.attackDamageMultiplier, 1);
  assert.equal(warrior.attackDamageMultiplier, 1.12);
  assert.equal(warrior.attackIntervalMultiplier, 1);
});

test("Given scoped and unscoped cards, when modifiers resolve without a class context, then scoped effects are skipped and unscoped effects remain", () => {
  const result = resolveModifiers(
    CARD_DEFINITIONS,
    [
      { cardId: "common_stout_sinew", stacks: 2 },
      { cardId: "class_braced_line", stacks: 2 },
    ],
    0,
  );

  assert.equal(result.maxHpBonus, 24);
});

test("Given combat contribution and cumulative XP, when progression is queried, then scaled awards and thresholds are exact", () => {
  assert.deepEqual(LEVEL_THRESHOLDS, [0, 2000, 5200, 9500, 15000]);
  assert.equal(xpForDamage(-10), 0);
  assert.equal(xpForDamage(0), 0);
  assert.equal(xpForDamage(1), 1);
  assert.equal(xpForDamage(19.5), 12);
  assert.equal(xpForDamage(100), 60);
  assert.equal(xpForKill(), 25);
  assert.equal(levelForXp(1999), 1);
  assert.equal(levelForXp(2000), 2);
  assert.equal(levelForXp(5199), 2);
  assert.equal(levelForXp(5200), 3);
  assert.equal(levelForXp(9499), 3);
  assert.equal(levelForXp(9500), 4);
  assert.equal(levelForXp(14999), 4);
  assert.equal(levelForXp(15000), 5);
  assert.equal(xpToNextLevel(1999), 1);
  assert.equal(xpToNextLevel(2000), 3200);
  assert.equal(xpToNextLevel(5199), 1);
  assert.equal(xpToNextLevel(5200), 4300);
  assert.equal(xpToNextLevel(9499), 1);
  assert.equal(xpToNextLevel(9500), 5500);
  assert.equal(xpToNextLevel(14999), 1);
  assert.equal(xpToNextLevel(15000), null);
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
  const owned = [{ cardId: "common_sharpened_edge", stacks: 3 }];
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

test("Given an unlocked skill-grant card with remaining tier stacks, when eligibility is filtered, then it stays unavailable", () => {
  const owned = [{ cardId: "divine_grant_chains", stacks: 1 }];
  const grant = CARD_DEFINITIONS.find(
    ({ id }) => id === "divine_grant_chains",
  );
  const eligible = eligibleCards(
    CARD_DEFINITIONS,
    "house_a",
    owned,
    ["hero_ashvale"],
  );

  assert.equal(grant?.rarity, "rare");
  assert.equal(grant?.maxStacks, 2);
  assert.ok(!eligible.some(({ id }) => id === "divine_grant_chains"));
});

test("Given the Phase 3I card pool, when its budget is inspected, then class cards have their exact rare effects", () => {
  const damageCards = CARD_DEFINITIONS.filter(
    ({ effect }) => effect.attackDamageMultiplier !== undefined,
  );
  const classCards = CARD_DEFINITIONS.filter(({ id }) =>
    id.startsWith("class_"),
  );

  assert.equal(CARD_DEFINITIONS.length, 42);
  assert.equal(damageCards.length, 4);
  assert.deepEqual(
    damageCards.map(({ id }) => id).sort(),
    [
      "class_shieldbreaker",
      "common_sharpened_edge",
      "house_a_emberguard",
      "legend_zealots_bargain",
    ],
  );
  assert.deepEqual(
    classCards.map(({ rarity, effect }) => ({ rarity, effect })),
    [
      {
        rarity: "rare",
        effect: {
          unitClass: "archer",
          attackIntervalMultiplier: 0.85,
        },
      },
      {
        rarity: "rare",
        effect: { unitClass: "spear", maxHpBonus: 30 },
      },
      {
        rarity: "rare",
        effect: {
          unitClass: "skirmisher",
          moveSpeedMultiplier: 1.2,
        },
      },
      {
        rarity: "rare",
        effect: {
          unitClass: "melee",
          attackDamageMultiplier: 1.12,
        },
      },
    ],
  );
});
