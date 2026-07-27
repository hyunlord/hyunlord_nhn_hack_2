import assert from "node:assert/strict";
import test from "node:test";
import type { RunSummary } from "../src/content/runSummary";
import {
  applyRunSummaryToMeta,
  calculateLegacyReward,
  createDefaultMetaState,
  legacyForRun,
  purchaseHouseUnlock,
} from "../src/meta/legacy";
import { evaluateNewAchievements } from "../src/meta/achievements";
import {
  loadMetaState,
  META_STORAGE_KEY,
  saveMetaState,
  type StorageLike,
} from "../src/meta/persistence";

function summary(overrides: Partial<RunSummary> = {}): RunSummary {
  return {
    runId: "run-1",
    selectedHouseIds: ["house_a", "house_b", "house_c"],
    wavesCleared: 1,
    bestWaveReached: 2,
    victory: false,
    agentsStarted: 63,
    survivingAgents: 20,
    agentsLost: 43,
    hallsStarted: 3,
    survivingHalls: 2,
    towersBuilt: 1,
    noTowers: false,
    allHallsStanding: false,
    heroLessWave2Clear: false,
    betrayal: null,
    discoveredSynergyIds: [],
    ...overrides,
  };
}

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

test("Given no prior save, when meta state is created, then only the original trio starts unlocked", () => {
  const state = createDefaultMetaState();

  assert.deepEqual(state, {
    version: 1,
    legacyPoints: 0,
    unlockedHouses: ["house_a", "house_b", "house_c"],
    unlockedAchievements: [],
    discoveredSynergies: [],
    runsPlayed: 0,
    bestWaveReached: 0,
    victories: 0,
    processedRunIds: [],
  });
});

test("Given a run result, when legacy is calculated, then the exact itemized formula is used", () => {
  const run = summary({
    wavesCleared: 3,
    victory: true,
    survivingAgents: 12,
    survivingHalls: 2,
  });
  const reward = calculateLegacyReward(run);

  assert.deepEqual(reward, {
    base: 20,
    waves: 75,
    victory: 60,
    survivingAgents: 12,
    survivingHalls: 30,
    total: 197,
  });
  assert.equal(legacyForRun(run), 197);
});

test("Given missing, corrupt, or mismatched persisted data, when loading, then safe defaults are returned", () => {
  const storage = new MemoryStorage();
  const defaults = createDefaultMetaState();

  assert.deepEqual(loadMetaState(storage), defaults);
  storage.values.set(META_STORAGE_KEY, "{not-json");
  assert.deepEqual(loadMetaState(storage), defaults);
  storage.values.set(META_STORAGE_KEY, JSON.stringify({ ...defaults, version: 2 }));
  assert.deepEqual(loadMetaState(storage), defaults);
});

test("Given valid persisted meta, when saved and loaded, then its versioned state round-trips", () => {
  const storage = new MemoryStorage();
  const state = {
    ...createDefaultMetaState(),
    legacyPoints: 420,
    runsPlayed: 3,
    bestWaveReached: 4,
  };

  saveMetaState(storage, state);

  assert.deepEqual(loadMetaState(storage), state);
});

test("Given enough legacy, when Duskmere is purchased twice, then only the first purchase spends points", () => {
  const initial = { ...createDefaultMetaState(), legacyPoints: 650 };

  const first = purchaseHouseUnlock(initial, "house_d");
  const second = purchaseHouseUnlock(first.state, "house_d");

  assert.equal(first.kind, "purchased");
  assert.equal(first.state.legacyPoints, 350);
  assert.ok(first.state.unlockedHouses.includes("house_d"));
  assert.deepEqual(second, { kind: "already_unlocked", state: first.state });
});

test("Given insufficient legacy, when a house purchase is attempted, then no points or unlocks change", () => {
  const initial = { ...createDefaultMetaState(), legacyPoints: 299 };
  const result = purchaseHouseUnlock(initial, "house_d");

  assert.deepEqual(result, { kind: "insufficient_legacy", state: initial });
});

test("Given milestone-gated houses, when purchases are attempted, then wave and victory prerequisites are enforced", () => {
  const pointsOnly = { ...createDefaultMetaState(), legacyPoints: 1_000 };
  const waveReady = { ...pointsOnly, bestWaveReached: 3 };
  const victoryReady = { ...pointsOnly, victories: 1 };

  assert.equal(purchaseHouseUnlock(pointsOnly, "house_e").kind, "prerequisite_locked");
  assert.equal(purchaseHouseUnlock(waveReady, "house_e").kind, "purchased");
  assert.equal(purchaseHouseUnlock(pointsOnly, "house_f").kind, "prerequisite_locked");
  assert.equal(purchaseHouseUnlock(victoryReady, "house_f").kind, "purchased");
});

test("Given each achievement condition, when its run is processed, then the exact one-time reward is granted", () => {
  const cases = [
    {
      id: "first_stand",
      reward: 25,
      run: summary(),
    },
    {
      id: "unbroken",
      reward: 75,
      run: summary({ victory: true, survivingHalls: 3 }),
    },
    {
      id: "pyrrhic",
      reward: 50,
      run: summary({ victory: true, survivingAgents: 9 }),
    },
    {
      id: "no_towers",
      reward: 60,
      run: summary({ victory: true, towersBuilt: 0 }),
    },
    {
      id: "hero_less",
      reward: 50,
      run: summary({ wavesCleared: 2, heroLessWave2Clear: true }),
    },
    {
      id: "betrayed",
      reward: 0,
      run: summary({ betrayal: { traitorHouseId: "house_a" } }),
    },
  ] as const;

  for (const fixture of cases) {
    const eligiblePriorAchievements = cases
      .filter(({ id }) => id !== fixture.id)
      .map(({ id }) => id);
    const initial = {
      ...createDefaultMetaState(),
      unlockedAchievements: eligiblePriorAchievements,
    };
    const result = applyRunSummaryToMeta(initial, fixture.run);
    const runReward = calculateLegacyReward(fixture.run).total;

    assert.ok(result.state.unlockedAchievements.includes(fixture.id), fixture.id);
    assert.equal(result.achievementLegacyEarned, fixture.reward, fixture.id);
    assert.equal(result.state.legacyPoints, runReward + fixture.reward, fixture.id);
  }
});

test("Given each conditional achievement is one fact short, when achievements are evaluated, then none fires early", () => {
  const cases = [
    {
      id: "unbroken",
      run: summary({ victory: false, survivingHalls: 3 }),
    },
    {
      id: "pyrrhic",
      run: summary({ victory: true, survivingAgents: 10 }),
    },
    {
      id: "no_towers",
      run: summary({ victory: true, towersBuilt: 1 }),
    },
    {
      id: "hero_less",
      run: summary({ wavesCleared: 1, heroLessWave2Clear: true }),
    },
    {
      id: "betrayed",
      run: summary({ betrayal: null }),
    },
  ] as const;

  for (const fixture of cases) {
    const earned = evaluateNewAchievements(fixture.run, ["first_stand"]);
    assert.equal(earned.includes(fixture.id), false, fixture.id);
  }
});

test("Given betrayal is observed, when the summary is processed, then house e unlocks for free", () => {
  const result = applyRunSummaryToMeta(
    createDefaultMetaState(),
    summary({ betrayal: { traitorHouseId: "house_f" } }),
  );

  assert.ok(result.state.unlockedHouses.includes("house_e"));
  assert.equal(result.state.legacyPoints, result.runLegacy.total + 25);
});

test("Given one run summary, when it is applied repeatedly, then counters, rewards, and discoveries update atomically once", () => {
  const run = summary({
    runId: "unique-run",
    bestWaveReached: 4,
    victory: true,
    discoveredSynergyIds: [
      "swift_fury",
      "hidden_ironflame",
      "swift_fury",
    ],
  });
  const first = applyRunSummaryToMeta(createDefaultMetaState(), run);
  const second = applyRunSummaryToMeta(first.state, run);

  assert.equal(first.kind, "applied");
  assert.equal(first.state.runsPlayed, 1);
  assert.equal(first.state.victories, 1);
  assert.equal(first.state.bestWaveReached, 4);
  assert.deepEqual(first.state.discoveredSynergies, [
    "swift_fury",
    "hidden_ironflame",
  ]);
  assert.deepEqual(first.state.processedRunIds, ["unique-run"]);
  assert.deepEqual(second, {
    kind: "already_processed",
    state: first.state,
    runLegacy: {
      base: 0,
      waves: 0,
      victory: 0,
      survivingAgents: 0,
      survivingHalls: 0,
      total: 0,
    },
    newAchievementIds: [],
    achievementLegacyEarned: 0,
  });
});
