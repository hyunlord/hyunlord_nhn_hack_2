import type { Agent } from "../agents/agentTypes";
import { SHOP_EFFECT_VALUES } from "../build/shopEffects";
import type { GameState } from "./engine.types";
import { maxHpForAgent, respawnHeroNow } from "./heroEngine";
import { populationCapForHouse } from "./population";
import { modifiersForAgent } from "./progressionEngine";

function livingRegularCount(state: GameState, houseId: string): number {
  return state.agents.filter(
    (agent) =>
      !agent.isHero &&
      agent.houseId === houseId &&
      agent.hp > 0,
  ).length;
}

function levelForHouse(state: GameState, houseId: string): number {
  return state.houseProgress.find(
    (progress) => progress.houseId === houseId,
  )?.level ?? 1;
}

export function eligibleDeadRegulars(state: GameState): Agent[] {
  const livingHallHouses = new Set(
    state.halls
      .filter(({ hp }) => hp > 0)
      .map(({ houseId }) => houseId),
  );
  return state.agents.filter((agent) => {
    if (
      agent.isHero ||
      agent.hp > 0 ||
      !livingHallHouses.has(agent.houseId)
    ) {
      return false;
    }
    return (
      livingRegularCount(state, agent.houseId) <
      populationCapForHouse(agent.houseId, levelForHouse(state, agent.houseId))
    );
  });
}

export function reviveRecruitSquadAgents(state: GameState): Agent[] {
  const dead = eligibleDeadRegulars(state);
  const candidateHouse = [...new Set(dead.map(({ houseId }) => houseId))]
    .sort(
      (first, second) =>
        livingRegularCount(state, first) - livingRegularCount(state, second) ||
        first.localeCompare(second),
    )[0];
  const hall = state.halls.find(
    ({ houseId, hp }) => houseId === candidateHouse && hp > 0,
  );
  if (candidateHouse === undefined || hall === undefined) {
    return state.agents;
  }
  const availableCapacity = Math.max(
    0,
    populationCapForHouse(candidateHouse, levelForHouse(state, candidateHouse)) -
      livingRegularCount(state, candidateHouse),
  );
  const revivedIds = new Set(
    dead
      .filter(({ houseId }) => houseId === candidateHouse)
      .sort((first, second) => first.id.localeCompare(second.id))
      .slice(
        0,
        Math.min(SHOP_EFFECT_VALUES.recruitSquadCount, availableCapacity),
      )
      .map(({ id }) => id),
  );
  return state.agents.map((agent) =>
    revivedIds.has(agent.id)
      ? {
          ...agent,
          x: hall.x,
          y: hall.y,
          hp: maxHpForAgent(agent, modifiersForAgent(state, agent)),
          state: "idle" as const,
          lastDamagedTick: -1,
          lastAttackTick: state.tick,
        }
      : agent,
  );
}

export function healLivingAgents(state: GameState): Agent[] {
  return state.agents.map((agent) =>
    agent.hp <= 0
      ? agent
      : {
          ...agent,
          hp: Math.max(
            agent.hp,
            Math.min(
              maxHpForAgent(agent, modifiersForAgent(state, agent)),
              agent.hp + SHOP_EFFECT_VALUES.fieldMedicineHeal,
            ),
          ),
        },
  );
}

export function reinforceMostDamagedHall(
  state: GameState,
): GameState["halls"] {
  const target = [...state.halls]
    .filter(({ hp, maxHp }) => hp > 0 && hp < maxHp)
    .sort(
      (first, second) =>
        second.maxHp - second.hp - (first.maxHp - first.hp) ||
        first.houseId.localeCompare(second.houseId),
    )[0];
  return target === undefined
    ? state.halls
    : state.halls.map((hall) =>
        hall.houseId === target.houseId
          ? {
              ...hall,
              hp: Math.min(hall.maxHp, hall.hp + SHOP_EFFECT_VALUES.hallRepair),
            }
          : hall,
      );
}

export function reviveHero(state: GameState): Agent[] {
  const hero = [...state.agents]
    .filter(({ isHero, hp }) => isHero && hp <= 0)
    .sort((first, second) => first.id.localeCompare(second.id))[0];
  if (hero === undefined) {
    return state.agents;
  }
  return state.agents.map((agent) =>
    agent.id === hero.id
      ? respawnHeroNow(
          agent,
          state.halls,
          [{
            agentId: agent.id,
            houseId: agent.houseId,
            modifiers: modifiersForAgent(state, agent),
          }],
          state.tick,
        )
      : agent,
  );
}
