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

test("Given lethal damage across unordered tower ids, when structure damage resolves, then living order is retained and destruction records are id-sorted", () => {
  const towerB = createTower("tower_b", 100, 100);
  const towerC = createTower("tower_c", 200, 100);
  const towerD = createTower("tower_d", 250, 100);
  const towerA = createTower("tower_a", 300, 100);
  const result = applyTowerDamages(
    [towerB, towerC, towerD, towerA],
    [
      { structureId: towerB.id, amount: 120 },
      { structureId: towerB.id, amount: 180 },
      { structureId: towerA.id, amount: TOWER_CONFIG.TOWER_HP },
    ],
    37,
  );

  assert.deepEqual(result.towers.map(({ id }) => id), [
    "tower_c",
    "tower_d",
  ]);
  assert.deepEqual(result.destroyed, [
    { id: "tower_a", x: 300, y: 100, tick: 37 },
    { id: "tower_b", x: 100, y: 100, tick: 37 },
  ]);
  assert.equal(towerB.hp, TOWER_CONFIG.TOWER_HP);
});

test("Given the same towers, damages, and tick, when structure damage resolves twice, then the partition is deterministic", () => {
  const towers = [
    createTower("tower_02", 100, 100),
    createTower("tower_01", 200, 100),
  ];
  const damages = [
    { structureId: "tower_01", amount: TOWER_CONFIG.TOWER_HP },
    { structureId: "tower_02", amount: 10 },
  ];

  const first = applyTowerDamages(towers, damages, 42);
  const second = applyTowerDamages(towers, damages, 42);

  assert.deepEqual(first, second);
});
