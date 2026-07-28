import assert from "node:assert/strict";
import test from "node:test";
import {
  decideIntent,
  intentToState,
} from "../src/agents/dispositionEngine";
import { BALANCE_CONFIG } from "../src/content/balanceConfig";
import {
  context,
  createAgent,
  threat,
} from "./dispositionFixtures";

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
