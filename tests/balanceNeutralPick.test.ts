import assert from "node:assert/strict";
import test from "node:test";
import { parseHarnessOptions } from "../scripts/balanceOptions";
import { chooseDraftCardId } from "../scripts/balanceHarness";
import { createRng } from "../src/engine/prng";
import type { CardRarity } from "../src/progression/progression.types";

const RARITY_BY_CARD_ID: Readonly<Record<string, CardRarity>> = {
  common_a: "common",
  common_b: "common",
  rare_a: "rare",
  rare_b: "rare",
  legendary_a: "legendary",
} as const;

function rarityCounts(cardIds: readonly string[]): Record<CardRarity, number> {
  return cardIds.reduce(
    (counts, cardId) => {
      const rarity = RARITY_BY_CARD_ID[cardId];
      if (rarity !== undefined) {
        counts[rarity] += 1;
      }
      return counts;
    },
    { common: 0, rare: 0, legendary: 0 },
  );
}

function expectedNeutralRarityRates(
  offers: readonly (readonly string[])[],
): Record<CardRarity, number> {
  const rates = { common: 0, rare: 0, legendary: 0 };
  for (const offer of offers) {
    const counts = rarityCounts(offer);
    rates.common += counts.common / offer.length;
    rates.rare += counts.rare / offer.length;
    rates.legendary += counts.legendary / offer.length;
  }
  return {
    common: rates.common / offers.length,
    rare: rates.rare / offers.length,
    legendary: rates.legendary / offers.length,
  };
}

test("Given no pick mode, when harness options are parsed, then neutral is the default", () => {
  const options = parseHarnessOptions([]);

  assert.equal(options.pickMode, "neutral");
});

test("Given pick modes, when harness options are parsed, then neutral, first, and random are accepted", () => {
  assert.equal(parseHarnessOptions(["--pick=neutral"]).pickMode, "neutral");
  assert.equal(parseHarnessOptions(["--pick=first"]).pickMode, "first");
  assert.equal(parseHarnessOptions(["--pick=random"]).pickMode, "random");
});

test("Given an invalid pick mode, when harness options are parsed, then usage exits with code two", () => {
  assert.throws(
    () => parseHarnessOptions(["--pick=legendary"]),
    (error: unknown) =>
      error instanceof Error &&
      "exitCode" in error &&
      error.exitCode === 2 &&
      error.message.includes("--pick=neutral|first|random"),
  );
});

test("Given a variable-length draft offer, when neutral picks by roll, then it selects only available slots", () => {
  assert.equal(
    chooseDraftCardId(["common_a", "rare_a", "legendary_a"], "neutral", 0),
    "common_a",
  );
  assert.equal(
    chooseDraftCardId(
      ["common_a", "rare_a", "legendary_a"],
      "neutral",
      0.5,
    ),
    "rare_a",
  );
  assert.equal(
    chooseDraftCardId(["common_a", "rare_a"], "neutral", 0.99),
    "rare_a",
  );
  assert.equal(
    chooseDraftCardId(["legendary_a"], "neutral", 0.99),
    "legendary_a",
  );
});

test("Given legacy pick modes, when a draft offer is picked, then first remains biased and random remains compatible", () => {
  const offer = ["legendary_a", "common_a", "rare_a"] as const;

  assert.equal(chooseDraftCardId(offer, "first", 0.99), "legendary_a");
  assert.equal(chooseDraftCardId(offer, "random", 0.99), "rare_a");
});

test("Given a large deterministic sample, when neutral picks variable-length offers, then picked rarity approximates offered slot chances", () => {
  const offers = [
    ["common_a", "rare_a", "legendary_a"],
    ["common_a", "common_b"],
    ["rare_a", "legendary_a"],
    ["legendary_a"],
  ] as const;
  const expected = expectedNeutralRarityRates(offers);
  const rng = createRng(0x51a7c0de);
  const picks: string[] = [];
  const iterations = 40_000;

  for (let index = 0; index < iterations; index += 1) {
    const offer = offers[index % offers.length] ?? offers[0];
    const pick = chooseDraftCardId(offer, "neutral", rng.next());
    if (pick !== undefined) {
      picks.push(pick);
    }
  }

  const picked = rarityCounts(picks);
  const tolerance = 0.015;

  assert.ok(
    Math.abs(picked.common / picks.length - expected.common) < tolerance,
  );
  assert.ok(Math.abs(picked.rare / picks.length - expected.rare) < tolerance);
  assert.ok(
    Math.abs(picked.legendary / picks.length - expected.legendary) < tolerance,
  );
});
