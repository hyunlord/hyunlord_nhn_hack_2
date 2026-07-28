import assert from "node:assert/strict";
import test from "node:test";
import type { Agent, ThreatPresence } from "../src/agents/agentTypes";
import {
  decideIntent,
  intentToState,
  type DefenseContext,
} from "../src/agents/dispositionEngine";
import { BALANCE_CONFIG } from "../src/content/balanceConfig";

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

function threat(id: string, x: number, y: number, hostile = true): ThreatPresence {
  return { id, x, y, hostile };
}

function context(overrides: Partial<DefenseContext> = {}): DefenseContext {
  return {
    ownAnchor: { x: 100, y: 100, hp: BALANCE_CONFIG.BANNER_HP },
    rallyAnchor: { x: 100, y: 100 },
    threatenedAnchors: [],
    threats: [],
    ...overrides,
  };
}

test("Given a destroyed own banner, when another anchor is threatened, then the agent reinforces it", () => {
  const nearbyRallyThreat = threat("creature_b", 710, 100);
  const intent = decideIntent(
    createAgent(),
    context({
      ownAnchor: null,
      rallyAnchor: { x: 700, y: 100 },
      threatenedAnchors: [{
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

test("Given another anchor under heavier pressure, when reinforcement is considered, then only aggressive agents help it", () => {
  const threats = [
    threat("creature_b_far", 760, 100),
    threat("creature_b_near", 710, 100),
    threat("creature_c", 500, 500),
  ];
  const defense = context({
    threatenedAnchors: [
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

test("Given equally threatened foreign anchors, when reinforcement is chosen, then the lower house id wins", () => {
  const intent = decideIntent(
    createAgent(),
    context({
      threatenedAnchors: [
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

test("Given a distant defender, when a threat nears its banner, then anchor defense overrides personal distance", () => {
  const bannerThreat = threat("creature_a", 110, 100);
  const intent = decideIntent(
    createAgent({ x: 510 }),
    context({ threats: [bannerThreat] }),
    false,
  );

  assert.equal(intent.kind, "engage");
  assert.equal(intent.kind === "engage" ? intent.targetId : null, "creature_a");
});

test("Given multiple banner attackers, when defense is chosen, then agents focus the nearest attacker with id ties ascending", () => {
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

test("Given a personal threat away from anchors and a centroid battle line, when defense is chosen, then nearby aggro wins", () => {
  const personalThreat = threat("creature_personal", 510, 100);
  const intent = decideIntent(
    createAgent({ x: 500, y: 100 }),
    context({
      ownAnchor: { x: 100, y: 100, hp: BALANCE_CONFIG.BANNER_HP },
      rallyAnchor: { x: 900, y: 100 },
      threatenedAnchors: [
        { houseId: "house_b", x: 900, y: 100, hostileCount: 1 },
      ],
      threats: [personalThreat],
      battleLine: {
        target: { x: 300, y: 300 },
        direction: { x: 1, y: 0 },
        threatSource: { kind: "nearby-centroid" },
        targetId: null,
        desiredRank: 78,
        lateralDisplacement: 0,
        jitterDisplacement: 0,
        jitter: 0,
        fractured: false,
        posture: "engage",
        formation: { lineSpacing: 10, cohesion: 0.4 },
      },
    }),
    false,
  );

  assert.deepEqual(intent, {
    kind: "engage",
    towardX: personalThreat.x,
    towardY: personalThreat.y,
    targetId: personalThreat.id,
    preferredRange: 13,
  });
});
