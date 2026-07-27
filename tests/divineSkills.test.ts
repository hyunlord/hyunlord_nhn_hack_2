import assert from "node:assert/strict";
import test from "node:test";
import { BALANCE_CONFIG } from "../src/content/balanceConfig";
import { CARD_DEFINITIONS } from "../src/content/cardConfig";
import {
  canCastSkill,
  resolveSkill,
} from "../src/divine/skillResolver";
import type { DivineSkillEvent } from "../src/divine/skillTypes";
import { chooseDraftCard } from "../src/engine/progressionEngine";
import { castSkill } from "../src/engine/skillApplication";
import {
  advanceTick,
  createInitialState,
} from "../src/engine/tick";
import { eligibleCards } from "../src/progression/cardPool";
import { stepThreat } from "../src/threat/waveDirector";
import type { ThreatEvent } from "../src/threat/threatTypes";
import { createRng } from "../src/engine/prng";

const CHAINS_EVENT: DivineSkillEvent = {
  type: "chains_of_dusk",
  targetX: 100,
  targetY: 100,
  tick: 100,
};

function creatureThreat(): ThreatEvent {
  return {
    type: "monster_horde",
    waveIndex: 0,
    startTick: 0,
    traitorHouseId: null,
    mage: null,
    creatures: [{
      id: "creature_a",
      x: 100,
      y: 100,
      hp: 100,
      agentDamage: 6,
      hallDamage: 5,
      lastAttackTick: 0,
      haltedUntilTick: -1,
    }],
  };
}

test("Given locked, unaffordable, or cooling skills, when affordability is checked, then every invalid state is rejected", () => {
  assert.equal(
    canCastSkill("chains_of_dusk", [], 100, 0),
    false,
  );
  assert.equal(
    canCastSkill("chains_of_dusk", ["chains_of_dusk"], 39, 0),
    false,
  );
  assert.equal(
    canCastSkill("chains_of_dusk", ["chains_of_dusk"], 100, 1),
    false,
  );
  assert.equal(
    canCastSkill("chains_of_dusk", ["chains_of_dusk"], 40, 0),
    true,
  );
});

test("Given a skill card draft, when it is chosen, then the skill unlocks once and the card becomes ineligible", () => {
  const base = createInitialState(BALANCE_CONFIG.DEFAULT_SEED).state;
  const state = {
    ...base,
    phase: "draft" as const,
    phaseBeforeDraft: "wave" as const,
    pendingDrafts: [{
      id: "skill_offer",
      houseId: "house_a",
      level: 2,
      cardIds: ["divine_grant_chains"],
    }],
  };

  const chosen = chooseDraftCard(
    state,
    "skill_offer",
    "divine_grant_chains",
  );
  const progress = chosen.houseProgress.find(
    ({ houseId }) => houseId === "house_a",
  );
  const eligible = eligibleCards(
    CARD_DEFINITIONS,
    "house_a",
    progress?.cards ?? [],
    ["hero_ashvale"],
  );

  assert.deepEqual(chosen.unlockedSkills, ["chains_of_dusk"]);
  assert.equal(
    progress?.cards.find(
      ({ cardId }) => cardId === "divine_grant_chains",
    )?.stacks,
    1,
  );
  assert.ok(
    !eligible.some(({ id }) => id === "divine_grant_chains"),
  );
});

test("Given every skill grant card, when eligibility is filtered, then grants appear once and remain one-time despite rare tier stacks", () => {
  const grantIds = [
    "divine_grant_chains",
    "divine_grant_sanctuary",
    "divine_grant_meteor",
    "divine_grant_resurgence",
  ];
  const freshEligible = eligibleCards(
    CARD_DEFINITIONS,
    "house_a",
    [],
    ["hero_ashvale"],
  );
  const afterOneStack = eligibleCards(
    CARD_DEFINITIONS,
    "house_a",
    grantIds.map((cardId) => ({ cardId, stacks: 1 })),
    ["hero_ashvale"],
  );

  assert.ok(
    grantIds.every((id) =>
      freshEligible.some((card) => card.id === id),
    ),
  );
  assert.equal(
    CARD_DEFINITIONS.find(({ id }) => id === "divine_grant_chains")
      ?.maxStacks,
    2,
  );
  assert.equal(
    CARD_DEFINITIONS.find(({ id }) => id === "divine_grant_sanctuary")
      ?.maxStacks,
    2,
  );
  assert.ok(
    grantIds.every(
      (id) => !afterOneStack.some((card) => card.id === id),
    ),
  );
});

test("Given an unavailable skill state, when engine casting is attempted, then the exact state reference is retained", () => {
  const base = createInitialState(BALANCE_CONFIG.DEFAULT_SEED).state;
  const locked = { ...base, activeThreat: creatureThreat() };
  const insufficient = {
    ...locked,
    unlockedSkills: ["chains_of_dusk" as const],
    divinePower: 39,
  };
  const cooling = {
    ...locked,
    unlockedSkills: ["chains_of_dusk" as const],
    skillCooldowns: {
      ...locked.skillCooldowns,
      chains_of_dusk: 1,
    },
  };

  assert.strictEqual(castSkill(locked, CHAINS_EVENT), locked);
  assert.strictEqual(castSkill(insufficient, CHAINS_EVENT), insufficient);
  assert.strictEqual(castSkill(cooling, CHAINS_EVENT), cooling);
});

test("Given Chains of Dusk, when a rooted creature advances, then it holds for exactly 120 ticks and still attacks in range", () => {
  const base = createInitialState(BALANCE_CONFIG.DEFAULT_SEED).state;
  const cast = castSkill(
    {
      ...base,
      tick: 100,
      phase: "wave",
      activeThreat: creatureThreat(),
      unlockedSkills: ["chains_of_dusk"],
    },
    CHAINS_EVENT,
  );
  const threat = cast.activeThreat;
  if (threat === null) {
    throw new RangeError("Expected the chained threat.");
  }
  const halted = threat.creatures[0];
  assert.equal(halted?.hp, 80);
  assert.equal(halted?.haltedUntilTick, 220);

  const farTarget = [{
    id: "agent_far",
    houseId: "house_a",
    x: 150,
    y: 100,
    hp: 100,
    state: "idle",
  }];
  const held = stepThreat(threat, farTarget, [], 219);
  const resumed = stepThreat(threat, farTarget, [], 220);
  assert.equal(held.threat.creatures[0]?.x, 100);
  assert.ok((resumed.threat.creatures[0]?.x ?? 100) > 100);

  const inRange = stepThreat(
    threat,
    [{
      ...farTarget[0]!,
      id: "agent_near",
      x: 105,
    }],
    [],
    110,
  );
  assert.deepEqual(inRange.agentDamages, [{
    agentId: "agent_near",
    amount: 6,
  }]);
});

test("Given Meteor Fall over a creature and friendly tower, when cast, then both take their exact damage", () => {
  const base = createInitialState(BALANCE_CONFIG.DEFAULT_SEED).state;
  const state = {
    ...base,
    tick: 30,
    phase: "wave" as const,
    activeThreat: creatureThreat(),
    unlockedSkills: ["meteor_fall" as const],
    towers: [{
      id: "tower_a",
      x: 100,
      y: 100,
      hp: 300,
      lastAttackTick: -1,
    }],
  };

  const result = castSkill(state, {
    type: "meteor_fall",
    targetX: 100,
    targetY: 100,
    tick: 30,
  });

  assert.equal(result.activeThreat?.creatures.length, 0);
  assert.equal(result.towers[0]?.hp, 260);
});

test("Given Sanctuary, when living agents are inside, then they heal and cannot break for 200 ticks", () => {
  const base = createInitialState(BALANCE_CONFIG.DEFAULT_SEED).state;
  const agent = base.agents[0];
  if (agent === undefined) {
    throw new RangeError("Expected an agent.");
  }
  const state = {
    ...base,
    tick: 50,
    unlockedSkills: ["sanctuary" as const],
    agents: [{ ...agent, x: 100, y: 100, hp: 20 }],
  };

  const result = castSkill(state, {
    type: "sanctuary",
    targetX: 100,
    targetY: 100,
    tick: 50,
  });

  assert.equal(result.agents[0]?.hp, 80);
  assert.equal(result.agents[0]?.breakImmuneUntilTick, 250);
});

test("Given more than eight fallen regulars and dead heroes, when Resurgence resolves, then eight regulars are round-robin distributed and every hero returns", () => {
  const snapshot = {
    enemies: [],
    towers: [],
    halls: [
      { id: "house_a", x: 0, y: 0, hp: 1 },
      { id: "house_b", x: 10, y: 0, hp: 1 },
      { id: "house_c", x: 20, y: 0, hp: 1 },
    ],
    agents: [
      ...["house_a", "house_b", "house_c"].flatMap((houseId) =>
        Array.from({ length: 4 }, (_, index) => ({
          id: `${houseId}_${index}`,
          houseId,
          x: 0,
          y: 0,
          hp: 0,
          isHero: false,
        })),
      ),
      ...["hero_a", "hero_b", "hero_c"].map((id, index) => ({
        id,
        houseId: `house_${String.fromCharCode(97 + index)}`,
        x: 0,
        y: 0,
        hp: 0,
        isHero: true,
      })),
    ],
  };

  const outcome = resolveSkill(
    {
      type: "resurgence",
      targetX: 0,
      targetY: 0,
      tick: 400,
    },
    snapshot,
  );

  assert.equal(outcome.regularRevives.length, 8);
  assert.deepEqual(
    outcome.regularRevives.map(({ hallId }) => hallId),
    [
      "house_a",
      "house_b",
      "house_c",
      "house_a",
      "house_b",
      "house_c",
      "house_a",
      "house_b",
    ],
  );
  assert.deepEqual(outcome.heroRevives, [
    "hero_a",
    "hero_b",
    "hero_c",
  ]);
});

test("Given Martyr's Ember, when a hero dies, then the death grants exactly four additional divine power", () => {
  const base = createInitialState(BALANCE_CONFIG.DEFAULT_SEED).state;
  const hero = base.agents.find(({ isHero }) => isHero);
  if (hero === undefined) {
    throw new RangeError("Expected a hero.");
  }
  const shared = {
    ...base,
    phase: "wave" as const,
    divinePower: 0,
    agents: [{
      ...hero,
      x: 100,
      y: 100,
      hp: 1,
      lastAttackTick: 0,
    }],
    activeThreat: {
      ...creatureThreat(),
      creatures: creatureThreat().creatures.map((creature) => ({
        ...creature,
        lastAttackTick: -100,
      })),
    },
  };
  const withCard = {
    ...shared,
    houseProgress: shared.houseProgress.map((progress) =>
      progress.houseId === hero.houseId
        ? {
            ...progress,
            cards: [{
              cardId: "legend_martyrs_ember",
              stacks: 1,
            }],
          }
        : progress,
    ),
    houseModifiers: shared.houseModifiers.map((entry) =>
      entry.houseId === hero.houseId
        ? {
            ...entry,
            modifiers: {
              ...entry.modifiers,
              divinePowerPerAgentDeath: 4,
            },
          }
        : entry,
    ),
  };

  const withoutResult = advanceTick(
    shared,
    createRng(BALANCE_CONFIG.DEFAULT_SEED),
  );
  const withResult = advanceTick(
    withCard,
    createRng(BALANCE_CONFIG.DEFAULT_SEED),
  );

  assert.equal(withResult.agents[0]?.hp, 0);
  assert.equal(
    withResult.divinePower - withoutResult.divinePower,
    4,
  );
});
