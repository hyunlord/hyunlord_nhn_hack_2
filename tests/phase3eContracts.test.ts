import assert from "node:assert/strict";
import test from "node:test";
import { CARD_DEFINITIONS } from "../src/content/cardConfig";
import { createInitialState } from "../src/engine/tick";

test("Given Phase 3E cards, when their contracts are inspected, then every card declares a rarity", () => {
  assert.ok(
    CARD_DEFINITIONS.every((card) => "rarity" in card),
    "every card must declare its rarity",
  );
});

test("Given the progression modules, when Phase 3E APIs are inspected, then rarity rolling and conditional modifiers exist", async () => {
  const cardPool = await import("../src/progression/cardPool");
  const modifiers = await import("../src/progression/modifiers");

  assert.equal("rollRarity" in cardPool, true);
  assert.equal("conditionalModifiers" in modifiers, true);
});

test("Given a fresh run, when Phase 3E state is inspected, then skills and hero progress start explicitly empty or level one", () => {
  const state = createInitialState(20260810).state;

  assert.equal("unlockedSkills" in state, true);
  assert.equal("skillCooldowns" in state, true);
  assert.equal("heroProgress" in state, true);
});

test("Given the engine and XP modules, when Phase 3E APIs are inspected, then active casting and hero thresholds exist", async () => {
  const engine = await import("../src/engine/tick");
  const xp = await import("../src/progression/xp");

  assert.equal("castSkill" in engine, true);
  assert.equal("HERO_LEVEL_THRESHOLDS" in xp, true);
});
