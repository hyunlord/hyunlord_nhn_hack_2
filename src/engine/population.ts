import { createRecruits } from "../agents/agentFactory";
import {
  HOUSE_CONFIG,
  type HouseId,
} from "../content/houseConfig";
import type { Rng } from "../content/random";
import type { GameState } from "./engine.types";
import { modifiersForHouse } from "./progressionEngine";
import { UNIT_CLASS_IDS } from "../content/unitClassConfig";

function houseConfig(houseId: HouseId) {
  const config = HOUSE_CONFIG.find(({ id }) => id === houseId);
  if (config === undefined) {
    throw new RangeError(`Missing house population config for ${houseId}.`);
  }
  return config;
}

function houseLevel(state: GameState, houseId: HouseId): number {
  return state.houseProgress.find(
    (progress) => progress.houseId === houseId,
  )?.level ?? 1;
}

export function populationGrowthForHouse(
  houseId: HouseId,
  level: number,
): number {
  const config = houseConfig(houseId);
  return (
    config.populationGrowthBase +
    config.populationGrowthPerLevel * Math.max(0, level - 1)
  );
}

export function populationCapForHouse(
  houseId: HouseId,
  level: number,
): number {
  const config = houseConfig(houseId);
  return (
    config.populationCapBase +
    config.populationCapPerLevel * Math.max(0, level - 1)
  );
}

export function livingRegularCount(
  state: GameState,
  houseId: HouseId,
): number {
  return state.agents.filter(
    (agent) =>
      agent.houseId === houseId &&
      !agent.isHero &&
      agent.hp > 0,
  ).length;
}

export function recordPopulationAtWaveStart(
  state: GameState,
  waveIndex: number,
): GameState["populationHistory"] {
  return [
    ...state.populationHistory,
    ...state.selectedHouseIds.map((houseId) => ({
      wave: waveIndex + 1,
      houseId,
      count: livingRegularCount(state, houseId),
    })),
  ];
}

export function recruitForWaveStart(
  state: GameState,
  waveIndex: number,
  rng: Rng,
): GameState {
  let agents = state.agents;
  if (waveIndex > 0) {
    for (const houseId of state.selectedHouseIds) {
      const hall = state.halls.find(
        (candidate) => candidate.houseId === houseId && candidate.hp > 0,
      );
      if (hall === undefined) {
        continue;
      }
      const level = houseLevel(state, houseId);
      const living = agents.filter(
        (agent) =>
          agent.houseId === houseId &&
          !agent.isHero &&
          agent.hp > 0,
      ).length;
      const cap = populationCapForHouse(houseId, level);
      const count = Math.max(
        0,
        Math.min(
          populationGrowthForHouse(houseId, level),
          cap - living,
        ),
      );
      if (count === 0) {
        continue;
      }
      const modifiersByClass = new Map(
        UNIT_CLASS_IDS.map((unitClass) => [
          unitClass,
          modifiersForHouse(state, houseId, unitClass),
        ]),
      );
      const idStart = agents.filter(
        (agent) => agent.houseId === houseId && !agent.isHero,
      ).length;
      agents = [
        ...agents,
        ...createRecruits({
          houseId,
          count,
          idStart,
          spawn: { x: hall.x, y: hall.y },
          rng,
          modifiersByClass,
        }),
      ];
    }
  }
  const withAgents = agents === state.agents ? state : { ...state, agents };
  return {
    ...withAgents,
    populationHistory: recordPopulationAtWaveStart(
      withAgents,
      waveIndex,
    ),
  };
}
