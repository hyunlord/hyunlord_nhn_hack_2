import { BALANCE_CONFIG } from "../content/balanceConfig";
import type { MiracleEvent } from "../divine/divine.types";
import { canCast, resolveMiracle } from "../divine/miracleResolver";
import { MIRACLE_DEFINITIONS } from "../divine/miracleTypes";
import type { GameState } from "./engine.types";
import {
  divineModifiersForState,
  modifiersForHouse,
} from "./progressionEngine";

export function castMiracle(
  state: GameState,
  event: MiracleEvent,
): GameState {
  if (state.phase !== "preparation" && state.phase !== "wave") {
    return state;
  }
  const definition = MIRACLE_DEFINITIONS[event.type];
  const modifiers = divineModifiersForState(state);
  if (
    !canCast(
      event.type,
      state.divinePower,
      state.miracleCooldowns[event.type],
      modifiers,
    )
  ) {
    return state;
  }

  const outcome = resolveMiracle(event, state.agents, modifiers);
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
        hp: Math.min(
          BALANCE_CONFIG.INITIAL_HP +
            modifiersForHouse(state, agent.houseId).maxHpBonus,
          agent.hp + heal,
        ),
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
    divinePower:
      state.divinePower -
      definition.cost * modifiers.divineCostMultiplier,
    miracleCooldowns: {
      ...state.miracleCooldowns,
      [event.type]: definition.cooldownTicks,
    },
    activeEffects: [...state.activeEffects, outcome],
  };
}
