import assert from "node:assert/strict";
import test from "node:test";
import { castFirstAvailableSkill } from "../scripts/autoSkillStrategy";
import { BALANCE_CONFIG } from "../src/content/balanceConfig";
import { createInitialState } from "../src/engine/tick";
import type { ThreatEvent } from "../src/threat/threatTypes";

function clusteredThreat(): ThreatEvent {
  return {
    type: "monster_horde",
    waveIndex: 0,
    startTick: 0,
    traitorHouseId: null,
    mage: null,
    creatures: [
      {
        id: "creature_a",
        x: 100,
        y: 100,
        hp: 100,
        agentDamage: 6,
        hallDamage: 5,
        lastAttackTick: 0,
        haltedUntilTick: -1,
      },
      {
        id: "creature_b",
        x: 110,
        y: 100,
        hp: 100,
        agentDamage: 6,
        hallDamage: 5,
        lastAttackTick: 0,
        haltedUntilTick: -1,
      },
      {
        id: "creature_c",
        x: 700,
        y: 500,
        hp: 100,
        agentDamage: 6,
        hallDamage: 5,
        lastAttackTick: 0,
        haltedUntilTick: -1,
      },
    ],
  };
}

test("Given an unlocked skill and clustered enemies, when auto-cast runs twice, then it targets the same largest cluster without mutating input", () => {
  const base = createInitialState(BALANCE_CONFIG.DEFAULT_SEED).state;
  const state = {
    ...base,
    phase: "wave" as const,
    activeThreat: clusteredThreat(),
    unlockedSkills: ["chains_of_dusk" as const],
    divinePower: 100,
  };
  const snapshot = structuredClone(state);

  const first = castFirstAvailableSkill(state);
  const second = castFirstAvailableSkill(state);

  assert.deepEqual(first, second);
  assert.deepEqual(state, snapshot);
  assert.equal(first.castSkillId, "chains_of_dusk");
  assert.equal(first.state.activeEffects.at(-1)?.x, 100);
  assert.deepEqual(
    first.state.activeThreat?.creatures.map(({ hp }) => hp),
    [80, 80, 100],
  );
});
