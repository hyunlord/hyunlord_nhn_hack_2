import assert from "node:assert/strict";
import test from "node:test";
import { LATERAL_SPREAD } from "../src/agents/battleLine";
import { BALANCE_CONFIG } from "../src/content/balanceConfig";
import type { HouseId } from "../src/content/houseConfig";
import { advanceWaveCombat } from "../src/engine/invasionCombat";
import type { GameState } from "../src/engine/engine.types";
import { createInitialState } from "../src/engine/tick";

function combatStateForHouse(houseId: HouseId, hp: number) {
  const world = createInitialState(BALANCE_CONFIG.DEFAULT_SEED, [
    "house_e",
    "house_d",
    "house_f",
  ]);
  const source = world.state.agents.find(
    (agent) => agent.houseId === houseId && !agent.isHero,
  );
  if (source === undefined) {
    throw new RangeError(`Expected a ${houseId} agent fixture.`);
  }
  const agent = {
    ...source,
    x: 100,
    y: 100,
    hp,
    disposition: { aggression: 0, loyalty: 80 },
  };
  return {
    world,
    state: {
      ...world.state,
      phase: "wave" as const,
      agents: [agent],
      activeThreat: {
        type: "monster_horde" as const,
        waveIndex: 0,
        startTick: 0,
        traitorHouseId: null,
        mage: null,
        creatures: [{
          id: "nearby_attacker",
          x: 110,
          y: 100,
          hp: BALANCE_CONFIG.CREATURE_HP,
          agentDamage: BALANCE_CONFIG.CREATURE_ATTACK_DAMAGE,
          structureDamage: BALANCE_CONFIG.CREATURE_HALL_DAMAGE,
          lastAttackTick: -1,
          haltedUntilTick: 1_000,
        }],
      },
    },
  };
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);
  const value = sorted[middle];
  if (value === undefined) {
    throw new RangeError("Expected non-empty sample.");
  }
  return sorted.length % 2 === 1
    ? value
    : ((sorted[middle - 1] ?? value) + value) / 2;
}

function distance(
  first: { readonly x: number; readonly y: number },
  second: { readonly x: number; readonly y: number },
): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function deterministicWaveState(): ReturnType<typeof createInitialState> {
  return createInitialState(BALANCE_CONFIG.DEFAULT_SEED, [
    "house_e",
    "house_d",
    "house_f",
  ]);
}


function battleLineAgents(state: GameState) {
  const source = state.agents.find((candidate) => !candidate.isHero);
  if (source === undefined) {
    throw new RangeError("Expected a regular agent fixture.");
  }
  const specs = [
    { houseId: "house_e" as const, unitClass: "spear" as const, count: 8, y: -4 },
    { houseId: "house_d" as const, unitClass: "skirmisher" as const, count: 8, y: 0 },
    { houseId: "house_f" as const, unitClass: "archer" as const, count: 8, y: 4 },
  ];
  return specs.flatMap((spec) =>
    Array.from({ length: spec.count }, (_, index) => ({
      ...source,
      id: `${spec.houseId}_${spec.unitClass}_${String(index).padStart(2, "0")}`,
      houseId: spec.houseId,
      unitClass: spec.unitClass,
      x: state.keep.x - 4 + index,
      y: state.keep.y + spec.y,
      heading: 0,
      hp: 200,
      state: "idle" as const,
      lastAttackTick: -1,
      isHero: false,
      heroId: null,
    })),
  );
}

function nearestDistances(points: readonly { readonly x: number; readonly y: number }[]): readonly number[] {
  return points.map((point, index) => {
    const distances = points
      .filter((_, candidateIndex) => candidateIndex !== index)
      .map((candidate) => distance(point, candidate))
      .sort((first, second) => first - second);
    const nearest = distances[0];
    if (nearest === undefined) {
      throw new RangeError("Expected at least two samples.");
    }
    return nearest;
  });
}

function withBattleLineThreat(state: GameState): GameState {
  return {
    ...state,
    phase: "wave",
    agents: battleLineAgents(state),
    activeThreat: {
      type: "monster_horde",
      waveIndex: 0,
      startTick: 0,
      traitorHouseId: null,
      mage: null,
      creatures: [
        {
          id: "line_anchor",
          x: state.keep.x + BALANCE_CONFIG.KEEP_DEFENSE_RADIUS * 1.4,
          y: state.keep.y,
          hp: 10_000,
          agentDamage: BALANCE_CONFIG.CREATURE_ATTACK_DAMAGE,
          structureDamage: BALANCE_CONFIG.CREATURE_HALL_DAMAGE,
          lastAttackTick: -1,
          haltedUntilTick: 1_000,
        },
      ],
    },
  };
}

function advanceTicks(state: GameState, ticks: number): GameState {
  const world = deterministicWaveState();
  let current = state;
  for (let tick = 0; tick < ticks; tick += 1) {
    current = {
      ...current,
      ...advanceWaveCombat(current, tick, world.rng),
      tick,
    };
  }
  return current;
}

test("Given fragile and durable house agents near their break thresholds, when combat advances, then house HP traits govern whether they flee", () => {
  const stonewake = combatStateForHouse("house_e", 40);
  const duskmere = combatStateForHouse("house_d", 32);

  const stonewakeResult = advanceWaveCombat(
    stonewake.state,
    1,
    stonewake.world.rng,
  );
  const duskmereResult = advanceWaveCombat(
    duskmere.state,
    1,
    duskmere.world.rng,
  );

  assert.equal(stonewakeResult.agents[0]?.state, "fleeing");
  assert.equal(duskmereResult.agents[0]?.state, "fighting");
});

test("Given an agent whose banner is destroyed, when a foreign anchor is attacked, then combat wiring sends it to help", () => {
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
      banners: world.state.banners.map((banner) => ({
        ...banner,
        x: banner.houseId === "house_b" ? 700 : banner.x,
        y: 100,
        hp: banner.houseId === "house_b" ? BALANCE_CONFIG.BANNER_HP : 0,
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
            structureDamage: BALANCE_CONFIG.CREATURE_HALL_DAMAGE,
            lastAttackTick: -1,
            haltedUntilTick: 1_000,
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

test("Given a safe home and a threatened foreign banner, when an aggressive defender advances, then it visibly helps", () => {
  const world = createInitialState(BALANCE_CONFIG.DEFAULT_SEED);
  const source = world.state.agents.find(
    ({ houseId }) => houseId === "house_a",
  );
  if (source === undefined) {
    throw new RangeError("Expected a house A agent fixture.");
  }
  const agent = {
    ...source,
    x: 120,
    y: 120,
    disposition: {
      aggression: BALANCE_CONFIG.AGENT_REINFORCE_AGGRESSION_THRESHOLD,
      loyalty: 80,
    },
  };
  const state = {
    ...world.state,
    phase: "wave" as const,
    agents: [agent],
    banners: world.state.banners.map((banner) => ({
      ...banner,
      x: banner.houseId === "house_a" ? 100 : 700,
      y: 100,
      hp: banner.houseId === "house_c" ? 0 : BALANCE_CONFIG.BANNER_HP,
    })),
    activeThreat: {
      type: "monster_horde" as const,
      waveIndex: 0,
      startTick: 0,
      traitorHouseId: null,
      mage: null,
      creatures: [{
        id: "foreign_attacker",
        x: 710,
        y: 100,
        hp: BALANCE_CONFIG.CREATURE_HP,
        agentDamage: BALANCE_CONFIG.CREATURE_ATTACK_DAMAGE,
        structureDamage: BALANCE_CONFIG.CREATURE_HALL_DAMAGE,
        lastAttackTick: -1,
        haltedUntilTick: -1,
      }],
    },
  };

  const result = advanceWaveCombat(state, 1, world.rng);
  const moved = result.agents[0];

  assert.equal(moved?.state, "helping");
  assert.ok((moved?.x ?? 0) > agent.x);
});

test("Given deterministic battle-line combat, when 200 ticks pass, then class ranks and overlapping house cohesion shape the keep defense", () => {
  const world = deterministicWaveState();
  const settled = advanceTicks(withBattleLineThreat(world.state), 200);
  const samples = settled.agents.filter((candidate) => !candidate.isHero && candidate.hp > 0);
  const spearRadii = samples.filter(({ unitClass }) => unitClass === "spear").map((sample) => distance(sample, settled.keep));
  const archerRadii = samples.filter(({ unitClass }) => unitClass === "archer").map((sample) => distance(sample, settled.keep));
  const stonewake = samples.filter(({ houseId }) => houseId === "house_e");
  const duskmere = samples.filter(({ houseId }) => houseId === "house_d");
  const sameHouseDistances = stonewake.slice(0, 8).map((sample, index, group) => distance(sample, group[(index + 1) % group.length] ?? sample));
  const crossHouseDistances = stonewake.slice(0, 8).map((sample, index) => distance(sample, duskmere[index] ?? sample));
  const stonewakeNearest = nearestDistances(stonewake);
  const duskmereNearest = nearestDistances(duskmere);

  assert.ok(median(spearRadii) > median(archerRadii));
  assert.ok(median(sameHouseDistances) < median(crossHouseDistances));
  assert.ok(median(stonewakeNearest) < median(duskmereNearest));
  assert.ok(Math.abs(median(stonewake.map((sample) => sample.x)) - median(duskmere.map((sample) => sample.x))) < LATERAL_SPREAD * 2);
});

test("Given one banner is destroyed, when battle-line combat settles, then fractured agents hold inward with greater spread", () => {
  const world = deterministicWaveState();
  const intact = advanceTicks(withBattleLineThreat(world.state), 200);
  const brokenState = withBattleLineThreat({
    ...world.state,
    banners: world.state.banners.map((banner) =>
      banner.houseId === "house_e" ? { ...banner, hp: 0 } : banner,
    ),
  });
  const broken = advanceTicks(brokenState, 200);
  const intactStonewake = intact.agents.filter(({ houseId, hp }) => houseId === "house_e" && hp > 0);
  const brokenStonewake = broken.agents.filter(({ houseId, hp }) => houseId === "house_e" && hp > 0);
  const intactRadii = intactStonewake.map((sample) => distance(sample, intact.keep));
  const brokenRadii = brokenStonewake.map((sample) => distance(sample, broken.keep));
  const intactCenterY = median(intactStonewake.map(({ y }) => y));
  const brokenCenterY = median(brokenStonewake.map(({ y }) => y));
  const intactSpread = intactStonewake.map((sample) => Math.abs(sample.y - intactCenterY));
  const brokenSpread = brokenStonewake.map((sample) => Math.abs(sample.y - brokenCenterY));

  assert.ok(median(brokenRadii) < median(intactRadii));
  assert.ok(median(brokenSpread) > median(intactSpread));
});
