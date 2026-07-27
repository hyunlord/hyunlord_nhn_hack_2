import assert from "node:assert/strict";
import test from "node:test";
import { parseHarnessOptions } from "../scripts/balanceOptions";
import {
  runBalanceParallel,
  runBalanceSerial,
} from "../scripts/balanceRunner";
import { formatBalanceReport } from "../scripts/balanceReport";
import { MAX_RUN_TICKS } from "../scripts/balanceSimulation";

test("Given no worker option, when harness options are parsed, then every CPU is available by default", () => {
  const options = parseHarnessOptions([]);

  assert.ok(options.workerCount >= 1);
});

test("Given an explicit worker option, when harness options are parsed, then that positive count is retained", () => {
  assert.equal(parseHarnessOptions(["--workers=3"]).workerCount, 3);
});

test("Given an invalid worker option, when harness options are parsed, then usage exits with code two", () => {
  for (const argument of ["--workers=0", "--workers=-1", "--workers=1.5"]) {
    assert.throws(
      () => parseHarnessOptions([argument]),
      (error: unknown) =>
        error instanceof Error &&
        "exitCode" in error &&
        error.exitCode === 2,
    );
  }
});

test("Given the same seed range, when serial and parallel harnesses finish, then every ordered sample is identical", async () => {
  const serialOptions = parseHarnessOptions([
    "2",
    "--workers=1",
    "--pick=neutral",
    "--shop=auto",
    "--houses=abc",
  ]);
  const parallelOptions = parseHarnessOptions([
    "2",
    "--workers=2",
    "--pick=neutral",
    "--shop=auto",
    "--houses=abc",
  ]);

  const serial = runBalanceSerial(serialOptions);
  const parallel = await runBalanceParallel(parallelOptions);

  assert.deepEqual(parallel, serial);
  assert.equal(
    formatBalanceReport(
      parallel,
      MAX_RUN_TICKS,
      parallelOptions.pickMode,
      parallelOptions.shopMode,
      parallelOptions.houseOption,
    ),
    formatBalanceReport(
      serial,
      MAX_RUN_TICKS,
      serialOptions.pickMode,
      serialOptions.shopMode,
      serialOptions.houseOption,
    ),
  );
  assert.deepEqual(
    parallel.map(({ seed }) => seed),
    [...parallel.map(({ seed }) => seed)].sort((first, second) => first - second),
  );
  for (const sample of parallel) {
    assert.ok(sample.divinePowerSpent >= 0);
    assert.ok(
      Object.values(sample.classDeaths).every((deaths) => deaths >= 0),
    );
    for (const wave of sample.waves.filter(({ reached }) => reached)) {
      assert.ok(wave.startAgents !== null);
      assert.ok(wave.endAgents !== null);
      assert.ok(wave.creatureSpawns > 0);
      assert.ok(wave.creatureKills <= wave.creatureSpawns);
      assert.ok(wave.mageOnlyTicks >= 0);
      assert.ok(wave.hallDamage >= 0);
    }
  }
});
