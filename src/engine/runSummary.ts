import { HOUSE_SYNERGIES } from "../content/houseSynergies";
import type { RunSummary } from "../content/runSummary";
import { WAVE_DEFINITIONS } from "../content/waveConfig";
import type { GameState } from "./engine.types";

function isTerminal(state: GameState): boolean {
  return state.phase === "victory" || state.phase === "defeat";
}

export function createRunSummary(state: GameState): RunSummary {
  if (!isTerminal(state)) {
    throw new RangeError("Run summary requires a terminal game state.");
  }
  const survivingAgents = state.agents.filter(({ hp }) => hp > 0).length;
  const survivingHalls = state.halls.filter(({ hp }) => hp > 0).length;
  const towersBuilt = state.shopPurchases.raise_tower;
  const hiddenSynergies = new Set<string>(
    HOUSE_SYNERGIES.filter(({ hidden }) => hidden).map(({ id }) => id),
  );

  return {
    runId: `${state.runSeed}:${state.selectedHouseIds.join(",")}:${state.tick}`,
    selectedHouseIds: state.selectedHouseIds,
    wavesCleared:
      state.phase === "victory"
        ? WAVE_DEFINITIONS.length
        : state.waveIndex,
    bestWaveReached: state.waveIndex + 1,
    victory: state.phase === "victory",
    agentsStarted: state.agents.length,
    survivingAgents,
    agentsLost: state.agents.length - survivingAgents,
    hallsStarted: state.halls.length,
    survivingHalls,
    towersBuilt,
    noTowers: towersBuilt === 0,
    allHallsStanding: survivingHalls === state.halls.length,
    heroLessWave2Clear: state.heroLessWave2Clear,
    betrayal:
      state.betrayalHouseId === null
        ? null
        : { traitorHouseId: state.betrayalHouseId },
    discoveredSynergyIds: state.activeSynergyIds.filter((id) =>
      hiddenSynergies.has(id),
    ),
    populationHistory: state.populationHistory,
  };
}
