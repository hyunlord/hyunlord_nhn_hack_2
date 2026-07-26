import { createAgents, createHouses } from "../agents/agentFactory";
import { stepAgent } from "../agents/movement";
import type { Rng } from "./prng";
import { createRng } from "./prng";
import type { GameState } from "./engine.types";

export function advanceTick(state: GameState, rng: Rng): GameState {
  return {
    ...state,
    tick: state.tick + 1,
    agents: state.agents.map((agent) => stepAgent(agent, rng)),
  };
}

export function createInitialState(seed: number): {
  state: GameState;
  rng: Rng;
} {
  const rng = createRng(seed);
  const houses = createHouses(rng);
  const agents = createAgents(houses, rng);

  return {
    state: {
      tick: 0,
      phase: "intervention",
      houses,
      agents,
      activeThreat: null,
      highlights: [],
      ending: null,
    },
    rng,
  };
}
