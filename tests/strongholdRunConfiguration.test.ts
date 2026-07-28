import assert from "node:assert/strict";
import test from "node:test";
import { STRONGHOLD_CENTER } from "../src/content/houseConfig";
import { createInitialState } from "../src/engine/tick";

test("Given no explicit selection, when a run is created, then every structure is within two hundred pixels of the stronghold center", () => {
  const state = createInitialState(4_110).state;

  assert.deepEqual(STRONGHOLD_CENTER, { x: 480, y: 300 });
  const defenses = [state.keep, ...state.banners];
  assert.ok(
    defenses.every(
      (defense) =>
        Math.hypot(
          defense.x - STRONGHOLD_CENTER.x,
          defense.y - STRONGHOLD_CENTER.y,
        ) <= 200,
    ),
  );
});
