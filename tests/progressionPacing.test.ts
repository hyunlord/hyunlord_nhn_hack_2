import assert from "node:assert/strict";
import test from "node:test";
import { BALANCE_CONFIG } from "../src/content/balanceConfig";
import { runBalanceParallel } from "../scripts/balanceRunner";
import { runSimulation } from "../scripts/balanceSimulation";

test("Given the default seed, when a full neutral run resolves, then level five is not reached during the first 800 ticks", () => {
  let earliestLevelFiveTick: number | null = null;

  runSimulation(
    BALANCE_CONFIG.DEFAULT_SEED,
    "neutral",
    "auto",
    ["house_a", "house_b", "house_c"],
    {
      onTick(before, after) {
        const crossedLevelFive = after.houseProgress.some(
          (progress, index) =>
            progress.level === 5 &&
            (before.houseProgress[index]?.level ?? 5) < 5,
        );
        if (crossedLevelFive && earliestLevelFiveTick === null) {
          earliestLevelFiveTick = after.tick;
        }
      },
    },
  );

  assert.ok(
    earliestLevelFiveTick === null || earliestLevelFiveTick > 800,
    `Expected no level five by tick 800, reached at ${earliestLevelFiveTick}.`,
  );
});

test("Given 100 default neutral runs, when progression settles, then low-participation houses stay viable and drafts remain paced", async () => {
  const samples = await runBalanceParallel({
    runCount: 100,
    pickMode: "neutral",
    shopMode: "auto",
    workerCount: 20,
    houseOption: {
      kind: "fixed",
      houseIds: ["house_a", "house_b", "house_c"],
      label: "abc",
    },
  });
  const finalLevels = samples.flatMap(({ finalLevels: levels }) => levels);
  const levelOneCount = finalLevels.filter((level) => level === 1).length;
  const averageDrafts =
    samples.reduce((sum, { draftCount }) => sum + draftCount, 0) /
    samples.length;

  assert.ok(
    levelOneCount / finalLevels.length < 0.05,
    `Expected fewer than 5% level-one houses, got ${levelOneCount}/${finalLevels.length}.`,
  );
  assert.ok(
    averageDrafts >= 6 && averageDrafts <= 10,
    `Expected 6-10 drafts per run, got ${averageDrafts}.`,
  );
});
