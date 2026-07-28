import assert from "node:assert/strict";
import test from "node:test";
import { createRunSummary } from "../src/engine/runSummary";
import { createInitialState } from "../src/engine/tick";

test("Given a terminal configured run, when its summary is produced, then it contains only exact plain run facts", () => {
  const initial = createInitialState(901, [
    "house_a",
    "house_e",
    "house_b",
  ]).state;
  const state = {
    ...initial,
    tick: 1_234,
    phase: "victory" as const,
    waveIndex: 2,
    agents: initial.agents.map((agent, index) =>
      index < 7 ? { ...agent, hp: 0, state: "dead" as const } : agent,
    ),
    halls: initial.halls.map((hall, index) =>
      index === 0 ? { ...hall, hp: 0 } : hall,
    ),
    shopPurchases: {
      ...initial.shopPurchases,
      raise_tower: 2,
    },
    betrayalHouseId: "house_a" as const,
    heroLessWave2Clear: true,
    daylightRaidWaveNumbers: [2],
  };

  const summary = createRunSummary(state);

  assert.deepEqual(summary, {
    runId: "901:house_a,house_e,house_b:1234",
    selectedHouseIds: ["house_a", "house_e", "house_b"],
    wavesCleared: 3,
    bestWaveReached: 3,
    victory: true,
    agentsStarted: initial.agents.length,
    survivingAgents: initial.agents.length - 7,
    agentsLost: 7,
    hallsStarted: 3,
    survivingHalls: 2,
    towersBuilt: 2,
    noTowers: false,
    allHallsStanding: false,
    heroLessWave2Clear: true,
    betrayal: { traitorHouseId: "house_a" },
    daylightRaidWaveNumbers: [2],
    discoveredSynergyIds: ["ash_and_iron"],
    populationHistory: [],
  });
  assert.equal(
    Object.values(summary).some((value) => value === state),
    false,
  );
});

test("Given a nonterminal run, when summary production is attempted, then it fails closed", () => {
  const state = createInitialState(902).state;

  assert.throws(
    () => createRunSummary(state),
    /terminal/,
  );
});
