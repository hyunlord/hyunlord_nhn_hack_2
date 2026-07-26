import { createAgents, createHouses } from "../agents/agentFactory";
import { stepAgent } from "../agents/movement";
import { BALANCE_CONFIG } from "../content/balanceConfig";
import type { MiracleEvent } from "../divine/divine.types";
import { canCast, resolveMiracle } from "../divine/miracleResolver";
import { MIRACLE_DEFINITIONS } from "../divine/miracleTypes";
import type { Rng } from "./prng";
import { createRng } from "./prng";
import type { GameState } from "./engine.types";

export function castMiracle(
  state: GameState,
  event: MiracleEvent,
): GameState {
  const definition = MIRACLE_DEFINITIONS[event.type];
  if (
    !canCast(
      event.type,
      state.divinePower,
      state.miracleCooldowns[event.type],
    )
  ) {
    return state;
  }

  const outcome = resolveMiracle(event, state.agents);
  const damagesByAgent = new Map(
    outcome.damages.map(({ agentId, amount }) => [agentId, amount] as const),
  );
  const healsByAgent = new Map(
    outcome.heals.map(({ agentId, amount }) => [agentId, amount] as const),
  );
  const powerByHouse = new Map(
    outcome.housePowerDeltas.map(({ houseId, amount }) => [
      houseId,
      amount,
    ] as const),
  );

  const agents = state.agents.map((agent) => {
    const damage = damagesByAgent.get(agent.id);
    if (damage !== undefined) {
      const hp = Math.max(0, agent.hp - damage);
      return {
        ...agent,
        hp,
        state: hp === 0 ? ("dead" as const) : agent.state,
        lastDamagedTick: state.tick,
      };
    }

    const heal = healsByAgent.get(agent.id);
    if (heal !== undefined) {
      return {
        ...agent,
        hp: Math.min(BALANCE_CONFIG.INITIAL_HP, agent.hp + heal),
      };
    }

    return agent;
  });
  const houses = state.houses.map((house) => {
    const delta = powerByHouse.get(house.id);
    return delta === undefined
      ? house
      : {
          ...house,
          power: Math.min(100, Math.max(0, house.power + delta)),
        };
  });

  return {
    ...state,
    agents,
    houses,
    divinePower: state.divinePower - definition.cost,
    miracleCooldowns: {
      ...state.miracleCooldowns,
      [event.type]: definition.cooldownTicks,
    },
    activeEffects: [...state.activeEffects, outcome],
  };
}

export function advanceTick(state: GameState, rng: Rng): GameState {
  const tick = state.tick + 1;

  return {
    ...state,
    tick,
    agents: state.agents.map((agent) => stepAgent(agent, rng)),
    divinePower: Math.min(
      BALANCE_CONFIG.DIVINE_POWER_MAX,
      state.divinePower + BALANCE_CONFIG.DIVINE_POWER_REGEN_PER_TICK,
    ),
    miracleCooldowns: {
      lightning: Math.max(0, state.miracleCooldowns.lightning - 1),
      blessing: Math.max(0, state.miracleCooldowns.blessing - 1),
      curse: Math.max(0, state.miracleCooldowns.curse - 1),
    },
    activeEffects: state.activeEffects.filter(
      (effect) => tick < effect.startTick + effect.durationTicks,
    ),
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
      divinePower: BALANCE_CONFIG.DIVINE_POWER_START,
      miracleCooldowns: { lightning: 0, blessing: 0, curse: 0 },
      activeEffects: [],
    },
    rng,
  };
}
