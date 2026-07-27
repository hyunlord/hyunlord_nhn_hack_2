import assert from "node:assert/strict";
import test from "node:test";
import {
  allHouseTrios,
  createHouseSampleOrder,
} from "../scripts/houseSampling";
import { parseHarnessOptions } from "../scripts/balanceOptions";

test("Given six houses, when trios are enumerated, then all twenty unique combinations appear", () => {
  const trios = allHouseTrios();

  assert.equal(trios.length, 20);
  assert.equal(new Set(trios.map((trio) => trio.join(","))).size, 20);
});

test("Given the same sampling seed, when random trio order is built, then the order is stable and complete", () => {
  const first = createHouseSampleOrder(9127);
  const second = createHouseSampleOrder(9127);

  assert.deepEqual(first, second);
  assert.equal(first.length, 20);
  assert.notDeepEqual(createHouseSampleOrder(9128), first);
});

test("Given house CLI modes, when options are parsed, then fixed order and random mode are retained", () => {
  assert.deepEqual(parseHarnessOptions(["40", "--houses=fad"]), {
    runCount: 40,
    pickMode: "first",
    shopMode: "auto",
    houseOption: {
      kind: "fixed",
      houseIds: ["house_f", "house_a", "house_d"],
      label: "fad",
    },
  });
  assert.deepEqual(
    parseHarnessOptions(["--houses=a,b,c"]).houseOption,
    {
      kind: "fixed",
      houseIds: ["house_a", "house_b", "house_c"],
      label: "abc",
    },
  );
  assert.equal(
    parseHarnessOptions(["--houses=random"]).houseOption.kind,
    "random",
  );
});

test("Given malformed house CLI modes, when options are parsed, then usage errors use exit code two", () => {
  for (const argument of ["ab", "aab", "abz", "abcdef", ""]) {
    assert.throws(
      () => parseHarnessOptions([`--houses=${argument}`]),
      (error: unknown) =>
        error instanceof Error &&
        "exitCode" in error &&
        error.exitCode === 2,
    );
  }
});
