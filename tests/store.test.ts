import assert from "node:assert/strict";
import test from "node:test";
import { BALANCE_CONFIG } from "../src/content/balanceConfig";
import { createInitialState } from "../src/engine/tick";
import { gameReducer } from "../src/state/gameStore";
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
