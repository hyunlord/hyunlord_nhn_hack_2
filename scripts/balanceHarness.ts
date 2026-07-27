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
import {
  purchaseShopItem,
  purchaseTowerAt,
} from "../src/engine/shopEngine";

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
  readonly towersBuilt: number;
  readonly tributeUnspent: number;
  readonly heroDeaths: number;
};
export type PickMode = "first" | "random";
export type ShopMode = "auto" | "none";
export type HarnessOptions = {
  readonly runCount: number;
  readonly pickMode: PickMode;
  readonly shopMode: ShopMode;
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
      argument.startsWith("--") &&
      !argument.startsWith("--pick=") &&
      !argument.startsWith("--shop="),
  );
  const pickMode = pickArgument?.slice("--pick=".length) ?? "first";
  const shopArguments = args.filter((argument) =>
    argument.startsWith("--shop="),
  );
  const shopMode = shopArguments[0]?.slice("--shop=".length) ?? "auto";
  if (
    unknownFlags.length > 0 ||
    (pickMode !== "first" && pickMode !== "random") ||
    args.filter((argument) => argument.startsWith("--pick=")).length > 1 ||
    shopArguments.length > 1 ||
    (shopMode !== "auto" && shopMode !== "none")
  ) {
    throw new HarnessUsageError(args.join(" "));
  }
  return { runCount: parseRunCount(args), pickMode, shopMode };
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

function placeNextTower(state: GameState): GameState {
  for (let y = 40; y < BALANCE_CONFIG.WORLD_HEIGHT; y += 40) {
    for (let x = 40; x < BALANCE_CONFIG.WORLD_WIDTH; x += 40) {
      const placed = purchaseTowerAt(state, x, y);
      if (placed !== state) {
        return placed;
      }
    }
  }
  return state;
}

function runAutoShop(state: GameState): GameState {
  const buyers = [
    (current: GameState) =>
      purchaseShopItem(current, "recruit_squad"),
    (current: GameState) =>
      purchaseShopItem(current, "field_medicine"),
    placeNextTower,
    (current: GameState) =>
      purchaseShopItem(current, "reinforce_hall"),
  ];
  let next = state;
  for (const buy of buyers) {
    next = buy(next);
  }
  return next;
}

function runSimulation(
  seed: number,
  pickMode: PickMode,
  shopMode: ShopMode,
): RunSample {
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
      if (shopMode === "auto") {
        state = runAutoShop(state);
      }
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
      if (
        next.phase === "intermission" ||
        next.phase === "victory" ||
        (next.phase === "draft" &&
          (next.phaseBeforeDraft === "intermission" ||
            next.phaseBeforeDraft === "victory"))
      ) {
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
    towersBuilt: state.shopPurchases.raise_tower,
    tributeUnspent: state.tribute,
    heroDeaths: state.heroDeaths,
  };
}

function main(): void {
  const options = parseHarnessOptions(process.argv.slice(2));
  const samples = Array.from({ length: options.runCount }, (_, index) =>
    runSimulation(
      (BALANCE_CONFIG.DEFAULT_SEED + index) >>> 0,
      options.pickMode,
      options.shopMode,
    ),
  );
  printBalanceReport(
    samples,
    MAX_RUN_TICKS,
    options.pickMode,
    options.shopMode,
  );
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
