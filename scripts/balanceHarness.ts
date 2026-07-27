import { BALANCE_CONFIG } from "../src/content/balanceConfig";
import type { HouseSelection } from "../src/content/houseConfig";
import { WAVE_DEFINITIONS } from "../src/content/waveConfig";
import type { GameState } from "../src/engine/engine.types";
import {
  advanceTick,
  beginNextWave,
  createInitialState,
} from "../src/engine/tick";
import { chooseDraftCard } from "../src/engine/progressionEngine";
import { createRng } from "../src/engine/prng";
import { createRunSummary } from "../src/engine/runSummary";
import { calculateLegacyReward } from "../src/meta/legacy";
import { printBalanceReport } from "./balanceReport";
import {
  HarnessUsageError,
  parseHarnessOptions,
  type PickMode,
  type ShopMode,
} from "./balanceOptions";
import { createHouseSampleOrder } from "./houseSampling";
import {
  createAutoShopDiagnostics,
  runRoundRobinShop,
  type AutoShopDiagnostics,
  type AutoShopState,
} from "./autoShopStrategy";

const MAX_RUN_TICKS = 50_000;

export {
  parseHarnessOptions,
  parseRunCount,
  type HarnessOptions,
  type HouseOption,
  type PickMode,
  type ShopMode,
} from "./balanceOptions";

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
  readonly selectedHouseIds: HouseSelection;
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
  readonly shopDiagnostics: AutoShopDiagnostics;
  readonly legacyEarned: number;
};

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

function mergeShopDiagnostics(
  first: AutoShopDiagnostics,
  second: AutoShopDiagnostics,
): AutoShopDiagnostics {
  return Object.fromEntries(
    Object.keys(first).map((itemId) => {
      const id = itemId as keyof AutoShopDiagnostics;
      const left = first[id];
      const right = second[id];
      return [
        id,
        {
          attempted: left.attempted + right.attempted,
          succeeded: left.succeeded + right.succeeded,
          unaffordable: left.unaffordable + right.unaffordable,
          domainUnavailable:
            left.domainUnavailable + right.domainUnavailable,
          placementFailed:
            left.placementFailed + right.placementFailed,
        },
      ];
    }),
  ) as AutoShopDiagnostics;
}

function runSimulation(
  seed: number,
  pickMode: PickMode,
  shopMode: ShopMode,
  houseIds: HouseSelection,
): RunSample {
  const world = createInitialState(seed, houseIds);
  const pickRng = createRng((seed ^ 0x9e3779b9) >>> 0);
  let state = world.state;
  const reached = WAVE_DEFINITIONS.map(() => false);
  const kills = WAVE_DEFINITIONS.map(() => 0);
  const clearTicks = WAVE_DEFINITIONS.map<number | null>(() => null);
  const pickedCardIds: string[] = [];
  let autoShopState: AutoShopState = { nextCategoryIndex: 0 };
  let shopDiagnostics = createAutoShopDiagnostics();
  let tributeAfterFinalShop = 0;

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
        const shopped = runRoundRobinShop(state, autoShopState);
        state = shopped.state;
        autoShopState = shopped.strategy;
        shopDiagnostics = mergeShopDiagnostics(
          shopDiagnostics,
          shopped.diagnostics,
        );
        tributeAfterFinalShop = state.tribute;
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
    selectedHouseIds: houseIds,
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
    tributeUnspent:
      shopMode === "auto" ? tributeAfterFinalShop : state.tribute,
    heroDeaths: state.heroDeaths,
    shopDiagnostics,
    legacyEarned: calculateLegacyReward(createRunSummary(state)).total,
  };
}

function main(): void {
  const options = parseHarnessOptions(process.argv.slice(2));
  const sampledTrios =
    options.houseOption.kind === "random"
      ? createHouseSampleOrder(BALANCE_CONFIG.DEFAULT_SEED ^ 0x51a7c0de)
      : [options.houseOption.houseIds];
  const samples = Array.from({ length: options.runCount }, (_, index) =>
    runSimulation(
      (BALANCE_CONFIG.DEFAULT_SEED + index) >>> 0,
      options.pickMode,
      options.shopMode,
      sampledTrios[index % sampledTrios.length] ??
        sampledTrios[0] ??
        ["house_a", "house_b", "house_c"],
    ),
  );
  printBalanceReport(
    samples,
    MAX_RUN_TICKS,
    options.pickMode,
    options.shopMode,
    options.houseOption,
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
