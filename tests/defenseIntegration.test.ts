import assert from "node:assert/strict";
import test from "node:test";
import { BALANCE_CONFIG } from "../src/content/balanceConfig";
import { advanceWaveCombat } from "../src/engine/invasionCombat";
import { createInitialState } from "../src/engine/tick";

test("Given an agent whose hall is destroyed, when a foreign hall is attacked, then combat wiring sends it to help", () => {
  const world = createInitialState(BALANCE_CONFIG.DEFAULT_SEED);
  const source = world.state.agents.find(
    ({ houseId }) => houseId === "house_a",
  );
  if (source === undefined) {
    throw new RangeError("Expected a house A agent fixture.");
  }
  const agent = {
    ...source,
    x: 100,
    y: 100,
    heading: 0,
    disposition: { aggression: 80, loyalty: 80 },
  };
  const result = advanceWaveCombat(
    {
      ...world.state,
      phase: "wave",
      agents: [agent],
      halls: world.state.halls.map((hall) => ({
        ...hall,
        x: hall.houseId === "house_b" ? 700 : hall.x,
        y: 100,
        hp:
          hall.houseId === "house_b"
            ? BALANCE_CONFIG.HALL_HP
            : 0,
      })),
      activeThreat: {
        type: "monster_horde",
        waveIndex: 0,
        startTick: 0,
        traitorHouseId: null,
        mage: null,
        creatures: [
          {
            id: "w0_creature_00",
            x: 710,
            y: 100,
            hp: BALANCE_CONFIG.CREATURE_HP,
            agentDamage: BALANCE_CONFIG.CREATURE_ATTACK_DAMAGE,
            hallDamage: BALANCE_CONFIG.CREATURE_HALL_DAMAGE,
            lastAttackTick: -1,
          },
        ],
      },
    },
    1,
    world.rng,
  );
  const defender = result.agents[0];

  assert.ok((defender?.x ?? 0) > agent.x);
  assert.equal(defender?.state, "helping");
});
