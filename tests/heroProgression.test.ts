import assert from "node:assert/strict";
import test from "node:test";
import { BALANCE_CONFIG } from "../src/content/balanceConfig";
import { applyAgentAttacks } from "../src/engine/agentCombat";
import {
  combatBonusesForAgents,
  heroRespawnTicksForAgent,
  maxHpForAgent,
} from "../src/engine/heroEngine";
import { applyHeroProgressAwards } from "../src/engine/progressionEngine";
import { createInitialState } from "../src/engine/tick";
import {
  HERO_LEVEL_THRESHOLDS,
  heroLevelForXp,
} from "../src/progression/xp";
import type { ThreatEvent } from "../src/threat/threatTypes";

function heroFixture() {
  const state = createInitialState(BALANCE_CONFIG.DEFAULT_SEED).state;
  const hero = state.agents.find(
    ({ heroId }) => heroId === "hero_ashvale",
  );
  const modifiers = state.houseModifiers.find(
    ({ houseId }) => houseId === "house_a",
  )?.modifiers;
  if (hero === undefined || modifiers === undefined) {
    throw new RangeError("Expected Ashvale hero progression fixtures.");
  }
  return { state, hero, modifiers };
}

function threat(hp: number): ThreatEvent {
  return {
    type: "monster_horde",
    waveIndex: 0,
    startTick: 0,
    traitorHouseId: null,
    mage: null,
    creatures: [{
      id: "creature_target",
      x: 105,
      y: 100,
      hp,
      agentDamage: 1,
      hallDamage: 1,
      lastAttackTick: -1,
      haltedUntilTick: -1,
    }],
  };
}

test("Given hero XP thresholds, when exact boundaries are queried, then the flatter five-level track is used", () => {
  assert.deepEqual(HERO_LEVEL_THRESHOLDS, [0, 250, 700, 1400, 2400]);
  assert.equal(heroLevelForXp(249), 1);
  assert.equal(heroLevelForXp(250), 2);
  assert.equal(heroLevelForXp(699), 2);
  assert.equal(heroLevelForXp(700), 3);
  assert.equal(heroLevelForXp(2400), 5);
});

test("Given a hero attack, when personal damage and a kill resolve, then XP is attributed to that hero as well as its house", () => {
  const { state, hero } = heroFixture();
  const attacker = {
    ...hero,
    x: 100,
    y: 100,
    state: "fighting" as const,
    lastAttackTick: -1,
  };
  const modifiersByHouse = new Map(
    state.houseModifiers.map(({ houseId, modifiers }) => [
      houseId,
      modifiers,
    ]),
  );
  const bonuses = combatBonusesForAgents(
    [attacker],
    state.houseModifiers,
    1,
  );

  const result = applyAgentAttacks(
    [{
      agent: attacker,
      intent: {
        kind: "engage",
        targetId: "creature_target",
        towardX: 105,
        towardY: 100,
        preferredRange: 13,
      },
    }],
    threat(20),
    10,
    modifiersByHouse,
    bonuses,
  );

  assert.deepEqual(result.heroXpAwards, [{
    heroId: "hero_ashvale",
    amount: 45,
  }]);
  assert.deepEqual(result.xpAwards, [{
    houseId: "house_a",
    amount: 45,
  }]);
});

test("Given regular-agent damage in a hero's house, when attacks resolve, then no hero gains that house XP", () => {
  const { state } = heroFixture();
  const regular = state.agents.find(
    ({ houseId, isHero }) => houseId === "house_a" && !isHero,
  );
  if (regular === undefined) {
    throw new RangeError("Expected a regular Ashvale agent.");
  }
  const attacker = {
    ...regular,
    x: 100,
    y: 100,
    state: "fighting" as const,
    lastAttackTick: -1,
  };
  const modifiersByHouse = new Map(
    state.houseModifiers.map(({ houseId, modifiers }) => [
      houseId,
      modifiers,
    ]),
  );

  const result = applyAgentAttacks(
    [{
      agent: attacker,
      intent: {
        kind: "engage",
        targetId: "creature_target",
        towardX: 105,
        towardY: 100,
        preferredRange: 13,
      },
    }],
    threat(100),
    10,
    modifiersByHouse,
  );

  assert.ok((result.xpAwards[0]?.amount ?? 0) > 0);
  assert.deepEqual(result.heroXpAwards, []);
});

test("Given enough personal XP to level, when hero progress applies, then stats update without changing phase or queuing a draft", () => {
  const { state, hero } = heroFixture();
  const beforeDrafts = state.pendingDrafts;
  const result = applyHeroProgressAwards(
    { ...state, phase: "wave" },
    [{ heroId: "hero_ashvale", xp: 250 }],
    77,
  );
  const progressed = result.heroProgress.find(
    ({ heroId }) => heroId === "hero_ashvale",
  );
  const updatedHero = result.agents.find(
    ({ heroId }) => heroId === "hero_ashvale",
  );

  assert.deepEqual(progressed, {
    heroId: "hero_ashvale",
    xp: 250,
    level: 2,
  });
  assert.equal(updatedHero?.heroLevel, 2);
  assert.equal(updatedHero?.heroLevelUpTick, 77);
  assert.equal(updatedHero?.hp, hero.hp + 30);
  assert.equal(result.phase, "wave");
  assert.strictEqual(result.pendingDrafts, beforeDrafts);
});

test("Given a level-two hero, when derived stats resolve, then damage compounds 8 percent, max HP gains 30 flat, and respawn time drops 8 percent", () => {
  const { state, hero, modifiers } = heroFixture();
  const levelTwo = { ...hero, heroLevel: 2 };
  const levelOneBonus = combatBonusesForAgents(
    [hero],
    state.houseModifiers,
    1,
  ).get(hero.id);
  const levelTwoBonus = combatBonusesForAgents(
    [levelTwo],
    state.houseModifiers,
    1,
  ).get(levelTwo.id);

  assert.equal(
    maxHpForAgent(levelTwo, modifiers) - maxHpForAgent(hero, modifiers),
    30,
  );
  assert.ok(
    Math.abs(
      (levelTwoBonus?.damageMultiplier ?? 0) /
        (levelOneBonus?.damageMultiplier ?? 1) -
        1.08,
    ) < 1e-12,
  );
  assert.equal(heroRespawnTicksForAgent(hero, modifiers), 600);
  assert.equal(heroRespawnTicksForAgent(levelTwo, modifiers), 552);
});
