import type { RunPhase } from "../engine/engine.types";

export const DAY_NIGHT_TWEEN_TICKS = 30;

export type DayNightTarget = "night" | "day";

export type DayNightPhaseInput = {
  readonly phase: RunPhase;
  readonly phaseBeforeDraft: Exclude<RunPhase, "draft"> | null;
};

export type DayNightFactorInput = DayNightPhaseInput & {
  readonly tick: number;
};

export type DayNightTargetOptions = {
  readonly daylightRaidActive?: boolean;
};

export type DayNightTracker = {
  readonly target: DayNightTarget;
  readonly startTick: number;
  readonly startFactor: number;
};

export type DayNightFactorResult = {
  readonly factor: number;
  readonly tracker: DayNightTracker;
};

export type RgbaColor = {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
  readonly alpha: number;
};

const TARGET_FACTORS = {
  night: 0,
  day: 1,
} as const satisfies Readonly<Record<DayNightTarget, number>>;

function assertNever(value: never): never {
  throw new Error("Unhandled run phase: " + value);
}

function clampDayNightFactor(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function targetForNonDraftPhase(
  phase: Exclude<RunPhase, "draft">,
  options: DayNightTargetOptions,
): DayNightTarget {
  if (options.daylightRaidActive === true && phase === "wave") {
    return "day";
  }

  switch (phase) {
    case "preparation":
    case "wave":
    case "defeat":
      return "night";
    case "intermission":
    case "victory":
      return "day";
    default:
      return assertNever(phase);
  }
}

export function resolveDayNightTarget(
  input: DayNightPhaseInput,
  previousTarget?: DayNightTarget,
  options: DayNightTargetOptions = {},
): DayNightTarget {
  if (input.phase === "draft") {
    return input.phaseBeforeDraft === null
      ? (previousTarget ?? "night")
      : targetForNonDraftPhase(input.phaseBeforeDraft, options);
  }

  return targetForNonDraftPhase(input.phase, options);
}

function factorForTracker(tracker: DayNightTracker, tick: number): number {
  const targetFactor = TARGET_FACTORS[tracker.target];
  const elapsedTicks = Math.max(0, tick - tracker.startTick);
  const progress = clampDayNightFactor(elapsedTicks / DAY_NIGHT_TWEEN_TICKS);
  return (
    tracker.startFactor +
    (targetFactor - tracker.startFactor) * progress
  );
}

export function dayNightFactor(
  input: DayNightFactorInput,
  previousTracker?: DayNightTracker,
  options: DayNightTargetOptions = {},
): DayNightFactorResult {
  const target = resolveDayNightTarget(
    input,
    previousTracker?.target,
    options,
  );

  if (previousTracker === undefined) {
    const factor = TARGET_FACTORS[target];
    return {
      factor,
      tracker: {
        target,
        startTick: input.tick,
        startFactor: factor,
      },
    };
  }

  const currentFactor = factorForTracker(previousTracker, input.tick);
  if (previousTracker.target === target) {
    return {
      factor: currentFactor,
      tracker: previousTracker,
    };
  }

  const tracker = {
    target,
    startTick: input.tick,
    startFactor: currentFactor,
  } satisfies DayNightTracker;
  return {
    factor: currentFactor,
    tracker,
  };
}

export function mixRgba(
  night: RgbaColor,
  day: RgbaColor,
  factor: number,
): string {
  const clampedFactor = clampDayNightFactor(factor);
  const red = Math.round(night.red + (day.red - night.red) * clampedFactor);
  const green = Math.round(
    night.green + (day.green - night.green) * clampedFactor,
  );
  const blue = Math.round(
    night.blue + (day.blue - night.blue) * clampedFactor,
  );
  const alpha = night.alpha + (day.alpha - night.alpha) * clampedFactor;
  return "rgba(" + red + ", " + green + ", " + blue + ", " + alpha.toFixed(3) + ")";
}
