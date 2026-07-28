import assert from "node:assert/strict";
import test from "node:test";
import { BALANCE_CONFIG } from "../src/content/balanceConfig";
import { EMPTY_STARTING_MODIFIER_BUNDLE } from "../src/content/runConfiguration";
import { advanceTick, createInitialState } from "../src/engine/tick";
import {
  gameReducer,
  gameStoreRunIdentity,
  gameTickIntervalMsForSpeed,
} from "../src/state/gameStore";
import type { CommitStateAction } from "../src/state/gameStore.types";

test("Given one committed state action, when the reducer is called twice, then both results match without mutating shared inputs", () => {
  const initial = createInitialState(BALANCE_CONFIG.DEFAULT_SEED).state;
  const next = { ...initial, tick: initial.tick + 1 };
  const action: CommitStateAction = { type: "commitState", next };
  const initialBefore = structuredClone(initial);
  const actionBefore = structuredClone(action);

  const first = gameReducer(initial, action);
  const second = gameReducer(initial, action);

  assert.deepEqual(first, second);
  assert.deepEqual(first, next);
  assert.deepEqual(initial, initialBefore);
  assert.deepEqual(action, actionBefore);
});

test("Given the same seed houses and starting bundle, when a run identity is built, then equivalent bundle values produce the same key", () => {
  const first = gameStoreRunIdentity({
    seed: 99,
    houseIds: ["house_a", "house_b", "house_c"],
    startingModifiers: {
      globalEffects: [{ maxHpBonus: 10 }],
      globalSharedEffects: [],
      houseEffects: [
        {
          houseId: "house_a",
          effects: [{ attackDamageMultiplier: 1.04 }],
        },
      ],
    },
  });
  const second = gameStoreRunIdentity({
    seed: 99,
    houseIds: ["house_a", "house_b", "house_c"],
    startingModifiers: {
      globalEffects: [{ maxHpBonus: 10 }],
      globalSharedEffects: [],
      houseEffects: [
        {
          houseId: "house_a",
          effects: [{ attackDamageMultiplier: 1.04 }],
        },
      ],
    },
  });
  const empty = gameStoreRunIdentity({
    seed: 99,
    houseIds: ["house_a", "house_b", "house_c"],
    startingModifiers: EMPTY_STARTING_MODIFIER_BUNDLE,
  });

  assert.equal(first, second);
  assert.notEqual(first, empty);
});

test("Given simulation speed settings, when dispatch intervals change, then identical tick counts remain deterministic", () => {
  const halfSpeedInterval = gameTickIntervalMsForSpeed(0.5);
  const normalInterval = gameTickIntervalMsForSpeed(1);
  const doubleSpeedInterval = gameTickIntervalMsForSpeed(2);

  assert.equal(halfSpeedInterval, normalInterval * 2);
  assert.equal(doubleSpeedInterval, normalInterval / 2);

  const halfSpeedWorld = createInitialState(4_204);
  const doubleSpeedWorld = createInitialState(4_204);
  let halfSpeedState = halfSpeedWorld.state;
  let doubleSpeedState = doubleSpeedWorld.state;
  for (let tick = 0; tick < 120; tick += 1) {
    halfSpeedState = advanceTick(halfSpeedState, halfSpeedWorld.rng);
    doubleSpeedState = advanceTick(doubleSpeedState, doubleSpeedWorld.rng);
  }

  assert.deepEqual(halfSpeedState, doubleSpeedState);
  assert.equal(halfSpeedWorld.rng.next(), doubleSpeedWorld.rng.next());
});

test("Given a new game state, when settings boundaries are inspected, then settings never enter simulation state", () => {
  const state = createInitialState(BALANCE_CONFIG.DEFAULT_SEED).state;
  for (const key of ["language", "simulationSpeed", "screenShake", "masterVolume"]) {
    assert.equal(key in state, false);
  }
});
