import assert from "node:assert/strict";
import test from "node:test";
import {
  decideIntent,
  intentToState,
  type AgentIntent,
} from "../src/agents/dispositionEngine";
import { stepAgent } from "../src/agents/movement";
import { BALANCE_CONFIG } from "../src/content/balanceConfig";
import {
  context,
  createAgent,
  createCountingRng,
  threat,
} from "./dispositionFixtures";

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
