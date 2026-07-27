import assert from "node:assert/strict";
import test from "node:test";
import { BALANCE_CONFIG } from "../src/content/balanceConfig";
import { HERO_DEFINITIONS } from "../src/content/heroConfig";
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
import { createRng } from "../src/engine/prng";

test("Given a new run, when agents are created, then one configured hero per house is appended without replacing regulars", () => {
  const state = createInitialState(BALANCE_CONFIG.DEFAULT_SEED).state;
  const heroes = state.agents.filter(({ isHero }) => isHero);

  assert.equal(state.agents.length, 63);
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

test("Given a dead hero at its due tick, when respawns resolve, then it returns at its hall with full effective HP", () => {
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
    state.halls,
    state.houseModifiers,
    700,
  );
  const returned = agents[0];
  const ownHall = state.halls.find(({ houseId }) => houseId === hero.houseId);
  const modifiers = state.houseModifiers.find(
    ({ houseId }) => houseId === hero.houseId,
  )?.modifiers;
  if (returned === undefined || ownHall === undefined || modifiers === undefined) {
    throw new RangeError("Expected a complete hero respawn fixture.");
  }

  assert.equal(returned.x, ownHall.x);
  assert.equal(returned.y, ownHall.y);
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

test("Given a due hero and no surviving hall, when respawns resolve, then it remains dead", () => {
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
    state.halls.map((hall) => ({ ...hall, hp: 0 })),
    state.houseModifiers,
    600,
  );

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
  const modifiersByHouse = new Map(
    modifiers.map(({ houseId, modifiers: value }) => [houseId, value]),
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
        hallDamage: 1,
        lastAttackTick: 0,
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
        },
      },
      {
        agent: positionedAlly,
        intent: { kind: "idle" },
      },
    ],
    threat,
    BALANCE_CONFIG.AGENT_ATTACK_INTERVAL_TICKS,
    modifiersByHouse,
    bonuses,
  );

  assert.equal(result.threat.creatures.length, 0);
  assert.equal(result.agents[1]?.hp, 62);
});
