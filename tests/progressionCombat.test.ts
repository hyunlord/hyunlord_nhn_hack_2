import assert from "node:assert/strict";
import test from "node:test";
import type { Agent } from "../src/agents/agentTypes";
import {
  applyAgentAttacks,
  type AgentDecision,
} from "../src/engine/agentCombat";
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
    { houseId: "house_a", amount: 20 },
    { houseId: "house_b", amount: 35 },
  ]);
  assert.deepEqual(result.creatureKillsByHouse, [
    { houseId: "house_b", amount: 1 },
  ]);
  assert.deepEqual(result.threat.creatures, []);
});
