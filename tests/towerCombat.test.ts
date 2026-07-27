import assert from "node:assert/strict";
import test from "node:test";
import { createTower, TOWER_CONFIG } from "../src/build/structures";
import { applyTowerDamages } from "../src/engine/combatDamage";
import { applyTowerAttacks } from "../src/engine/towerCombat";
import type { ThreatEvent } from "../src/threat/threatTypes";

function threat(): ThreatEvent {
  return {
    type: "monster_horde",
    waveIndex: 0,
    startTick: 0,
    traitorHouseId: null,
    mage: null,
    creatures: [
      {
        id: "creature_b",
        x: 110,
        y: 100,
        hp: 60,
        agentDamage: 6,
        hallDamage: 5,
        lastAttackTick: -1,
      },
      {
        id: "creature_a",
        x: 90,
        y: 100,
        hp: 60,
        agentDamage: 6,
        hallDamage: 5,
        lastAttackTick: -1,
      },
    ],
  };
}

test("Given equidistant hostiles, when a tower cadence is ready, then it targets ascending id and waits for the next interval", () => {
  const tower = createTower("tower_01", 100, 100);
  const first = applyTowerAttacks(
    [tower],
    threat(),
    TOWER_CONFIG.TOWER_ATTACK_INTERVAL_TICKS,
  );
  const tooSoon = applyTowerAttacks(
    first.towers,
    first.threat,
    TOWER_CONFIG.TOWER_ATTACK_INTERVAL_TICKS * 2 - 1,
  );

  assert.equal(first.threat.creatures[0]?.hp, 60);
  assert.equal(
    first.threat.creatures.find(({ id }) => id === "creature_a")?.hp,
    60 - TOWER_CONFIG.TOWER_DAMAGE,
  );
  assert.deepEqual(tooSoon.threat, first.threat);
  assert.equal(
    tooSoon.towers[0]?.lastAttackTick,
    TOWER_CONFIG.TOWER_ATTACK_INTERVAL_TICKS,
  );
});

test("Given accumulated creature damage reaches tower HP, when structure damage resolves, then the tower can be destroyed", () => {
  const tower = createTower("tower_01", 100, 100);
  const result = applyTowerDamages(
    [tower],
    [
      { structureId: tower.id, amount: 120 },
      { structureId: tower.id, amount: 180 },
    ],
  );

  assert.equal(result[0]?.hp, 0);
  assert.equal(tower.hp, TOWER_CONFIG.TOWER_HP);
});
