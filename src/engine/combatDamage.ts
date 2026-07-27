import type { Agent } from "../agents/agentTypes";
import type { ResolvedModifiers } from "../progression/modifiers";
import { conditionalModifiers } from "../progression/modifiers";
import type { HouseProgress } from "../progression/progression.types";
import type { Hall } from "./engine.types";
import {
  maxHpForAgent,
  scheduleHeroDeath,
} from "./heroEngine";
import type {
  Tower,
  TowerDestroyed,
} from "../build/build.types";

interface AgentDamage {
  readonly agentId: string;
  readonly amount: number;
}

interface HallDamage {
  readonly hallId: string;
  readonly amount: number;
}

interface TowerDamage {
  readonly structureId: string;
  readonly amount: number;
}

interface TowerDamageResult {
  readonly towers: Tower[];
  readonly destroyed: TowerDestroyed[];
}

export function applyThreatDamages(
  agents: readonly Agent[],
  damages: readonly AgentDamage[],
  tick: number,
  modifiersByHouse: readonly {
    readonly houseId: string;
    readonly modifiers: ResolvedModifiers;
  }[],
  houseProgress: readonly HouseProgress[] = [],
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
    const modifiers = modifiersByHouse.find(
      ({ houseId }) => houseId === agent.houseId,
    )?.modifiers;
    if (modifiers === undefined) {
      throw new RangeError(`Missing modifiers for ${agent.houseId}.`);
    }
    const conditional = conditionalModifiers(
      houseProgress.find(
        ({ houseId }) => houseId === agent.houseId,
      )?.cards ?? [],
      {
        hallLowestHpRatio: 1,
        agentHpRatio:
          agent.hp / maxHpForAgent(agent, modifiers),
      },
    );
    const hp = Math.max(
      0,
      agent.hp -
        damage * (conditional.damageTakenMultiplier ?? 1),
    );
    const damaged = {
      ...agent,
      hp,
      state: hp === 0 ? "dead" : agent.state,
      lastDamagedTick: tick,
    };
    if (hp > 0) {
      return damaged;
    }
    return scheduleHeroDeath(damaged, tick, modifiers);
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

export function applyTowerDamages(
  towers: readonly Tower[],
  damages: readonly TowerDamage[],
  tick: number,
): TowerDamageResult {
  const totals = new Map<string, number>();
  for (const damage of damages) {
    totals.set(
      damage.structureId,
      (totals.get(damage.structureId) ?? 0) + damage.amount,
    );
  }
  const living: Tower[] = [];
  const destroyed: TowerDestroyed[] = [];
  for (const tower of towers) {
    const hp = Math.max(
      0,
      tower.hp - (totals.get(tower.id) ?? 0),
    );
    if (hp > 0) {
      living.push({ ...tower, hp });
      continue;
    }
    destroyed.push({
      id: tower.id,
      x: tower.x,
      y: tower.y,
      tick,
    });
  }
  destroyed.sort((first, second) => first.id.localeCompare(second.id));
  return { towers: living, destroyed };
}
