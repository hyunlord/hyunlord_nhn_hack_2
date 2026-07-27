import assert from "node:assert/strict";
import test from "node:test";
import type { RunSummary } from "../src/content/runSummary";
import {
  appReducer,
  createInitialAppState,
} from "../src/state/appFlow";
import { createDefaultMetaState } from "../src/meta/legacy";
import {
  activeBonusGroups,
  legacyRiteGroups,
  purchaseInvestmentLabel,
} from "../src/ui/investmentSummary";

function summary(runId = "run-1"): RunSummary {
  return {
    runId,
    selectedHouseIds: ["house_a", "house_b", "house_c"],
    wavesCleared: 2,
    bestWaveReached: 3,
    victory: false,
    agentsStarted: 63,
    survivingAgents: 21,
    agentsLost: 42,
    hallsStarted: 3,
    survivingHalls: 2,
    towersBuilt: 2,
    noTowers: false,
    allHallsStanding: false,
    heroLessWave2Clear: false,
    betrayal: null,
    discoveredSynergyIds: [],
    populationHistory: [],
  };
}

test("Given a fresh app, when it starts, then meta is the entry phase and no run state is configured", () => {
  const state = createInitialAppState(createDefaultMetaState(), 100);

  assert.equal(state.appPhase, "meta");
  assert.deepEqual(state.selectedHouseIds, []);
  assert.equal(state.runSeed, null);
  assert.equal(state.summary, null);
});

test("Given only default unlocks, when selection changes, then locked houses and a fourth pick are rejected while order is retained", () => {
  let state = appReducer(
    createInitialAppState(createDefaultMetaState(), 100),
    { type: "beginSelection" },
  );
  state = appReducer(state, { type: "toggleHouse", houseId: "house_c" });
  state = appReducer(state, { type: "toggleHouse", houseId: "house_a" });
  state = appReducer(state, { type: "toggleHouse", houseId: "house_f" });
  state = appReducer(state, { type: "toggleHouse", houseId: "house_b" });
  const full = appReducer(state, {
    type: "toggleHouse",
    houseId: "house_d",
  });

  assert.deepEqual(full.selectedHouseIds, [
    "house_c",
    "house_a",
    "house_b",
  ]);
  assert.strictEqual(full, state);
});

test("Given fewer than three picks, when confirmation is requested, then the app remains on selection", () => {
  let state = appReducer(
    createInitialAppState(createDefaultMetaState(), 100),
    { type: "beginSelection" },
  );
  state = appReducer(state, { type: "toggleHouse", houseId: "house_a" });
  state = appReducer(state, { type: "toggleHouse", houseId: "house_b" });

  assert.strictEqual(
    appReducer(state, { type: "confirmSelection" }),
    state,
  );
});

test("Given three ordered picks, when confirmed, then a fresh deterministic seed starts the run", () => {
  let state = appReducer(
    createInitialAppState(createDefaultMetaState(), 100),
    { type: "beginSelection" },
  );
  for (const houseId of ["house_b", "house_c", "house_a"] as const) {
    state = appReducer(state, { type: "toggleHouse", houseId });
  }
  state = appReducer(state, { type: "confirmSelection" });

  assert.equal(state.appPhase, "run");
  assert.equal(state.runSeed, 100);
  assert.deepEqual(state.selectedHouseIds, [
    "house_b",
    "house_c",
    "house_a",
  ]);
});

test("Given a terminal summary, when completion is delivered twice, then meta rewards persist exactly once", () => {
  let state = createInitialAppState(createDefaultMetaState(), 100);
  state = appReducer(state, { type: "beginSelection" });
  for (const houseId of ["house_a", "house_b", "house_c"] as const) {
    state = appReducer(state, { type: "toggleHouse", houseId });
  }
  state = appReducer(state, { type: "confirmSelection" });
  const completed = appReducer(state, {
    type: "completeRun",
    summary: summary(),
  });
  const duplicate = appReducer(completed, {
    type: "completeRun",
    summary: summary(),
  });

  assert.equal(completed.appPhase, "summary");
  assert.equal(completed.meta.runsPlayed, 1);
  assert.ok(completed.meta.legacyPoints > 0);
  assert.strictEqual(duplicate, completed);
});

test("Given a completed run, when retry is chosen, then the same trio runs with a fresh seed", () => {
  const initial = {
    ...createInitialAppState(createDefaultMetaState(), 100),
    appPhase: "summary" as const,
    selectedHouseIds: ["house_c", "house_a", "house_b"] as const,
    runSeed: 100,
    nextSeed: 101,
    summary: summary(),
  };

  const retried = appReducer(initial, { type: "retryRun" });

  assert.equal(retried.appPhase, "run");
  assert.equal(retried.runSeed, 101);
  assert.deepEqual(retried.selectedHouseIds, initial.selectedHouseIds);
  assert.equal(retried.summary, null);
});

test("Given a valid investment purchase action, when reduced, then meta points and ranks update", () => {
  const state = createInitialAppState(
    { ...createDefaultMetaState(), legacyPoints: 200 },
    100,
  );

  const purchased = appReducer(state, {
    type: "purchaseInvestment",
    trackId: "global_vigor",
  });

  assert.notStrictEqual(purchased, state);
  assert.equal(purchased.meta.legacyPoints, 80);
  assert.deepEqual(purchased.meta.investmentRanks, { global_vigor: 1 });
});

test("Given rejected investment purchase actions, when reduced, then the exact app state reference is retained", () => {
  const state = createInitialAppState(
    { ...createDefaultMetaState(), legacyPoints: 119 },
    100,
  );

  assert.strictEqual(
    appReducer(state, {
      type: "purchaseInvestment",
      trackId: "missing_track",
    }),
    state,
  );
  assert.strictEqual(
    appReducer(state, {
      type: "purchaseInvestment",
      trackId: "global_vigor",
    }),
    state,
  );
});

test("Given a locked house investment, when purchase is requested, then the exact app state reference is retained", () => {
  const state = createInitialAppState(
    { ...createDefaultMetaState(), legacyPoints: 999 },
    100,
  );

  assert.strictEqual(
    appReducer(state, {
      type: "purchaseInvestment",
      trackId: "house_d_duskmere_stride",
    }),
    state,
  );
});

test("Given global and house investments, when bonus summary groups are built, then house effects stay scoped by house name", () => {
  const groups = activeBonusGroups({
    global_vigor: 1,
    house_a_ashvale_fury: 1,
    house_b_thornhold_bulwark: 1,
  });

  assert.deepEqual(groups, [
    { heading: "Global", labels: ["Max HP +10"] },
    { heading: "Ashvale", labels: ["Attack damage +4%"] },
    { heading: "Thornhold", labels: ["Max HP +15"] },
  ]);
});

test("Given a run with global and unselected house investments, when legacy rite groups are built, then only global and selected-house tracks are visible", () => {
  const groups = legacyRiteGroups(
    {
      global_vigor: 1,
      house_a_ashvale_fury: 1,
      house_d_duskmere_stride: 1,
    },
    ["house_a", "house_b", "house_c"],
  );

  assert.deepEqual(groups, [
    {
      heading: "Global",
      items: [
        {
          effect: "+10 max HP per rank",
          name: "Vigor of the Faithful",
          rank: "Rank 1",
        },
      ],
    },
    {
      heading: "Ashvale",
      items: [
        {
          effect: "+4% attack damage per rank",
          name: "Ashvale Fury",
          rank: "Rank 1",
        },
      ],
    },
  ]);
});

test("Given an investment track name, when a purchase label is requested, then the accessible action names the track", () => {
  assert.equal(
    purchaseInvestmentLabel("Vigor of the Faithful"),
    "Purchase Vigor of the Faithful",
  );
});
