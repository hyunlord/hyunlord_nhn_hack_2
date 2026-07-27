import assert from "node:assert/strict";
import test from "node:test";
import { CARD_DEFINITIONS } from "../src/content/cardConfig";
import type { Rng } from "../src/content/random";
import { createRng } from "../src/engine/prng";
import {
  generateOffer,
  rarityFallbackOrder,
  rollRarity,
} from "../src/progression/cardPool";
import { conditionalModifiers } from "../src/progression/modifiers";
import type {
  CardDefinition,
  HouseProgress,
} from "../src/progression/progression.types";

function progress(): HouseProgress {
  return { houseId: "house_a", xp: 500, level: 2, cards: [] };
}

function sequenceRng(values: readonly number[]): Rng {
  let index = 0;
  const next = () => {
    const value = values[index] ?? 0;
    index += 1;
    return value;
  };
  return {
    next,
    range(min, max) {
      return min + next() * (max - min);
    },
    int(minInclusive, maxExclusive) {
      return Math.floor(
        minInclusive + next() * (maxExclusive - minInclusive),
      );
    },
    pick<T>(items: readonly T[]) {
      const item = items[this.int(0, items.length)];
      if (item === undefined) {
        throw new RangeError("Expected a scripted pick candidate.");
      }
      return item;
    },
  };
}

function fixture(
  id: string,
  rarity: CardDefinition["rarity"],
): CardDefinition {
  return {
    id,
    kind: "common",
    rarity,
    name: id,
    description: id,
    maxStacks: 1,
    effect: {},
  };
}

test("Given a large deterministic sample, when rarities roll, then the 65/27/8 weights hold within one percent", () => {
  const rng = createRng(810);
  const counts = { common: 0, rare: 0, legendary: 0 };
  const sampleSize = 100_000;
  for (let index = 0; index < sampleSize; index += 1) {
    counts[rollRarity(rng)] += 1;
  }

  assert.ok(Math.abs(counts.common / sampleSize - 0.65) < 0.01);
  assert.ok(Math.abs(counts.rare / sampleSize - 0.27) < 0.01);
  assert.ok(Math.abs(counts.legendary / sampleSize - 0.08) < 0.01);
});

test("Given the Phase 3F card pool, when rarity composition is inspected, then frequency tiers match the contract", () => {
  const counts = CARD_DEFINITIONS.reduce(
    (result, card) => ({
      ...result,
      [card.rarity]: result[card.rarity] + 1,
    }),
    { common: 0, rare: 0, legendary: 0 },
  );
  const reclassifiedIds = [
    "common_sharpened_edge",
    "common_drilled_ranks",
    "common_unbroken_will",
    "divine_wider_wrath",
    "divine_open_channel",
  ];

  assert.equal(CARD_DEFINITIONS.length, 38);
  assert.deepEqual(counts, {
    common: 14,
    rare: 14,
    legendary: 10,
  });
  assert.ok(counts.common > counts.legendary);
  assert.ok(
    reclassifiedIds.every((id) =>
      CARD_DEFINITIONS.find((card) => card.id === id)?.rarity === "common",
    ),
  );
});

test("Given the Phase 3F card pool, when tier stack limits are inspected, then every definition uses the tier maximum", () => {
  const maxStacksByRarity = {
    common: 3,
    rare: 2,
    legendary: 1,
  } as const;

  assert.ok(
    CARD_DEFINITIONS.every(
      (card) => card.maxStacks === maxStacksByRarity[card.rarity],
    ),
  );
});

test("Given each rarity, when its fallback is resolved, then it only moves downward", () => {
  assert.deepEqual(rarityFallbackOrder("common"), ["common"]);
  assert.deepEqual(rarityFallbackOrder("rare"), ["rare", "common"]);
  assert.deepEqual(
    rarityFallbackOrder("legendary"),
    ["legendary", "rare", "common"],
  );
});

test("Given three common rolls and a mixed pool, when an offer generates, then the third slot rerolls to another rarity", () => {
  const cards = [
    fixture("common_a", "common"),
    fixture("common_b", "common"),
    fixture("common_c", "common"),
    fixture("rare_a", "rare"),
  ];

  const offer = generateOffer(
    cards,
    progress(),
    sequenceRng([0.1, 0.1, 0.1, 0.5, 0, 0, 0]),
  );
  const rarities = offer.cardIds.map(
    (cardId) => cards.find(({ id }) => id === cardId)?.rarity,
  );

  assert.equal(offer.cardIds.length, 3);
  assert.equal(new Set(rarities).size, 2);
  assert.ok(rarities.includes("rare"));
});

test("Given common cards are exhausted and rare cards remain, when an offer rolls common, then slots are omitted instead of falling upward", () => {
  const cards = [
    { ...fixture("common_a", "common"), maxStacks: 3 },
    { ...fixture("common_b", "common"), maxStacks: 3 },
    fixture("rare_a", "rare"),
    fixture("rare_b", "rare"),
    fixture("rare_c", "rare"),
  ];
  const exhausted = {
    ...progress(),
    cards: [
      { cardId: "common_a", stacks: 3 },
      { cardId: "common_b", stacks: 3 },
    ],
  };

  const offer = generateOffer(
    cards,
    exhausted,
    sequenceRng([0.1, 0.1, 0.1, 0.1]),
  );

  assert.deepEqual(offer.cardIds, []);
});

test("Given an eligible house card, when offers generate across seeds, then every offer retains the house guarantee", () => {
  for (let seed = 1; seed <= 100; seed += 1) {
    const offer = generateOffer(
      CARD_DEFINITIONS,
      progress(),
      createRng(seed),
      ["hero_ashvale"],
    );
    assert.ok(
      offer.cardIds.some(
        (cardId) =>
          CARD_DEFINITIONS.find(({ id }) => id === cardId)?.kind ===
          "house",
      ),
    );
  }
});

test("Given a house guarantee would replace the only rarer card, when the offer is finalized, then rarity variety is preserved", () => {
  const cards: CardDefinition[] = [
    {
      ...fixture("house_a_common", "common"),
      kind: "house",
      houseId: "house_a",
    },
    fixture("common_a", "common"),
    fixture("common_b", "common"),
    fixture("rare_a", "rare"),
  ];

  const offer = generateOffer(
    cards,
    progress(),
    sequenceRng([0.7, 0.1, 0.1, 0, 0, 0, 0, 0]),
  );
  const offeredCards = offer.cardIds.map((cardId) =>
    cards.find(({ id }) => id === cardId),
  );

  assert.ok(offeredCards.some((card) => card?.kind === "house"));
  assert.deepEqual(
    new Set(offeredCards.map((card) => card?.rarity)),
    new Set(["common", "rare"]),
  );
});

test("Given legendary conditions at and around their boundaries, when modifiers resolve, then activation is strict", () => {
  const owned = [
    { cardId: "legend_last_bastion", stacks: 1 },
    { cardId: "legend_ironblood", stacks: 1 },
  ];

  assert.deepEqual(
    conditionalModifiers(owned, {
      hallLowestHpRatio: 0.25,
      agentHpRatio: 0.4,
    }),
    {},
  );
  assert.deepEqual(
    conditionalModifiers(owned, {
      hallLowestHpRatio: 0.249,
      agentHpRatio: 0.399,
    }),
    {
      attackDamageMultiplier: 1.3,
      damageTakenMultiplier: 0.65,
    },
  );
});

test("Given Phase 3F legendary tradeoffs, when descriptions are inspected, then costs and skill constraints are visible", () => {
  const byId = new Map(CARD_DEFINITIONS.map((card) => [card.id, card]));

  assert.match(byId.get("legend_ash_crown")?.description ?? "", /slower/i);
  assert.match(byId.get("legend_deeproot")?.description ?? "", /slower/i);
  assert.match(
    byId.get("legend_twin_souls")?.description ?? "",
    /durability/i,
  );
  assert.match(byId.get("divine_grant_meteor")?.description ?? "", /55/);
  assert.match(
    byId.get("divine_grant_meteor")?.description ?? "",
    /friendly tower/i,
  );
  assert.match(byId.get("divine_grant_resurgence")?.description ?? "", /70/);
  assert.match(byId.get("divine_grant_resurgence")?.description ?? "", /600/);
});
