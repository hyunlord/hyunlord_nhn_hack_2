import type { Agent } from "../agents/agentTypes";
import type { Hall } from "./engine.types";

interface AgentDamage {
  readonly agentId: string;
  readonly amount: number;
}

interface HallDamage {
  readonly hallId: string;
  readonly amount: number;
}

export function applyThreatDamages(
  agents: readonly Agent[],
  damages: readonly AgentDamage[],
  tick: number,
): Agent[] {
  const totals = new Map<string, number>();
  for (const damage of damages) {
    totals.set(
      damage.agentId,
      (totals.get(damage.agentId) ?? 0) + damage.amount,
    );
  }
  return agents.map((agent) => {
    const damage = totals.get(agent.id);
    if (damage === undefined) {
      return agent;
    }
    const hp = Math.max(0, agent.hp - damage);
    return {
      ...agent,
      hp,
      state: hp === 0 ? "dead" : agent.state,
      lastDamagedTick: tick,
    };
  });
}

export function applyHallDamages(
  halls: readonly Hall[],
  damages: readonly HallDamage[],
): Hall[] {
  const totals = new Map<string, number>();
  for (const damage of damages) {
    totals.set(
      damage.hallId,
      (totals.get(damage.hallId) ?? 0) + damage.amount,
    );
  }
  return halls.map((hall) => ({
    ...hall,
    hp: Math.max(
      0,
      hall.hp - (totals.get(hall.houseId) ?? 0),
    ),
  }));
}
