import assert from "node:assert/strict";
import test from "node:test";
import {
  decideIntent,
  intentToState,
  type AgentIntent,
  type DefenseContext,
} from "../src/agents/dispositionEngine";
import { stepAgent } from "../src/agents/movement";
import { advanceWaveCombat } from "../src/engine/invasionCombat";
import type {
  Agent,
  ThreatPresence,
} from "../src/agents/agentTypes";
import { BALANCE_CONFIG } from "../src/content/balanceConfig";
import { HOUSE_SPAWN_SLOTS } from "../src/content/houseConfig";
import { createInitialState } from "../src/engine/tick";
import type { Rng } from "../src/content/random";
import { createRng } from "../src/engine/prng";

function createAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: "house_a_00",
    houseId: "house_a",
    unitClass: "melee",
    disposition: { aggression: 80, loyalty: 40 },
    x: 100,
    y: 100,
    heading: 0,
    state: "idle",
    hp: BALANCE_CONFIG.INITIAL_HP,
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

function threat(
  id: string,
  x: number,
  y: number,
  hostile = true,
): ThreatPresence {
  return { id, x, y, hostile };
}

function context(
  overrides: Partial<DefenseContext> = {},
): DefenseContext {
  return {
    ownHall: { x: 100, y: 100, hp: BALANCE_CONFIG.HALL_HP },
    rallyHall: { x: 100, y: 100 },
    threatenedHalls: [],
    threats: [],
    ...overrides,
  };
}

function createCountingRng(): {
  readonly rng: Rng;
  readonly count: () => number;
} {
  let draws = 0;
  const next = () => {
    draws += 1;
    return 0.5;
  };

  return {
    rng: {
      next,
      range(min, max) {
        return min + next() * (max - min);
      },
      int(minInclusive, maxExclusive) {
        return Math.floor(
          minInclusive + next() * (maxExclusive - minInclusive),
        );
      },
      pick<T>(items: readonly T[]) {
        const item = items[this.int(0, items.length)];
        if (item === undefined) {
          throw new RangeError("Cannot pick from an empty array.");
        }
        return item;
      },
    },
    count: () => draws,
  };
}

test("Given a destroyed own hall, when another hall is threatened, then the agent reinforces it", () => {
  const nearbyRallyThreat = threat("creature_b", 710, 100);
  const intent = decideIntent(
    createAgent(),
    context({
      ownHall: null,
      rallyHall: { x: 700, y: 100 },
      threatenedHalls: [{
        houseId: "house_b",
        x: 700,
        y: 100,
        hostileCount: 1,
      }],
      threats: [nearbyRallyThreat],
    }),
    false,
  );

  assert.deepEqual(intent, {
    kind: "engage",
    towardX: nearbyRallyThreat.x,
    towardY: nearbyRallyThreat.y,
    targetId: nearbyRallyThreat.id,
    preferredRange: 13,
    helping: true,
  });
});

test("Given another hall under heavier pressure, when reinforcement is considered, then only aggressive agents help it", () => {
  const threats = [
    threat("creature_b_far", 760, 100),
    threat("creature_b_near", 710, 100),
    threat("creature_c", 500, 500),
  ];
  const defense = context({
    threatenedHalls: [
      { houseId: "house_c", x: 500, y: 500, hostileCount: 1 },
      { houseId: "house_b", x: 700, y: 100, hostileCount: 2 },
    ],
    threats,
  });

  const reinforcing = decideIntent(
    createAgent({
      disposition: {
        aggression: BALANCE_CONFIG.AGENT_REINFORCE_AGGRESSION_THRESHOLD,
        loyalty: 40,
      },
    }),
    defense,
    false,
  );
  const holding = decideIntent(
    createAgent({
      disposition: {
        aggression:
          BALANCE_CONFIG.AGENT_REINFORCE_AGGRESSION_THRESHOLD - 1,
        loyalty: 40,
      },
    }),
    defense,
    false,
  );

  assert.deepEqual(reinforcing, {
    kind: "engage",
    towardX: 710,
    towardY: 100,
    targetId: "creature_b_near",
    preferredRange: 13,
    helping: true,
  });
  assert.deepEqual(holding, { kind: "idle" });
  assert.equal(intentToState(reinforcing), "helping");
});

test("Given equally threatened foreign halls, when reinforcement is chosen, then the lower house id wins", () => {
  const intent = decideIntent(
    createAgent(),
    context({
      threatenedHalls: [
        { houseId: "house_c", x: 500, y: 500, hostileCount: 2 },
        { houseId: "house_b", x: 700, y: 100, hostileCount: 2 },
      ],
      threats: [
        threat("creature_b", 710, 100),
        threat("creature_c", 510, 500),
      ],
    }),
    false,
  );

  assert.equal(intent.kind === "engage" ? intent.targetId : null, "creature_b");
});

test("Given a distant defender, when a threat nears its hall, then hall defense overrides personal distance", () => {
  const hallThreat = threat("creature_a", 110, 100);
  const intent = decideIntent(
    createAgent({ x: 510 }),
    context({ threats: [hallThreat] }),
    false,
  );

  assert.equal(intent.kind, "engage");
  assert.equal(intent.kind === "engage" ? intent.targetId : null, "creature_a");
});

test("Given multiple hall attackers, when defense is chosen, then agents focus the nearest attacker with id ties ascending", () => {
  const intent = decideIntent(
    createAgent({ x: 500 }),
    context({
      threats: [
        threat("creature_z", 70, 100),
        threat("creature_b", 115, 100),
        threat("creature_a", 85, 100),
      ],
    }),
    false,
  );

  assert.equal(intent.kind === "engage" ? intent.targetId : null, "creature_a");
});

test("Given the concentrated stronghold, when one hall is threatened, then living regulars from all three houses defend it", () => {
  const [north] = HOUSE_SPAWN_SLOTS;
  if (north === undefined) {
    throw new RangeError("Expected north spawn slot.");
  }
  const initial = createInitialState(802, [
    "house_a",
    "house_b",
    "house_c",
  ]).state;
  const combat = advanceWaveCombat(
    {
      ...initial,
      phase: "wave",
      activeThreat: {
        type: "monster_horde",
        waveIndex: 0,
        startTick: 0,
        daylightRaid: false,
        traitorHouseId: null,
        creatures: [
          {
            id: "creature_near_north",
            x: north.x,
            y: north.y,
            hp: BALANCE_CONFIG.CREATURE_HP,
            agentDamage: BALANCE_CONFIG.CREATURE_ATTACK_DAMAGE,
            hallDamage: BALANCE_CONFIG.CREATURE_HALL_DAMAGE,
            lastAttackTick: -1,
            haltedUntilTick: -1,
          },
        ],
        mage: null,
      },
    },
    1,
    createRng(802),
  );

  assert.deepEqual(
    new Set(
      combat.agents
        .filter(
          ({ isHero, state }) =>
            !isHero && (state === "fighting" || state === "helping"),
        )
        .map(({ houseId }) => houseId),
    ),
    new Set(["house_a", "house_b", "house_c"]),
  );
});

test("Given the concentrated stronghold, when a threat is outside every hall defense radius, then it does not produce the three-house defense set", () => {
  const initial = createInitialState(803, [
    "house_a",
    "house_b",
    "house_c",
  ]).state;
  const farThreat = { x: 20, y: 20 };
  assert.ok(
    initial.halls.every(
      (hall) =>
        Math.hypot(hall.x - farThreat.x, hall.y - farThreat.y) >
        BALANCE_CONFIG.HALL_DEFENSE_RADIUS,
    ),
  );
  const combat = advanceWaveCombat(
    {
      ...initial,
      phase: "wave",
      activeThreat: {
        type: "monster_horde",
        waveIndex: 0,
        startTick: 0,
        daylightRaid: false,
        traitorHouseId: null,
        creatures: [
          {
            id: "creature_far_from_stronghold",
            x: farThreat.x,
            y: farThreat.y,
            hp: BALANCE_CONFIG.CREATURE_HP,
            agentDamage: BALANCE_CONFIG.CREATURE_ATTACK_DAMAGE,
            hallDamage: BALANCE_CONFIG.CREATURE_HALL_DAMAGE,
            lastAttackTick: -1,
            haltedUntilTick: -1,
          },
        ],
        mage: null,
      },
    },
    1,
    createRng(803),
  );
  const defendingHouseIds = new Set(
    combat.agents
      .filter(
        ({ isHero, state }) =>
          !isHero && (state === "fighting" || state === "helping"),
      )
      .map(({ houseId }) => houseId),
  );

  assert.notDeepEqual(
    defendingHouseIds,
    new Set(["house_a", "house_b", "house_c"]),
  );
});

test("Given low health, when break thresholds are evaluated, then only a timid agent below the HP boundary flees", () => {
  const threats = [threat("creature_a", 110, 100)];
  const broken = decideIntent(
    createAgent({
      hp: BALANCE_CONFIG.INITIAL_HP * 0.34,
      disposition: { aggression: 59, loyalty: 80 },
    }),
    context({ rallyHall: { x: 20, y: 100 }, threats }),
    false,
  );
  const healthy = decideIntent(
    createAgent({ disposition: { aggression: 59, loyalty: 80 } }),
    context({ rallyHall: { x: 20, y: 100 }, threats }),
    false,
  );
  const resolute = decideIntent(
    createAgent({
      hp: BALANCE_CONFIG.INITIAL_HP * 0.34,
      disposition: { aggression: 60, loyalty: 80 },
    }),
    context({ rallyHall: { x: 20, y: 100 }, threats }),
    false,
  );

  assert.equal(broken.kind, "flee");
  assert.equal(healthy.kind, "engage");
  assert.equal(resolute.kind, "engage");
});

test("Given a broken agent and a rally hall, when retreating, then it flees toward the hall", () => {
  const intent = decideIntent(
    createAgent({
      hp: BALANCE_CONFIG.INITIAL_HP * 0.34,
      disposition: { aggression: 20, loyalty: 80 },
    }),
    context({
      rallyHall: { x: 20, y: 100 },
      threats: [threat("creature_a", 110, 100)],
    }),
    false,
  );

  assert.deepEqual(intent, {
    kind: "flee",
    towardX: 20,
    towardY: 100,
  });
});

test("Given no rally hall, when a broken agent retreats, then it moves away from the nearest threat", () => {
  const intent = decideIntent(
    createAgent({
      hp: BALANCE_CONFIG.INITIAL_HP * 0.34,
      disposition: { aggression: 20, loyalty: 80 },
    }),
    context({
      ownHall: null,
      rallyHall: null,
      threats: [threat("creature_a", 110, 100)],
    }),
    false,
  );

  assert.deepEqual(intent, {
    kind: "flee",
    towardX: 90,
    towardY: 100,
  });
});

test("Given a disloyal traitor-house agent, when danger is sensed, then betrayal still overrides aggression", () => {
  const intent = decideIntent(
    createAgent(),
    context({ threats: [threat("creature_a", 110, 100)] }),
    true,
  );

  assert.deepEqual(intent, {
    kind: "flee",
    towardX: 90,
    towardY: 100,
  });
});

test("Given a broken disloyal hero, when danger is sensed, then it never flees", () => {
  const intent = decideIntent(
    createAgent({
      isHero: true,
      heroId: "hero_ashvale",
      hp: 1,
      disposition: { aggression: 0, loyalty: 0 },
    }),
    context({ threats: [threat("creature_a", 110, 100)] }),
    true,
  );

  assert.notEqual(intent.kind, "flee");
});

test("Given an agent beyond its home leash, when it moves for 50 ticks, then it gets closer to its hall", () => {
  const home = { x: 100, y: 100, hp: BALANCE_CONFIG.HALL_HP };
  const intent = decideIntent(
    createAgent({ x: 700 }),
    context({ ownHall: home, rallyHall: home }),
    false,
  );
  const rng = createCountingRng();
  let moved = createAgent({ x: 700 });

  for (let tick = 0; tick < 50; tick += 1) {
    moved = stepAgent(moved, rng.rng, intent);
  }

  assert.ok(Math.abs(moved.x - home.x) < 600);
  assert.equal(rng.count(), 0);
});

test("Given every intent variant, when mapped and moved, then directed paths consume zero RNG draws", () => {
  const intents: readonly AgentIntent[] = [
    { kind: "idle" },
    { kind: "flee", towardX: 0, towardY: 0 },
    {
      kind: "engage",
      towardX: 200,
      towardY: 100,
      targetId: null,
      preferredRange: 13,
    },
  ];
  const fleeRng = createCountingRng();
  const engageRng = createCountingRng();
  const agent = createAgent();

  const fleeing = stepAgent(agent, fleeRng.rng, intents[1]);
  const engaging = stepAgent(agent, engageRng.rng, intents[2]);

  assert.deepEqual(intents.map(intentToState), ["idle", "fleeing", "fighting"]);
  assert.equal(fleeRng.count(), 0);
  assert.equal(engageRng.count(), 0);
  assert.ok(fleeing.x < agent.x);
  assert.ok(engaging.x > agent.x);
});
