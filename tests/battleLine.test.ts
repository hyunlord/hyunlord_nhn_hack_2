import assert from "node:assert/strict";
import test from "node:test";
import type { Agent, ThreatPresence } from "../src/agents/agentTypes";
import {
  LATERAL_SPREAD,
  createBattleLineMovementPlans,
  resolveBattleLineTarget,
} from "../src/agents/battleLine";
import { BALANCE_CONFIG } from "../src/content/balanceConfig";
import type { HouseSelection } from "../src/content/houseConfig";
import { STRONGHOLD_CENTER } from "../src/content/houseConfig";
import { UNIT_CLASSES, type UnitClassId } from "../src/content/unitClassConfig";
import type { Banner, Keep } from "../src/engine/engine.types";

const SELECTED: HouseSelection = ["house_e", "house_d", "house_f"];
const KEEP: Keep = {
  x: STRONGHOLD_CENTER.x,
  y: STRONGHOLD_CENTER.y,
  hp: BALANCE_CONFIG.KEEP_HP,
  maxHp: BALANCE_CONFIG.KEEP_HP,
};
const BANNERS: readonly Banner[] = [
  { houseId: "house_e", x: 428, y: 300, hp: BALANCE_CONFIG.BANNER_HP, maxHp: BALANCE_CONFIG.BANNER_HP },
  { houseId: "house_d", x: 480, y: 248, hp: BALANCE_CONFIG.BANNER_HP, maxHp: BALANCE_CONFIG.BANNER_HP },
  { houseId: "house_f", x: 532, y: 300, hp: BALANCE_CONFIG.BANNER_HP, maxHp: BALANCE_CONFIG.BANNER_HP },
];

function agent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: "house_e_spear_00",
    houseId: "house_e",
    unitClass: "spear",
    disposition: { aggression: 80, loyalty: 80 },
    x: KEEP.x,
    y: KEEP.y,
    heading: 0,
    state: "idle",
    hp: UNIT_CLASSES.spear.maxHp,
    lastDamagedTick: -1,
    lastAttackTick: -1,
    isHero: false,
    heroId: null,
    heroLevel: 1,
    heroLevelUpTick: -1,
    respawnAtTick: null,
    breakImmuneUntilTick: -1,
    ...overrides,
  };
}

function hostile(id: string, x: number, y: number): ThreatPresence {
  return { id, x, y, hostile: true };
}

function targetFor(
  subject: Agent,
  threats: readonly ThreatPresence[],
  tick = 100,
  banners: readonly Banner[] = BANNERS,
) {
  return resolveBattleLineTarget({
    agent: subject,
    keep: KEEP,
    banners,
    threats,
    selectedHouseIds: SELECTED,
    tick,
  });
}

function radius(point: { readonly x: number; readonly y: number }): number {
  return Math.hypot(point.x - KEEP.x, point.y - KEEP.y);
}

function approx(actual: number, expected: number, tolerance = 0.000_001): void {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

test("Given unit classes, when battle-line ranks are read, then shipped exact ranks are used", () => {
  const ranks: Record<UnitClassId, number> = {
    spear: UNIT_CLASSES.spear.lineRank,
    melee: UNIT_CLASSES.melee.lineRank,
    skirmisher: UNIT_CLASSES.skirmisher.lineRank,
    archer: UNIT_CLASSES.archer.lineRank,
  };

  assert.deepEqual(ranks, {
    spear: 96,
    melee: 78,
    skirmisher: 78,
    archer: 52,
  });
});

test("Given nearby hostiles, when threat direction resolves, then it uses the nearby centroid before distant enemies", () => {
  const subject = agent({ houseId: "house_d", unitClass: "archer", id: "house_d_archer_00" });
  const target = targetFor(subject, [
    hostile("near_north", KEEP.x, KEEP.y - 100),
    hostile("near_east", KEEP.x + 100, KEEP.y),
    hostile("distant_west", KEEP.x - BALANCE_CONFIG.KEEP_DEFENSE_RADIUS * 2, KEEP.y),
  ]);

  assert.equal(target.threatSource.kind, "nearby-centroid");
  approx(target.direction.x, Math.SQRT1_2);
  approx(target.direction.y, -Math.SQRT1_2);
  assert.equal(target.targetId, null);
});

test("Given no nearby hostiles, when threat direction resolves, then stable nearest distance and id order select the fallback", () => {
  const first = targetFor(agent(), [
    hostile("z_near", KEEP.x + 500, KEEP.y),
    hostile("a_near", KEEP.x, KEEP.y + 500),
  ]);
  const second = targetFor(agent(), [
    hostile("a_near", KEEP.x, KEEP.y + 500),
    hostile("z_near", KEEP.x + 500, KEEP.y),
  ]);

  assert.equal(first.threatSource.kind, "nearest-fallback");
  assert.equal(first.targetId, "a_near");
  assert.deepEqual(second, first);
});

test("Given no hostiles, when a defender musters, then it uses its deterministic current radial direction", () => {
  const subject = agent({ x: KEEP.x, y: KEEP.y + 20, heading: Math.PI / 3 });
  const target = targetFor(subject, []);

  assert.equal(target.threatSource.kind, "muster");
  approx(target.direction.x, 0);
  approx(target.direction.y, 1);
  approx(
    radius(target.target),
    Math.hypot(
      UNIT_CLASSES.spear.lineRank,
      target.lateralDisplacement + target.idleJitterDisplacement,
    ),
    0.01,
  );
});


test("Given an intact active-threat line, when the target resolves, then configured idle jitter is suppressed", () => {
  const target = targetFor(agent({ id: "house_e_spear_00" }), [
    hostile("east", KEEP.x + 170, KEEP.y),
  ]);

  assert.notEqual(target.threatSource.kind, "muster");
  assert.equal(target.idleJitterDisplacement, 0);
  assert.equal(target.fractureScatterDisplacement, 0);
  assert.deepEqual(target.scatter, { kind: "none", displacement: 0, magnitude: 0 });
});

test("Given no active threat, when an intact line musters, then configured idle jitter is applied", () => {
  const target = targetFor(agent({ id: "house_e_spear_00" }), []);

  assert.equal(target.threatSource.kind, "muster");
  assert.equal(target.scatter.kind, "idle-jitter");
  assert.notEqual(target.idleJitterDisplacement, 0);
  assert.equal(target.fractureScatterDisplacement, 0);
  approx(target.scatter.magnitude, 0.03);
});

test("Given selected houses, when adjacent battle sections resolve, then angular pick order maps to exact tangent spread", () => {
  const threats = [hostile("north", KEEP.x, KEEP.y - 200)];
  const left = targetFor(agent({ houseId: "house_e", id: "house_e_spear_00" }), threats);
  const middle = targetFor(agent({ houseId: "house_d", id: "house_d_skirmisher_00", unitClass: "skirmisher" }), threats);
  const right = targetFor(agent({ houseId: "house_f", id: "house_f_archer_00", unitClass: "archer" }), threats);

  approx(left.lateralDisplacement, -LATERAL_SPREAD);
  approx(middle.lateralDisplacement, 0);
  approx(right.lateralDisplacement, LATERAL_SPREAD);
  assert.ok(Math.abs(left.target.x - middle.target.x) < LATERAL_SPREAD * 1.5);
  assert.ok(Math.abs(right.target.x - middle.target.x) < LATERAL_SPREAD * 1.5);
});

test("Given hold and charge houses, when targets resolve, then hold stays at rank and charge advances to 1.2 rank", () => {
  const threats = [hostile("east", KEEP.x + 180, KEEP.y)];
  const holding = targetFor(agent({ houseId: "house_e", unitClass: "spear", id: "house_e_spear_00" }), threats);
  const charging = targetFor(agent({ houseId: "house_a", unitClass: "melee", id: "house_a_melee_00" }), threats);

  approx(holding.desiredRank, UNIT_CLASSES.spear.lineRank);
  assert.ok(radius(holding.target) <= UNIT_CLASSES.spear.lineRank + LATERAL_SPREAD + 0.01);
  approx(charging.desiredRank, UNIT_CLASSES.melee.lineRank * 1.2);
});

test("Given a harasser landed a hit, when the 25 tick window is evaluated, then it retreats through tick 24 and re-engages at tick 25", () => {
  const subject = agent({
    houseId: "house_d",
    unitClass: "skirmisher",
    id: "house_d_skirmisher_00",
    lastAttackTick: 100,
  });
  const threats = [hostile("east", KEEP.x + 170, KEEP.y)];
  const immediate = targetFor(subject, threats, 100);
  const stillRetreating = targetFor(subject, threats, 124);
  const boundary = targetFor(subject, threats, 125);

  assert.equal(immediate.posture, "retreat");
  assert.equal(stillRetreating.posture, "retreat");
  assert.equal(boundary.posture, "engage");
  assert.ok(immediate.desiredRank < UNIT_CLASSES.skirmisher.lineRank);
  assert.ok(boundary.desiredRank >= UNIT_CLASSES.skirmisher.lineRank);
});

test("Given a destroyed owning banner, when the target resolves, then fractured rank and formation overrides persist from banner hp", () => {
  const destroyed = BANNERS.map((banner) =>
    banner.houseId === "house_e" ? { ...banner, hp: 0 } : banner,
  );
  const first = targetFor(agent({ id: "house_e_spear_00" }), [hostile("east", KEEP.x + 170, KEEP.y)], 10, destroyed);
  const later = targetFor(agent({ id: "house_e_spear_00" }), [hostile("east", KEEP.x + 170, KEEP.y)], 300, destroyed);

  assert.equal(first.fractured, true);
  approx(first.desiredRank, UNIT_CLASSES.spear.lineRank * 0.7);
  assert.deepEqual(first.formation, { spacing: 9, cohesion: 0.1 });
  assert.equal(first.scatter.kind, "fracture-scatter");
  approx(first.scatter.magnitude, 0.6);
  assert.equal(first.idleJitterDisplacement, 0);
  assert.notEqual(first.fractureScatterDisplacement, 0);
  assert.deepEqual(later, first);
});

test("Given battle-line movement plans, when formation neighbours are prepared, then the spatial grid is built once and same-house neighbours are preselected", () => {
  let builds = 0;
  const agents = [
    agent({ id: "house_e_spear_00", x: KEEP.x, y: KEEP.y }),
    agent({ id: "house_e_spear_01", x: KEEP.x + 1, y: KEEP.y }),
    agent({ id: "house_d_skirmisher_00", houseId: "house_d", unitClass: "skirmisher", x: KEEP.x + 2, y: KEEP.y }),
  ];
  const plans = createBattleLineMovementPlans({
    agents,
    keep: KEEP,
    banners: BANNERS,
    threats: [hostile("east", KEEP.x + 170, KEEP.y)],
    selectedHouseIds: SELECTED,
    tick: 1,
    buildGrid: (input) => {
      builds += 1;
      return input;
    },
  });

  assert.equal(builds, 1);
  assert.deepEqual(plans.get("house_e_spear_00")?.formation.neighbours.map(({ id }) => id), ["house_e_spear_01"]);
  assert.deepEqual(plans.get("house_d_skirmisher_00")?.formation.neighbours, []);
});
