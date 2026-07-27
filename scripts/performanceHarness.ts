import type { HouseSelection } from "../src/content/houseConfig";
import type { GameState } from "../src/engine/engine.types";
import { runSimulation } from "./balanceHarness";

const TRIOS = [
  ["house_a", "house_b", "house_c"],
  ["house_b", "house_d", "house_e"],
  ["house_a", "house_d", "house_f"],
] as const satisfies readonly HouseSelection[];

type Timing = {
  ticks: number;
  totalMs: number;
  worstMs: number;
  peakEntities: number;
};

function entityCount(state: GameState): number {
  return (
    state.agents.length +
    state.halls.length +
    state.towers.length +
    (state.activeThreat?.creatures.length ?? 0) +
    (state.activeThreat?.mage === null ||
    state.activeThreat?.mage === undefined
      ? 0
      : 1)
  );
}

function measureTrio(
  trio: HouseSelection,
  seed: number,
): { timing: Timing; outcome: string; populationArc: string } {
  const timing: Timing = {
    ticks: 0,
    totalMs: 0,
    worstMs: 0,
    peakEntities: 0,
  };
  let finalState: GameState | undefined;
  const measuredSample = runSimulation(seed, "neutral", "auto", trio, {
    onTick(before, after, elapsedMs) {
      timing.ticks += 1;
      timing.totalMs += elapsedMs;
      timing.worstMs = Math.max(timing.worstMs, elapsedMs);
      timing.peakEntities = Math.max(
        timing.peakEntities,
        entityCount(before),
        entityCount(after),
      );
      finalState = after;
    },
  });

  const outcome =
    measuredSample.outcome.kind === "victory"
      ? "victory"
      : `defeat-wave-${measuredSample.outcome.waveIndex + 1}`;
  const populationArc = finalState?.populationHistory
    .map(({ wave, houseId, count }) => `${houseId}:W${wave}=${count}`)
    .join(", ") ?? "none";
  return { timing, outcome, populationArc };
}

function main(): void {
  const totals: Timing = {
    ticks: 0,
    totalMs: 0,
    worstMs: 0,
    peakEntities: 0,
  };
  for (const [index, trio] of TRIOS.entries()) {
    const result = measureTrio(trio, 4_242 + index);
    totals.ticks += result.timing.ticks;
    totals.totalMs += result.timing.totalMs;
    totals.worstMs = Math.max(totals.worstMs, result.timing.worstMs);
    totals.peakEntities = Math.max(
      totals.peakEntities,
      result.timing.peakEntities,
    );
    console.log(
      `${trio.join("/")}: ${result.outcome}; ` +
        `avg ${(result.timing.totalMs / result.timing.ticks).toFixed(3)} ms; ` +
        `worst ${result.timing.worstMs.toFixed(3)} ms; ` +
        `peak ${result.timing.peakEntities}; ${result.populationArc}`,
    );
  }
  console.log(
    `overall: avg ${(totals.totalMs / totals.ticks).toFixed(3)} ms; ` +
      `worst ${totals.worstMs.toFixed(3)} ms; peak ${totals.peakEntities}`,
  );
}

main();
