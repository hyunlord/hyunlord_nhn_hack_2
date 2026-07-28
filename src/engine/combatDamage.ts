import type { Agent } from "../agents/agentTypes";
import type { ResolvedModifiers } from "../progression/modifiers";
import { conditionalModifiers } from "../progression/modifiers";
import type { HouseProgress } from "../progression/progression.types";
import type { DefenseStructureId } from "../threat/threatTypes";
import type { Banner, Keep } from "./engine.types";
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

interface DefenseStructureDamage {
  readonly structureId: DefenseStructureId;
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

interface DefenseStructureDamageResult {
  readonly keep: Keep;
  readonly banners: Banner[];
}

export function applyThreatDamages(
  agents: readonly Agent[],
  damages: readonly AgentDamage[],
  tick: number,
  modifiersByHouse: readonly {
    readonly houseId: string;
    readonly agentId?: string;
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
    const modifiers =
      modifiersByHouse.find(({ agentId }) => agentId === agent.id)
        ?.modifiers ??
      modifiersByHouse.find(
        ({ houseId, agentId }) =>
          agentId === undefined && houseId === agent.houseId,
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

function bannerStructureId(banner: Banner): DefenseStructureId {
  return `banner:${banner.houseId}`;
}

export function applyDefenseStructureDamages(
  keep: Keep,
  banners: readonly Banner[],
  damages: readonly DefenseStructureDamage[],
): DefenseStructureDamageResult {
  const totals = new Map<string, number>();
  for (const damage of damages) {
    totals.set(
      damage.structureId,
      (totals.get(damage.structureId) ?? 0) + damage.amount,
    );
  }
  return {
    keep: {
      ...keep,
      hp: Math.max(0, keep.hp - (totals.get("keep") ?? 0)),
    },
    banners: banners.map((banner) => ({
      ...banner,
      hp: Math.max(
        0,
        banner.hp - (totals.get(bannerStructureId(banner)) ?? 0),
      ),
    })),
  };
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
