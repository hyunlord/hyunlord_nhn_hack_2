import assert from "node:assert/strict";
import test from "node:test";
import {
  DAY_NIGHT_TWEEN_TICKS,
  dayNightFactor,
  resolveDayNightTarget,
} from "../src/render/dayNight";

test("Given run phases, when day-night target is resolved, then combat phases are night and shop is day", () => {
  assert.equal(
    resolveDayNightTarget({ phase: "preparation", phaseBeforeDraft: null }),
    "night",
  );
  assert.equal(
    resolveDayNightTarget({ phase: "wave", phaseBeforeDraft: null }),
    "night",
  );
  assert.equal(
    resolveDayNightTarget({ phase: "intermission", phaseBeforeDraft: null }),
    "day",
  );
});

test("Given draft phase, when a previous phase or render target is known, then the draft keeps that target", () => {
  assert.equal(
    resolveDayNightTarget({ phase: "draft", phaseBeforeDraft: "wave" }),
    "night",
  );
  assert.equal(
    resolveDayNightTarget({ phase: "draft", phaseBeforeDraft: null }, "day"),
    "day",
  );
});

test("Given a daylight raid wave, when target is resolved, then the optional render input can force day without changing game state", () => {
  assert.equal(
    resolveDayNightTarget(
      { phase: "wave", phaseBeforeDraft: null },
      "night",
      { daylightRaidActive: true },
    ),
    "day",
  );
});

test("Given a target change, when ticks advance, then day-night factor tweens over thirty ticks", () => {
  const night = dayNightFactor({
    phase: "wave",
    phaseBeforeDraft: null,
    tick: 100,
  });
  assert.equal(night.factor, 0);

  const start = dayNightFactor(
    { phase: "intermission", phaseBeforeDraft: null, tick: 100 },
    night.tracker,
  );
  assert.equal(start.factor, 0);

  const halfway = dayNightFactor(
    {
      phase: "intermission",
      phaseBeforeDraft: null,
      tick: 100 + DAY_NIGHT_TWEEN_TICKS / 2,
    },
    start.tracker,
  );
  assert.equal(halfway.factor, 0.5);

  const done = dayNightFactor(
    {
      phase: "intermission",
      phaseBeforeDraft: null,
      tick: 100 + DAY_NIGHT_TWEEN_TICKS,
    },
    halfway.tracker,
  );
  assert.equal(done.factor, 1);
});
