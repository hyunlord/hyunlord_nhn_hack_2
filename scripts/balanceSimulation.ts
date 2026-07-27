import { performance } from "node:perf_hooks";
import { SHOP_CATALOG } from "../src/build/shop";
import { CARD_DEFINITIONS } from "../src/content/cardConfig";
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
import { legacyForRun } from "../src/meta/legacy";
import {
  type PickMode,
  type ShopMode,
} from "./balanceOptions";
import {
  createAutoShopDiagnostics,
  runRoundRobinShop,
  type AutoShopDiagnostics,
  type AutoShopState,
} from "./autoShopStrategy";
import { castFirstAvailableSkill } from "./autoSkillStrategy";
import {
  createSimulationMetrics,
  recordCombatMetrics,
  recordWaveStart,
} from "./balanceTelemetry";
import type { RunSample, SimulationObserver } from "./balanceTypes";

export const MAX_RUN_TICKS = 50_000;

export function chooseDraftCardId(
  cardIds: readonly string[],
  pickMode: PickMode,
  choiceRoll: number,
): string | undefined {
  if (pickMode === "first") {
    return cardIds[0];
  }
  const slotIndex = Math.min(
    cardIds.length - 1,
    Math.floor(choiceRoll * cardIds.length),
  );
  return cardIds[slotIndex];
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

function terminal(phase: GameState["phase"]): boolean {
  return phase === "victory" || phase === "defeat";
}

function mergeShopDiagnostics(
  first: AutoShopDiagnostics,
  second: AutoShopDiagnostics,
): AutoShopDiagnostics {
  const merged = createAutoShopDiagnostics();
  for (const { id } of SHOP_CATALOG) {
    const left = first[id];
    const right = second[id];
    merged[id] = {
      attempted: left.attempted + right.attempted,
      succeeded: left.succeeded + right.succeeded,
      unaffordable: left.unaffordable + right.unaffordable,
      domainUnavailable:
        left.domainUnavailable + right.domainUnavailable,
      placementFailed:
        left.placementFailed + right.placementFailed,
    };
  }
  return merged;
}

export function runSimulation(
  seed: number,
  pickMode: PickMode,
  shopMode: ShopMode,
  houseIds: HouseSelection,
  observer: SimulationObserver = {},
): RunSample {
  const world = createInitialState(seed, houseIds);
  const pickRng = createRng((seed ^ 0x9e3779b9) >>> 0);
  let state = world.state;
  const metrics = createSimulationMetrics();
  const pickedCardIds: string[] = [];
  const offeredCardIds: string[] = [];
  let skillCasts = 0;
  let autoShopState: AutoShopState = { nextCategoryIndex: 0 };
  let shopDiagnostics = createAutoShopDiagnostics();
  let tributeAfterFinalShop = 0;

  while (!terminal(state.phase) && state.tick < MAX_RUN_TICKS) {
    if (state.phase === "draft") {
      const offer = state.pendingDrafts[0];
      if (offer === undefined || offer.cardIds.length === 0) {
        throw new SimulationError(seed, state.tick, "draft has no cards");
      }
      offeredCardIds.push(...offer.cardIds);
      const cardId = chooseDraftCardId(
        offer.cardIds,
        pickMode,
        pickMode === "first" ? 0 : pickRng.next(),
      );
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
      recordWaveStart(metrics, state, seed);
      continue;
    }

    const before = state;
    const autoSkill = castFirstAvailableSkill(state);
    metrics.divinePowerSpent += Math.max(
      0,
      before.divinePower - autoSkill.state.divinePower,
    );
    state = autoSkill.state;
    if (autoSkill.castSkillId !== null) {
      skillCasts += 1;
    }
    const tickStartedAt = performance.now();
    const next = advanceTick(state, world.rng);
    const tickElapsedMs = performance.now() - tickStartedAt;
    if (before.phase === "preparation" && next.phase === "wave") {
      recordWaveStart(metrics, next, seed);
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
      metrics.creatureKills[before.waveIndex] =
        (metrics.creatureKills[before.waveIndex] ?? 0) + killed;
      if (
        next.phase === "intermission" ||
        next.phase === "victory" ||
        (next.phase === "draft" &&
          (next.phaseBeforeDraft === "intermission" ||
            next.phaseBeforeDraft === "victory"))
      ) {
        metrics.clearTicks[before.waveIndex] = next.tick - active.startTick;
      }
      recordCombatMetrics(metrics, before, next);
    }
    state = next;
    observer.onTick?.(before, next, tickElapsedMs);
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
      reached: metrics.reached[index] ?? false,
      startAgents: metrics.startAgents[index] ?? null,
      endAgents: metrics.endAgents[index] ?? null,
      creatureSpawns: metrics.creatureSpawns[index] ?? 0,
      creatureKills: metrics.creatureKills[index] ?? 0,
      clearTicks: metrics.clearTicks[index] ?? null,
      mageOnlyTicks: metrics.mageOnlyTicks[index] ?? 0,
      hallDamage: metrics.hallDamage[index] ?? 0,
    })),
    draftCount: pickedCardIds.length,
    finalLevels: state.houseProgress.map(({ level }) => level),
    finalHeroLevels: state.heroProgress.map(({ level }) => level),
    offeredCardIds,
    pickedCardIds,
    acquiredSkillIds: CARD_DEFINITIONS.flatMap(({ id, effect }) =>
      pickedCardIds.includes(id) && effect.grantsSkill !== undefined
        ? [effect.grantsSkill]
        : [],
    ),
    skillCasts,
    towersBuilt: state.shopPurchases.raise_tower,
    tributeUnspent:
      shopMode === "auto" ? tributeAfterFinalShop : state.tribute,
    heroDeaths: state.heroDeaths,
    divinePowerSpent: metrics.divinePowerSpent,
    classDeaths: metrics.classDeaths,
    shopDiagnostics,
    legacyEarned: legacyForRun(createRunSummary(state)),
  };
}
