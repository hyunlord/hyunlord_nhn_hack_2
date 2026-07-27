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

test("Given the no-retuning guardrail, when rarity assignments are inspected, then Sharpened Edge is rare and all legendaries are one-stack", () => {
  const sharpened = CARD_DEFINITIONS.find(
    ({ id }) => id === "common_sharpened_edge",
  );
  const legendaries = CARD_DEFINITIONS.filter(
    ({ rarity }) => rarity === "legendary",
  );

  assert.equal(sharpened?.rarity, "rare");
  assert.equal(sharpened?.effect.attackDamageMultiplier, 1.12);
  assert.equal(legendaries.length, 8);
  assert.ok(legendaries.every(({ maxStacks }) => maxStacks === 1));
});
