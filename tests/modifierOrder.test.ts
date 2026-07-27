import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_HOUSE_IDS } from "../src/content/houseConfig";
import { deriveStartingModifierBundle } from "../src/content/runConfiguration";
import { UNIT_CLASSES } from "../src/content/unitClassConfig";
import { modifiersForHouse } from "../src/engine/progressionEngine";
import { createInitialState } from "../src/engine/tick";

test("Given class, house, investment, and card modifiers, when melee damage resolves, then the constructed value follows the full modifier chain", () => {
  const bundle = deriveStartingModifierBundle({
    global_edge: 1,
    house_a_ashvale_fury: 1,
  });
  const initial = createInitialState(4103, DEFAULT_HOUSE_IDS, bundle).state;
  const state = {
    ...initial,
    houseProgress: initial.houseProgress.map((progress) =>
      progress.houseId === "house_a"
        ? {
            ...progress,
            cards: [
              { cardId: "common_sharpened_edge", stacks: 1 },
              { cardId: "class_shieldbreaker", stacks: 1 },
            ],
          }
        : progress,
    ),
  };

  const modifiers = modifiersForHouse(state, "house_a", "melee");
  const damage =
    UNIT_CLASSES.melee.attackDamage * modifiers.attackDamageMultiplier;
  const expected = 20 * 1.1 * 1.03 * 1.04 * 1.12 * 1.12;

  assert.ok(Math.abs(damage - expected) < 1e-12);
});
