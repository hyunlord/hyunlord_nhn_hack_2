import assert from "node:assert/strict";
import test from "node:test";
import type { Agent } from "../src/agents/agentTypes";
import {
  applyAgentAttacks,
  type AgentDecision,
} from "../src/engine/agentCombat";
import { advanceWaveCombat } from "../src/engine/invasionCombat";
import { createRng } from "../src/engine/prng";
import { createInitialState } from "../src/engine/tick";
import type { ThreatEvent } from "../src/threat/threatTypes";

function fightingAgent(
  agent: Agent,
  id: string,
  houseId: Agent["houseId"],
): AgentDecision {
  return {
    agent: {
      ...agent,
      id,
      houseId,
      x: 100,
      y: 100,
      state: "fighting",
      lastAttackTick: -1,
    },
    intent: {
      kind: "engage",
      towardX: 100,
      towardY: 100,
      targetId: "creature",
      preferredRange: 13,
    },
  };
}

test("Given two ordered attackers finish one creature, when attacks resolve, then actual damage and the killing blow go to the exact houses", () => {
  const state = createInitialState(1).state;
  const agent = state.agents[0];
  if (agent === undefined) {
    throw new RangeError("Expected an agent fixture.");
  }
  const threat: ThreatEvent = {
    type: "monster_horde",
    waveIndex: 0,
    startTick: 0,
    traitorHouseId: null,
    mage: null,
    creatures: [{
      id: "creature",
      x: 100,
      y: 100,
      hp: 30,
      agentDamage: 1,
      hallDamage: 1,
      lastAttackTick: -1,
      haltedUntilTick: -1,
    }],
  };
  const modifiers = new Map(
    state.houseModifiers.map(({ houseId, modifiers: value }) => [
      houseId,
      value,
    ]),
  );

  const result = applyAgentAttacks(
    [
      fightingAgent(agent, "first", "house_a"),
      fightingAgent(agent, "second", "house_b"),
    ],
    threat,
    10,
    modifiers,
  );

  assert.deepEqual(result.xpAwards, [
    { houseId: "house_a", amount: 22 },
    { houseId: "house_b", amount: 33 },
  ]);
  assert.deepEqual(result.creatureKillsByHouse, [
    { houseId: "house_b", amount: 1 },
  ]);
  assert.deepEqual(result.threat.creatures, []);
});

test("Given an archer attacks beyond twenty-five units, when the hit resolves, then a four-tick house-scoped line effect is emitted", () => {
  const state = createInitialState(2).state;
  const fixture = state.agents.find(({ unitClass }) => unitClass === "archer");
  if (fixture === undefined) {
    throw new RangeError("Expected an archer fixture.");
  }
  const archer = {
    ...fixture,
    x: 100,
    y: 100,
    state: "fighting" as const,
    lastAttackTick: -1,
  };
  const threat: ThreatEvent = {
    type: "monster_horde",
    waveIndex: 0,
    startTick: 0,
    traitorHouseId: null,
    mage: null,
    creatures: [{
      id: "creature",
      x: 150,
      y: 100,
      hp: 60,
      agentDamage: 1,
      hallDamage: 1,
      lastAttackTick: -1,
      haltedUntilTick: -1,
    }],
  };
  const modifiers = state.houseModifiers.find(
    ({ houseId }) => houseId === archer.houseId,
  )?.modifiers;
  if (modifiers === undefined) {
    throw new RangeError("Expected archer modifiers.");
  }

  const result = applyAgentAttacks(
    [{
      agent: archer,
      intent: {
        kind: "engage",
        towardX: 150,
        towardY: 100,
        targetId: "creature",
        preferredRange: 58,
      },
    }],
    threat,
    14,
    new Map([[archer.id, modifiers]]),
  );

  assert.deepEqual(result.rangedAttackEffects, [{
    attackerId: archer.id,
    houseId: archer.houseId,
    fromX: 100,
    fromY: 100,
    toX: 150,
    toY: 100,
    startTick: 14,
    durationTicks: 4,
  }]);
});

test("Given a spear owns Braced Line and Ironblood, when it is hit below the class-aware threshold, then class HP enables mitigation", () => {
  const base = createInitialState(3).state;
  const fixture = base.agents.find(
    ({ houseId, unitClass, isHero }) =>
      houseId === "house_b" && unitClass === "spear" && !isHero,
  );
  if (fixture === undefined) {
    throw new RangeError("Expected a Thornhold spear fixture.");
  }
  const spear = {
    ...fixture,
    x: 100,
    y: 100,
    hp: 75,
    disposition: { aggression: 80, loyalty: 80 },
  };
  const result = advanceWaveCombat(
    {
      ...base,
      phase: "wave",
      agents: [spear],
      houseProgress: base.houseProgress.map((progress) =>
        progress.houseId === spear.houseId
          ? {
              ...progress,
              cards: [
                { cardId: "class_braced_line", stacks: 1 },
                { cardId: "legend_ironblood", stacks: 1 },
              ],
            }
          : progress,
      ),
      activeThreat: {
        type: "monster_horde",
        waveIndex: 0,
        startTick: 0,
        traitorHouseId: null,
        mage: null,
        creatures: [{
          id: "creature",
          x: 100,
          y: 100,
          hp: 10_000,
          agentDamage: 10,
          hallDamage: 1,
          lastAttackTick: -1,
          haltedUntilTick: -1,
        }],
      },
    },
    10,
    createRng(3),
  );

  assert.equal(result.agents[0]?.hp, 68.5);
});
