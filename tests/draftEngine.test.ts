import assert from "node:assert/strict";
import test from "node:test";
import { createRng } from "../src/engine/prng";
import {
  applyProgressionAwards,
  chooseDraftCard,
} from "../src/engine/progressionEngine";
import { advanceTick, createInitialState } from "../src/engine/tick";

test("Given 499 XP and two damage XP, when progression applies, then exactly one level and draft are created", () => {
  const initial = createInitialState(5).state;
  const state = {
    ...initial,
    houseProgress: initial.houseProgress.map((progress) =>
      progress.houseId === "house_a"
        ? { ...progress, xp: 499 }
        : progress,
    ),
  };

  const result = applyProgressionAwards(
    state,
    [{ houseId: "house_a", xp: 2 }],
    createRng(9),
  );

  assert.equal(result.phase, "draft");
  assert.equal(result.phaseBeforeDraft, "preparation");
  assert.equal(result.houseProgress[0]?.level, 2);
  assert.equal(result.houseProgress[0]?.xp, 501);
  assert.equal(result.pendingDrafts.length, 1);
  assert.equal(result.pendingDrafts[0]?.level, 2);
});

test("Given one award crosses two thresholds, when progression applies, then two offers queue in level order", () => {
  const initial = createInitialState(5).state;
  const state = {
    ...initial,
    houseProgress: initial.houseProgress.map((progress) =>
      progress.houseId === "house_a"
        ? { ...progress, xp: 499 }
        : progress,
    ),
  };

  const result = applyProgressionAwards(
    state,
    [{ houseId: "house_a", xp: 701 }],
    createRng(9),
  );

  assert.equal(result.houseProgress[0]?.level, 3);
  assert.deepEqual(
    result.pendingDrafts.map(({ level }) => level),
    [2, 3],
  );
  const offeredCardIds = result.pendingDrafts.flatMap(
    ({ cardIds }) => cardIds,
  );
  assert.equal(
    new Set(offeredCardIds).size,
    offeredCardIds.length,
  );
});

test("Given simultaneous level-ups in reversed award order, when progression applies, then offers queue by house id", () => {
  const initial = createInitialState(5).state;
  const result = applyProgressionAwards(
    initial,
    [
      { houseId: "house_c", xp: 500 },
      { houseId: "house_a", xp: 500 },
    ],
    createRng(11),
  );

  assert.deepEqual(
    result.pendingDrafts.map(({ houseId }) => houseId),
    ["house_a", "house_c"],
  );
});

test("Given a mismatched or unavailable draft selection, when chosen, then the exact state reference is rejected", () => {
  const initial = createInitialState(5).state;
  const drafted = applyProgressionAwards(
    initial,
    [{ houseId: "house_a", xp: 500 }],
    createRng(11),
  );
  const head = drafted.pendingDrafts[0];
  if (head === undefined) {
    throw new RangeError("Expected a draft fixture.");
  }

  assert.strictEqual(
    chooseDraftCard(drafted, "wrong-offer", head.cardIds[0] ?? ""),
    drafted,
  );
  assert.strictEqual(
    chooseDraftCard(drafted, head.id, "unavailable-card"),
    drafted,
  );
});

test("Given queued drafts, when the head is selected, then cards stack FIFO and the previous phase resumes only after the queue empties", () => {
  const initial = createInitialState(5).state;
  const drafted = applyProgressionAwards(
    initial,
    [{ houseId: "house_a", xp: 1200 }],
    createRng(11),
  );
  const first = drafted.pendingDrafts[0];
  if (first === undefined || first.cardIds[0] === undefined) {
    throw new RangeError("Expected a selectable draft fixture.");
  }

  const afterFirst = chooseDraftCard(drafted, first.id, first.cardIds[0]);
  const second = afterFirst.pendingDrafts[0];
  if (second === undefined || second.cardIds[0] === undefined) {
    throw new RangeError("Expected a second draft fixture.");
  }
  const afterSecond = chooseDraftCard(
    afterFirst,
    second.id,
    second.cardIds[0],
  );

  assert.equal(afterFirst.phase, "draft");
  assert.equal(afterFirst.pendingDrafts.length, 1);
  assert.equal(afterSecond.phase, "preparation");
  assert.equal(afterSecond.phaseBeforeDraft, null);
  assert.equal(afterSecond.pendingDrafts.length, 0);
  assert.equal(
    afterSecond.houseProgress[0]?.cards.reduce(
      (sum, { stacks }) => sum + stacks,
      0,
    ),
    2,
  );
});

test("Given draft phase, when ticks advance, then only tick and effect expiry change while positions remain frozen", () => {
  const initial = createInitialState(5).state;
  const drafted = applyProgressionAwards(
    initial,
    [{ houseId: "house_a", xp: 500 }],
    createRng(11),
  );

  const result = advanceTick(drafted, createRng(99));

  assert.equal(result.tick, drafted.tick + 1);
  assert.deepEqual(result.agents, drafted.agents);
  assert.deepEqual(result.halls, drafted.halls);
  assert.deepEqual(result.activeThreat, drafted.activeThreat);
  assert.equal(result.divinePower, drafted.divinePower);
});

test("Given identical state and award inputs, when progression reduces twice, then outputs match without input mutation", () => {
  const initial = createInitialState(5).state;
  const snapshot = structuredClone(initial);
  const first = applyProgressionAwards(
    initial,
    [{ houseId: "house_a", xp: 500 }],
    createRng(33),
  );
  const second = applyProgressionAwards(
    initial,
    [{ houseId: "house_a", xp: 500 }],
    createRng(33),
  );

  assert.deepEqual(first, second);
  assert.deepEqual(initial, snapshot);
});

test("Given a max-HP card offer, when selected, then its house gains the modifier and living agents heal by the exact cap increase", () => {
  const initial = createInitialState(5).state;
  const houseAgent = initial.agents.find(
    ({ houseId }) => houseId === "house_a",
  );
  if (houseAgent === undefined) {
    throw new RangeError("Expected a house agent fixture.");
  }
  const state = {
    ...initial,
    phase: "draft" as const,
    phaseBeforeDraft: "wave" as const,
    agents: initial.agents.map((agent) =>
      agent.id === houseAgent.id ? { ...agent, hp: 50 } : agent,
    ),
    pendingDrafts: [{
      id: "manual_offer",
      houseId: "house_a",
      level: 2,
      cardIds: ["common_hardened_flesh"],
    }],
  };

  const result = chooseDraftCard(
    state,
    "manual_offer",
    "common_hardened_flesh",
  );
  const modifiers = result.houseModifiers.find(
    ({ houseId }) => houseId === "house_a",
  )?.modifiers;

  assert.equal(result.phase, "wave");
  assert.equal(modifiers?.maxHpBonus, 25);
  assert.equal(
    result.agents.find(({ id }) => id === houseAgent.id)?.hp,
    75,
  );
});
