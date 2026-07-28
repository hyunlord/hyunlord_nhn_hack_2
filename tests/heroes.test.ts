import assert from "node:assert/strict";
import test from "node:test";
import { BALANCE_CONFIG } from "../src/content/balanceConfig";
import { HERO_DEFINITIONS } from "../src/content/heroConfig";
import type { HouseSelection } from "../src/content/houseConfig";
import { UNIT_CLASSES } from "../src/content/unitClassConfig";
import type { Agent, ThreatPresence } from "../src/agents/agentTypes";
import { createBattleLineMovementPlans, resolveBattleLineTarget } from "../src/agents/battleLine";
import { stepAgent } from "../src/agents/movement";
import {
  combatBonusesForAgents,
  maxHpForAgent,
  respawnHeroes,
} from "../src/engine/heroEngine";
import { applyAgentAttacks } from "../src/engine/agentCombat";
import { applyThreatDamages } from "../src/engine/combatDamage";
import {
  advanceTick,
  createInitialState,
} from "../src/engine/tick";
import type { Banner, Keep } from "../src/engine/engine.types";
import { createRng } from "../src/engine/prng";

const SELECTED_HOUSES: HouseSelection = ["house_a", "house_b", "house_c"];

function distance(
  first: { readonly x: number; readonly y: number },
  second: { readonly x: number; readonly y: number },
): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function averageDistance(
  agents: readonly Agent[],
  point: { readonly x: number; readonly y: number },
): number {
  return agents.reduce((sum, agent) => sum + distance(agent, point), 0) / agents.length;
}

function hostile(id: string, x: number, y: number): ThreatPresence {
  return { id, x, y, hostile: true };
}

function heroFixture(heroId: string): Agent {
  const state = createInitialState(BALANCE_CONFIG.DEFAULT_SEED).state;
  const hero = state.agents.find((agent) => agent.heroId === heroId);
  if (hero === undefined) {
    throw new RangeError(`Expected hero ${heroId}.`);
  }
  return hero;
}

function battleTarget(
  agent: Agent,
  threats: readonly ThreatPresence[],
  keep: Keep,
  banners: readonly Banner[],
  tick = 100,
) {
  return resolveBattleLineTarget({
    agent,
    keep,
    banners,
    threats,
    selectedHouseIds: SELECTED_HOUSES,
    tick,
  });
}

function approximate(actual: number, expected: number, tolerance: number): void {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

test("Given a new run, when agents are created, then one configured hero per house is appended without replacing regulars", () => {
  const state = createInitialState(BALANCE_CONFIG.DEFAULT_SEED).state;
  const heroes = state.agents.filter(({ isHero }) => isHero);

  assert.equal(state.agents.length, 76);
  assert.deepEqual(
    heroes.map(({ heroId, houseId }) => ({ heroId, houseId })),
    HERO_DEFINITIONS.map(({ id, houseId }) => ({
      heroId: id,
      houseId,
    })),
  );
  assert.ok(
    heroes.every(
      ({ heroLevel, respawnAtTick }) =>
        heroLevel === 1 && respawnAtTick === null,
    ),
  );
});

test("Given a dead hero at its due tick, when respawns resolve, then it returns at its banner with full effective HP", () => {
  const state = createInitialState(BALANCE_CONFIG.DEFAULT_SEED).state;
  const hero = state.agents.find(({ heroId }) => heroId === "hero_ashvale");
  if (hero === undefined) {
    throw new RangeError("Expected Ashvale's hero.");
  }
  const dead = {
    ...hero,
    x: 400,
    y: 300,
    hp: 0,
    state: "dead" as const,
    respawnAtTick: 700,
  };
  const agents = respawnHeroes(
    [dead],
    state.keep,
    state.banners,
    state.houseModifiers,
    700,
  );
  const returned = agents[0];
  const ownBanner = state.banners.find(({ houseId }) => houseId === hero.houseId);
  const modifiers = state.houseModifiers.find(
    ({ houseId }) => houseId === hero.houseId,
  )?.modifiers;
  if (returned === undefined || ownBanner === undefined || modifiers === undefined) {
    throw new RangeError("Expected a complete hero respawn fixture.");
  }

  assert.equal(returned.x, ownBanner.x);
  assert.equal(returned.y, ownBanner.y);
  assert.equal(returned.hp, maxHpForAgent(returned, modifiers));
  assert.equal(returned.state, "idle");
  assert.equal(returned.respawnAtTick, null);
});

test("Given a hero killed at tick one hundred, when damage schedules death, then tick seven hundred returns it", () => {
  const state = createInitialState(BALANCE_CONFIG.DEFAULT_SEED).state;
  const hero = state.agents.find(({ heroId }) => heroId === "hero_ashvale");
  if (hero === undefined) {
    throw new RangeError("Expected Ashvale's hero.");
  }
  const [dead] = applyThreatDamages(
    [hero],
    [{ agentId: hero.id, amount: hero.hp }],
    100,
    state.houseModifiers,
  );
  if (dead === undefined) {
    throw new RangeError("Expected the damaged hero.");
  }

  assert.equal(dead.state, "dead");
  assert.equal(dead.respawnAtTick, 700);

  const beforeDue = advanceTick(
    {
      ...state,
      tick: 698,
      phase: "intermission",
      agents: [dead],
    },
    createRng(1),
  );
  const due = advanceTick(beforeDue, createRng(1));

  assert.equal(beforeDue.tick, 699);
  assert.equal(beforeDue.agents[0]?.state, "dead");
  assert.equal(due.tick, 700);
  assert.equal(due.agents[0]?.state, "idle");
  assert.equal(due.agents[0]?.respawnAtTick, null);
});

test("Given an ally inside Ivy's aura, when combat bonuses resolve, then only the inside ally receives higher damage", () => {
  const state = createInitialState(BALANCE_CONFIG.DEFAULT_SEED).state;
  const ivy = state.agents.find(({ heroId }) => heroId === "hero_greymoor");
  const ally = state.agents.find(
    ({ isHero, houseId }) => !isHero && houseId === "house_a",
  );
  if (ivy === undefined || ally === undefined) {
    throw new RangeError("Expected Ivy and an allied agent.");
  }
  const inside = combatBonusesForAgents(
    [
      { ...ivy, x: 100, y: 100 },
      { ...ally, x: 150, y: 100 },
    ],
    state.houseModifiers,
    1,
  );
  const outside = combatBonusesForAgents(
    [
      { ...ivy, x: 100, y: 100 },
      { ...ally, x: 300, y: 100 },
    ],
    state.houseModifiers,
    1,
  );

  assert.equal(inside.get(ally.id)?.damageMultiplier, 1.25);
  assert.equal(outside.get(ally.id)?.damageMultiplier, 1);
  assert.equal(
    inside.get(ivy.id)?.damageMultiplier,
    HERO_DEFINITIONS[2]?.damageMultiplier,
  );
  assert.equal(inside.has("enemy_creature"), false);
});

test("Given a due hero and no surviving anchor, when respawns resolve, then it remains dead", () => {
  const state = createInitialState(BALANCE_CONFIG.DEFAULT_SEED).state;
  const hero = state.agents.find(({ isHero }) => isHero);
  if (hero === undefined) {
    throw new RangeError("Expected a hero fixture.");
  }
  const dead = {
    ...hero,
    hp: 0,
    state: "dead" as const,
    respawnAtTick: 600,
  };

  const result = respawnHeroes(
    [dead],
    { ...state.keep, hp: 0 },
    state.banners.map((banner) => ({ ...banner, hp: 0 })),
    state.houseModifiers,
    600,
  );

  assert.strictEqual(result[0], dead);
});

test("Given Hollow Crown disables a house hero respawn, when the hero is due, then it remains dead beside a surviving banner", () => {
  const state = createInitialState(BALANCE_CONFIG.DEFAULT_SEED).state;
  const hero = state.agents.find(({ heroId }) => heroId === "hero_ashvale");
  if (hero === undefined) {
    throw new RangeError("Expected a hero fixture.");
  }
  const dead = {
    ...hero,
    hp: 0,
    state: "dead" as const,
    respawnAtTick: 600,
  };
  const modifiers = state.houseModifiers.map((entry) =>
    entry.houseId === hero.houseId
      ? {
          ...entry,
          modifiers: {
            ...entry.modifiers,
            disableHeroRespawn: true,
          },
        }
      : entry,
  );

  const result = respawnHeroes([dead], state.keep, state.banners, modifiers, 600);

  assert.strictEqual(result[0], dead);
});

test("Given Ivy has Green Mercy, when she kills inside her aura, then nearby living allies heal without exceeding their effective max HP", () => {
  const state = createInitialState(BALANCE_CONFIG.DEFAULT_SEED).state;
  const ivy = state.agents.find(({ heroId }) => heroId === "hero_greymoor");
  const ally = state.agents.find(
    ({ isHero, houseId }) => !isHero && houseId === "house_a",
  );
  if (ivy === undefined || ally === undefined) {
    throw new RangeError("Expected Ivy and an allied agent.");
  }
  const modifiers = state.houseModifiers.map((entry) =>
    entry.houseId === ivy.houseId
      ? {
          ...entry,
          modifiers: { ...entry.modifiers, heroOnKillHeal: 12 },
        }
      : entry,
  );
  const positionedIvy = {
    ...ivy,
    x: 100,
    y: 100,
    state: "fighting" as const,
    lastAttackTick: 0,
  };
  const positionedAlly = {
    ...ally,
    x: 120,
    y: 100,
    hp: 50,
  };
  const modifiersByAgent = new Map(
    [positionedIvy, positionedAlly].map((agent) => {
      const value = modifiers.find(
        ({ houseId }) => houseId === agent.houseId,
      )?.modifiers;
      if (value === undefined) {
        throw new RangeError(`Expected modifiers for ${agent.houseId}.`);
      }
      return [agent.id, value] as const;
    }),
  );
  const threat = {
    type: "monster_horde" as const,
    waveIndex: 0,
    startTick: 0,
    creatures: [
      {
        id: "creature_target",
        x: 105,
        y: 100,
        hp: 1,
        agentDamage: 1,
        structureDamage: 1,
        lastAttackTick: 0,
        haltedUntilTick: -1,
      },
    ],
    mage: null,
    traitorHouseId: null,
  };
  const bonuses = combatBonusesForAgents(
    [positionedIvy, positionedAlly],
    modifiers,
    1,
  );

  const result = applyAgentAttacks(
    [
      {
        agent: positionedIvy,
        intent: {
          kind: "engage",
          targetId: "creature_target",
          towardX: 105,
          towardY: 100,
          preferredRange: 13,
        },
      },
      {
        agent: positionedAlly,
        intent: { kind: "idle" },
      },
    ],
    threat,
    UNIT_CLASSES.melee.attackIntervalTicks,
    modifiersByAgent,
    bonuses,
  );

  assert.equal(result.threat.creatures.length, 0);
  assert.equal(result.agents[1]?.hp, 62);
});


test("Given Sera faces an outer threat, when deterministic battle-line ticks advance, then she stands closer than same-house regulars", () => {
  const state = createInitialState(102).state;
  const threat = hostile("outer_creature", state.keep.x + 300, state.keep.y);
  let agents = state.agents.filter(
    (agent) => agent.houseId === "house_a" && (agent.isHero || !agent.isHero),
  );

  for (let tick = 0; tick < 200; tick += 1) {
    const plans = createBattleLineMovementPlans({
      agents,
      keep: state.keep,
      banners: state.banners,
      threats: [threat],
      selectedHouseIds: state.selectedHouseIds,
      tick,
    });
    agents = agents.map((agent) => {
      const plan = plans.get(agent.id);
      if (plan === undefined) {
        return agent;
      }
      return stepAgent(
        agent,
        createRng(10_000 + tick),
        {
          kind: "engage",
          towardX: plan.target.target.x,
          towardY: plan.target.target.y,
          targetId: plan.target.targetId,
          preferredRange: 0,
        },
        { moveSpeedMultiplier: 1, formation: plan.formation },
      );
    });
  }

  const sera = agents.find((agent) => agent.heroId === "hero_ashvale");
  const regulars = agents.filter((agent) => !agent.isHero && agent.hp > 0);
  if (sera === undefined || regulars.length === 0) {
    throw new RangeError("Expected Sera and regular Ashvale agents.");
  }

  assert.ok(distance(sera, threat) < averageDistance(regulars, threat));
});

test("Given Sera resolves a battle-line target, when Ashvale charge style and fracture apply to regulars, then her hero override still seeks the outer rank", () => {
  const state = createInitialState(103).state;
  const sera = heroFixture("hero_ashvale");
  const regular = {
    ...sera,
    id: "house_a_regular_compare",
    isHero: false,
    heroId: null,
  };
  const threat = hostile("east", state.keep.x + 280, state.keep.y);
  const threats = [threat];
  const destroyed = state.banners.map((banner) =>
    banner.houseId === sera.houseId ? { ...banner, hp: 0 } : banner,
  );

  const heroTarget = battleTarget(sera, threats, state.keep, destroyed);
  const regularTarget = battleTarget(regular, threats, state.keep, destroyed);

  assert.equal(heroTarget.fractured, false);
  assert.equal(heroTarget.posture, "engage");
  assert.ok(heroTarget.desiredRank > regularTarget.desiredRank);
  assert.ok(distance(heroTarget.target, threat) < distance(regularTarget.target, threat));
});

test("Given Bren resolves a battle-line target, when his banner is fractured, then he holds exact spear rank and never retreats", () => {
  const state = createInitialState(104).state;
  const bren = { ...heroFixture("hero_thornhold"), lastAttackTick: 100 };
  const threats = [hostile("east", state.keep.x + 260, state.keep.y)];
  const destroyed = state.banners.map((banner) =>
    banner.houseId === bren.houseId ? { ...banner, hp: 0 } : banner,
  );

  const target = battleTarget(bren, threats, state.keep, destroyed, 110);

  assert.equal(target.desiredRank, UNIT_CLASSES.spear.lineRank);
  assert.equal(target.posture, "engage");
  assert.equal(target.fractured, false);
  approximate(distance(target.target, state.keep), UNIT_CLASSES.spear.lineRank, 60);
});

test("Given Ivy faces a nearest threat, when deterministic battle-line ticks advance, then her actual distance stays above same-house regulars", () => {
  const state = createInitialState(106).state;
  const nearest = hostile("nearest_creature", state.keep.x + UNIT_CLASSES.archer.lineRank + 40, state.keep.y);
  let agents = state.agents.filter((agent) => agent.houseId === "house_c");

  for (let tick = 0; tick < 200; tick += 1) {
    const plans = createBattleLineMovementPlans({
      agents,
      keep: state.keep,
      banners: state.banners,
      threats: [nearest],
      selectedHouseIds: state.selectedHouseIds,
      tick,
    });
    agents = agents.map((agent) => {
      const plan = plans.get(agent.id);
      if (plan === undefined) {
        return agent;
      }
      return stepAgent(
        agent,
        createRng(11_000 + tick),
        {
          kind: "engage",
          towardX: plan.target.target.x,
          towardY: plan.target.target.y,
          targetId: plan.target.targetId,
          preferredRange: 0,
        },
        { moveSpeedMultiplier: 1, formation: plan.formation },
      );
    });
  }

  const ivy = agents.find((agent) => agent.heroId === "hero_greymoor");
  const regulars = agents.filter((agent) => !agent.isHero && agent.hp > 0);
  if (ivy === undefined || regulars.length === 0) {
    throw new RangeError("Expected Ivy and regular Greymoor agents.");
  }

  assert.ok(distance(ivy, nearest) > averageDistance(regulars, nearest));
});

test("Given Ivy resolves a battle-line target, when the nearest threat is ahead, then she keeps archer rank and remains behind same-house regulars", () => {
  const state = createInitialState(105).state;
  const ivy = heroFixture("hero_greymoor");
  const nearest = hostile("east", state.keep.x + UNIT_CLASSES.archer.lineRank + 40, state.keep.y);
  const regulars = state.agents.filter(
    (agent) => !agent.isHero && agent.houseId === ivy.houseId && agent.hp > 0,
  );
  const target = battleTarget(ivy, [nearest], state.keep, state.banners);
  const regularRankAverage = regulars.reduce(
    (sum, regular) => sum + UNIT_CLASSES[regular.unitClass].lineRank,
    0,
  ) / regulars.length;
  const regularThreatDistance = distance(state.keep, nearest) - regularRankAverage;

  assert.equal(target.desiredRank, UNIT_CLASSES.archer.lineRank);
  assert.ok(distance(target.target, nearest) > regularThreatDistance);
});
