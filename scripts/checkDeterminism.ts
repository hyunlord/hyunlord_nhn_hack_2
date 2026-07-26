import assert from "node:assert/strict";
import { BALANCE_CONFIG } from "../src/content/balanceConfig";
import { advanceTick, createInitialState } from "../src/engine/tick";

const first = createInitialState(BALANCE_CONFIG.DEFAULT_SEED);
const second = createInitialState(BALANCE_CONFIG.DEFAULT_SEED);

let firstState = first.state;
let secondState = second.state;

const verificationTicks = 1_400;

for (let tick = 0; tick < verificationTicks; tick += 1) {
  firstState = advanceTick(firstState, first.rng);
  secondState = advanceTick(secondState, second.rng);
}

assert.deepEqual(firstState, secondState);
assert.equal(firstState.phase, "observation");
assert.notEqual(firstState.activeThreat, null);
assert.ok(
  firstState.agents.every(
    ({ x, y }) =>
      x >= BALANCE_CONFIG.AGENT_RADIUS &&
      x <= BALANCE_CONFIG.WORLD_WIDTH - BALANCE_CONFIG.AGENT_RADIUS &&
      y >= BALANCE_CONFIG.AGENT_RADIUS &&
      y <= BALANCE_CONFIG.WORLD_HEIGHT - BALANCE_CONFIG.AGENT_RADIUS,
  ),
  `Every agent must remain inside the world after ${verificationTicks} ticks.`,
);

console.log(
  `Determinism check passed: seed ${BALANCE_CONFIG.DEFAULT_SEED}, ` +
    `${firstState.agents.length} agents, ${firstState.tick} ticks.`,
);
