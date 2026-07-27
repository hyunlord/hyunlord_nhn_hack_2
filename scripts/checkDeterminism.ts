import assert from "node:assert/strict";
import { BALANCE_CONFIG } from "../src/content/balanceConfig";
import { WAVE_DEFINITIONS } from "../src/content/waveConfig";
import type { GameState } from "../src/engine/engine.types";
import {
  advanceTick,
  beginNextWave,
  createInitialState,
} from "../src/engine/tick";
import { chooseDraftCard } from "../src/engine/progressionEngine";
import {
  purchaseShopItem,
  purchaseTowerAt,
} from "../src/engine/shopEngine";
import { castFirstAvailableSkill } from "./autoSkillStrategy";

const WAVE_EXERCISE_TICKS = 500;
const MAX_ORGANIC_TICKS = 20_000;

function chooseFirst(state: GameState): GameState {
  const offer = state.pendingDrafts[0];
  const cardId = offer?.cardIds[0];
  if (offer === undefined || cardId === undefined) {
    throw new RangeError("Expected a populated draft offer.");
  }
  return chooseDraftCard(state, offer.id, cardId);
}

function autoShop(state: GameState): GameState {
  let next = purchaseShopItem(state, "recruit_squad");
  next = purchaseShopItem(next, "field_medicine");
  let towerPlaced = next;
  for (
    let y = 40;
    y < BALANCE_CONFIG.WORLD_HEIGHT && towerPlaced === next;
    y += 40
  ) {
    for (let x = 40; x < BALANCE_CONFIG.WORLD_WIDTH; x += 40) {
      const candidate = purchaseTowerAt(next, x, y);
      if (candidate !== next) {
        towerPlaced = candidate;
        break;
      }
    }
  }
  return purchaseShopItem(towerPlaced, "reinforce_hall");
}

function runOrganicRun(seed: number): GameState {
  const world = createInitialState(seed);
  let state = world.state;
  while (
    state.phase !== "victory" &&
    state.phase !== "defeat" &&
    state.tick < MAX_ORGANIC_TICKS
  ) {
    if (state.phase === "draft") {
      state = chooseFirst(state);
    } else {
      state =
        state.phase === "intermission"
          ? beginNextWave(autoShop(state), world.rng)
          : advanceTick(
              castFirstAvailableSkill(state).state,
              world.rng,
            );
    }
  }
  return state;
}

function runFullStateMachine(seed: number): GameState {
  const world = createInitialState(seed);
  let state = world.state;
  while (state.phase === "preparation") {
    state = advanceTick(state, world.rng);
  }

  for (const definition of WAVE_DEFINITIONS) {
    assert.equal(state.phase, "wave");
    assert.equal(state.waveIndex, definition.index);
    for (
      let tick = 0;
      tick < WAVE_EXERCISE_TICKS &&
      (state.phase === "wave" || state.phase === "draft");
      tick += 1
    ) {
      state =
        state.phase === "draft"
          ? chooseFirst(state)
          : advanceTick(
              castFirstAvailableSkill(state).state,
              world.rng,
            );
      assert.notEqual(state.phase, "defeat");
    }

    if (state.phase === "wave") {
      if (state.activeThreat === null) {
        throw new RangeError("Expected an active threat during a wave.");
      }
      state = advanceTick(
        {
          ...state,
          activeThreat: {
            ...state.activeThreat,
            creatures: [],
            mage: null,
          },
        },
        world.rng,
      );
    }
    if (definition.index < WAVE_DEFINITIONS.length - 1) {
      assert.equal(state.phase, "intermission");
      state = beginNextWave(autoShop(state), world.rng);
    }
  }
  return state;
}

const firstOrganic = runOrganicRun(BALANCE_CONFIG.DEFAULT_SEED);
const secondOrganic = runOrganicRun(BALANCE_CONFIG.DEFAULT_SEED);
assert.deepEqual(firstOrganic, secondOrganic);
assert.ok(
  firstOrganic.phase === "victory" || firstOrganic.phase === "defeat",
);
assert.ok(firstOrganic.tick < MAX_ORGANIC_TICKS);

const firstState = runFullStateMachine(
  BALANCE_CONFIG.DEFAULT_SEED,
);
const secondState = runFullStateMachine(
  BALANCE_CONFIG.DEFAULT_SEED,
);

assert.deepEqual(firstState, secondState);
assert.equal(firstState.phase, "victory");
assert.equal(firstState.waveIndex, WAVE_DEFINITIONS.length - 1);
assert.equal(firstState.activeThreat, null);
assert.ok(
  firstState.agents.every(
    ({ x, y }) =>
      x >= BALANCE_CONFIG.AGENT_RADIUS &&
      x <= BALANCE_CONFIG.WORLD_WIDTH - BALANCE_CONFIG.AGENT_RADIUS &&
      y >= BALANCE_CONFIG.AGENT_RADIUS &&
      y <= BALANCE_CONFIG.WORLD_HEIGHT - BALANCE_CONFIG.AGENT_RADIUS,
  ),
  "Every agent must remain inside the world after the full run.",
);

console.log(
  `Organic determinism passed: seed ${BALANCE_CONFIG.DEFAULT_SEED}, ` +
    `phase ${firstOrganic.phase}, tick ${firstOrganic.tick}, ` +
    `tribute ${firstOrganic.tribute}, ` +
    `halls ${firstOrganic.halls.map(({ hp }) => hp).join("/")}.`,
);
console.log(
  `Full-state-machine determinism passed: seed ${BALANCE_CONFIG.DEFAULT_SEED}, ` +
    `${WAVE_DEFINITIONS.length} waves, phase ${firstState.phase}, ` +
    `tick ${firstState.tick}, tribute ${firstState.tribute}, ` +
    `halls ${firstState.halls.map(({ hp }) => hp).join("/")}.`,
);
