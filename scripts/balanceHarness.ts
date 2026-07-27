import { BALANCE_CONFIG } from "../src/content/balanceConfig";
import { WAVE_DEFINITIONS } from "../src/content/waveConfig";
import type { GameState } from "../src/engine/engine.types";
import {
  advanceTick,
  beginNextWave,
  createInitialState,
} from "../src/engine/tick";
import { chooseDraftCard } from "../src/engine/progressionEngine";
import { createRng } from "../src/engine/prng";
import { printBalanceReport } from "./balanceReport";

const DEFAULT_RUN_COUNT = 200;
const MAX_RUN_TICKS = 50_000;

export type WaveSample = {
  readonly reached: boolean;
  readonly creatureKills: number;
  readonly clearTicks: number | null;
};
export type RunOutcome =
  | { readonly kind: "defeat"; readonly waveIndex: number }
  | { readonly kind: "victory" };
export type RunSample = {
  readonly seed: number;
  readonly outcome: RunOutcome;
  readonly endTick: number;
  readonly survivingAgents: number;
  readonly hallHpRemaining: number;
  readonly waves: readonly WaveSample[];
  readonly draftCount: number;
  readonly finalLevels: readonly number[];
  readonly pickedCardIds: readonly string[];
};
export type PickMode = "first" | "random";
export type HarnessOptions = {
  readonly runCount: number;
  readonly pickMode: PickMode;
};

class HarnessUsageError extends Error {
  readonly exitCode = 2;

  constructor(readonly argument: string) {
    super(`Invalid run count "${argument}". Expected one positive integer.`);
    this.name = "HarnessUsageError";
  }
}

class SimulationError extends Error {
  constructor(
    readonly seed: number,
    readonly tick: number,
    message: string,
  ) {
    super(`Seed ${seed}, tick ${tick}: ${message}`);
    this.name = "SimulationError";
  }
}

export function parseRunCount(args: readonly string[]): number {
  const positional = args.filter((argument) => !argument.startsWith("--"));
  if (positional.length === 0) {
    return DEFAULT_RUN_COUNT;
  }
  const argument = positional.join(" ");
  if (
    positional.length !== 1 ||
    !/^[1-9]\d*$/.test(argument) ||
    !Number.isSafeInteger(Number(argument))
  ) {
    throw new HarnessUsageError(argument);
  }
  return Number(argument);
}

export function parseHarnessOptions(
  args: readonly string[],
): HarnessOptions {
  const pickArgument = args.find((argument) =>
    argument.startsWith("--pick="),
  );
  const unknownFlags = args.filter(
    (argument) =>
      argument.startsWith("--") && !argument.startsWith("--pick="),
  );
  const pickMode = pickArgument?.slice("--pick=".length) ?? "first";
  if (
    unknownFlags.length > 0 ||
    (pickMode !== "first" && pickMode !== "random") ||
    args.filter((argument) => argument.startsWith("--pick=")).length > 1
  ) {
    throw new HarnessUsageError(args.join(" "));
  }
  return { runCount: parseRunCount(args), pickMode };
}

function terminal(phase: GameState["phase"]): boolean {
  return phase === "victory" || phase === "defeat";
}

function markReached(
  reached: boolean[],
  state: GameState,
  seed: number,
): void {
  if (state.activeThreat === null) {
    throw new SimulationError(seed, state.tick, "wave has no active threat");
  }
  if (state.activeThreat.waveIndex !== state.waveIndex) {
    throw new SimulationError(seed, state.tick, "wave indexes disagree");
  }
  reached[state.waveIndex] = true;
}

function runSimulation(seed: number, pickMode: PickMode): RunSample {
  const world = createInitialState(seed);
  const pickRng = createRng((seed ^ 0x9e3779b9) >>> 0);
  let state = world.state;
  const reached = WAVE_DEFINITIONS.map(() => false);
  const kills = WAVE_DEFINITIONS.map(() => 0);
  const clearTicks = WAVE_DEFINITIONS.map<number | null>(() => null);
  const pickedCardIds: string[] = [];

  while (!terminal(state.phase) && state.tick < MAX_RUN_TICKS) {
    if (state.phase === "draft") {
      const offer = state.pendingDrafts[0];
      if (offer === undefined || offer.cardIds.length === 0) {
        throw new SimulationError(seed, state.tick, "draft has no cards");
      }
      const cardId =
        pickMode === "random"
          ? pickRng.pick(offer.cardIds)
          : offer.cardIds[0];
      if (cardId === undefined) {
        throw new SimulationError(seed, state.tick, "draft pick is missing");
      }
      pickedCardIds.push(cardId);
      state = chooseDraftCard(state, offer.id, cardId);
      continue;
    }
    if (state.phase === "intermission") {
      state = beginNextWave(state, world.rng);
      markReached(reached, state, seed);
      continue;
    }

    const before = state;
    const next = advanceTick(state, world.rng);
    if (before.phase === "preparation" && next.phase === "wave") {
      markReached(reached, next, seed);
    }
    if (before.phase === "wave") {
      const active = before.activeThreat;
      if (active === null || active.waveIndex !== before.waveIndex) {
        throw new SimulationError(
          seed,
          before.tick,
          "invalid active threat during combat",
        );
      }
      const afterRemaining =
        next.activeThreat?.waveIndex === before.waveIndex
          ? next.activeThreat.creatures.length
          : 0;
      const killed = active.creatures.length - afterRemaining;
      if (killed < 0) {
        throw new SimulationError(
          seed,
          before.tick,
          "creature count increased during combat",
        );
      }
      kills[before.waveIndex] =
        (kills[before.waveIndex] ?? 0) + killed;
      if (next.phase === "intermission" || next.phase === "victory") {
        clearTicks[before.waveIndex] = next.tick - active.startTick;
      }
    }
    state = next;
  }

  if (!terminal(state.phase)) {
    throw new SimulationError(
      seed,
      state.tick,
      `did not terminate within ${MAX_RUN_TICKS} ticks`,
    );
  }
  return {
    seed,
    outcome:
      state.phase === "victory"
        ? { kind: "victory" }
        : { kind: "defeat", waveIndex: state.waveIndex },
    endTick: state.tick,
    survivingAgents: state.agents.filter(({ hp }) => hp > 0).length,
    hallHpRemaining: state.halls.reduce((sum, hall) => sum + hall.hp, 0),
    waves: WAVE_DEFINITIONS.map((_, index) => ({
      reached: reached[index] ?? false,
      creatureKills: kills[index] ?? 0,
      clearTicks: clearTicks[index] ?? null,
    })),
    draftCount: pickedCardIds.length,
    finalLevels: state.houseProgress.map(({ level }) => level),
    pickedCardIds,
  };
}

function main(): void {
  const options = parseHarnessOptions(process.argv.slice(2));
  const samples = Array.from({ length: options.runCount }, (_, index) =>
    runSimulation(
      (BALANCE_CONFIG.DEFAULT_SEED + index) >>> 0,
      options.pickMode,
    ),
  );
  printBalanceReport(samples, MAX_RUN_TICKS, options.pickMode);
}

try {
  main();
} catch (error) {
  if (error instanceof HarnessUsageError) {
    console.error(error.message);
    process.exitCode = error.exitCode;
  } else if (error instanceof Error) {
    console.error(error.message);
    process.exitCode = 1;
  } else {
    throw error;
  }
}
