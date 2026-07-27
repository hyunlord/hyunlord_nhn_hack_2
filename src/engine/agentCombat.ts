import type { Agent } from "../agents/agentTypes";
import type { AgentIntent } from "../agents/dispositionEngine";
import { UNIT_CLASSES } from "../content/unitClassConfig";
import { applyDamageToThreat } from "../threat/waveDirector";
import type { ThreatEvent } from "../threat/threatTypes";
import type { ResolvedModifiers } from "../progression/modifiers";
import { conditionalModifiers } from "../progression/modifiers";
import type { HouseProgress } from "../progression/progression.types";
import { xpForDamage, xpForKill } from "../progression/xp";
import {
  maxHpForAgent,
  type AgentCombatBonus,
} from "./heroEngine";
import type { RangedAttackEffect } from "./engine.types";

type Point = { readonly x: number; readonly y: number };
type ThreatHit = {
  readonly creatureId: string | null;
  readonly amount: number;
};
type HouseAmount = {
  readonly houseId: string;
  readonly amount: number;
};
type HeroAmount = {
  readonly heroId: string;
  readonly amount: number;
};

export type AgentDecision = {
  readonly agent: Agent;
  readonly intent: AgentIntent;
};

interface ConditionalCombatContext {
  readonly houseProgress?: readonly HouseProgress[];
  readonly hallLowestHpRatio?: number;
}

function distanceSquared(first: Point, second: Point): number {
  return (first.x - second.x) ** 2 + (first.y - second.y) ** 2;
}

export function applyAgentAttacks(
  decisions: readonly AgentDecision[],
  threat: ThreatEvent,
  tick: number,
  modifiersByHouse: ReadonlyMap<string, ResolvedModifiers>,
  bonusesByAgentId: ReadonlyMap<string, AgentCombatBonus> = new Map(),
  conditionalContext: ConditionalCombatContext = {},
): {
  readonly agents: Agent[];
  readonly threat: ThreatEvent;
  readonly xpAwards: HouseAmount[];
  readonly heroXpAwards: HeroAmount[];
  readonly creatureKillsByHouse: HouseAmount[];
  readonly rangedAttackEffects: RangedAttackEffect[];
} {
  let currentThreat = threat;
  const xpByHouse = new Map<string, number>();
  const xpByHero = new Map<string, number>();
  const creatureKillsByHouse = new Map<string, number>();
  let nextAgents = decisions.map(({ agent }) => agent);
  const rangedAttackEffects: RangedAttackEffect[] = [];
  decisions.forEach(({ intent }, agentIndex) => {
    const agent = nextAgents[agentIndex];
    if (agent === undefined) {
      return;
    }
    const modifiers =
      modifiersByHouse.get(agent.id) ??
      modifiersByHouse.get(agent.houseId);
    if (modifiers === undefined) {
      throw new RangeError(`Missing modifiers for ${agent.houseId}.`);
    }
    const canAttack =
      agent.hp > 0 &&
      (agent.state === "fighting" || agent.state === "helping") &&
      tick - agent.lastAttackTick >=
        Math.max(
          1,
          Math.round(
            UNIT_CLASSES[agent.unitClass].attackIntervalTicks *
              modifiers.attackIntervalMultiplier *
              (bonusesByAgentId.get(agent.id)?.attackIntervalMultiplier ?? 1),
          ),
        );
    if (!canAttack) {
      return;
    }
    const targets = [
      ...currentThreat.creatures.map((creature) => ({
        key: creature.id,
        creatureId: creature.id,
        x: creature.x,
        y: creature.y,
        hp: creature.hp,
      })),
      ...(currentThreat.mage !== null && currentThreat.mage.hp > 0
        ? [{
            key: "mage",
            creatureId: null,
            x: currentThreat.mage.x,
            y: currentThreat.mage.y,
            hp: currentThreat.mage.hp,
          }]
        : []),
    ];
    const inRangeTargets = targets.filter(
      (candidate) =>
        distanceSquared(agent, candidate) <=
        UNIT_CLASSES[agent.unitClass].attackRange ** 2,
    );
    const focusedTarget =
      intent.kind === "engage" && intent.targetId !== null
        ? inRangeTargets.find(
            (candidate) => candidate.key === intent.targetId,
          )
        : undefined;
    const target = focusedTarget ?? [...inRangeTargets]
      .sort((first, second) => {
        const delta =
          distanceSquared(agent, first) -
          distanceSquared(agent, second);
        return delta === 0
          ? first.key.localeCompare(second.key)
          : delta;
      })[0];
    if (target === undefined) {
      return;
    }
    const amount =
      UNIT_CLASSES[agent.unitClass].attackDamage *
      modifiers.attackDamageMultiplier *
      (bonusesByAgentId.get(agent.id)?.damageMultiplier ?? 1) *
      (
        conditionalModifiers(
          conditionalContext.houseProgress?.find(
            ({ houseId }) => houseId === agent.houseId,
          )?.cards ?? [],
          {
            hallLowestHpRatio:
              conditionalContext.hallLowestHpRatio ?? 1,
            agentHpRatio:
              agent.hp / maxHpForAgent(agent, modifiers),
          },
        ).attackDamageMultiplier ?? 1
      );
    const hit: ThreatHit = {
      creatureId: target.creatureId,
      amount,
    };
    const actualDamage = Math.min(target.hp, amount);
    currentThreat = applyDamageToThreat(currentThreat, [hit]);
    if (Math.sqrt(distanceSquared(agent, target)) > 25) {
      rangedAttackEffects.push({
        attackerId: agent.id,
        houseId: agent.houseId,
        fromX: agent.x,
        fromY: agent.y,
        toX: target.x,
        toY: target.y,
        startTick: tick,
        durationTicks: 4,
      });
    }
    const killed = actualDamage >= target.hp;
    const xp =
      xpForDamage(actualDamage) +
      (killed ? xpForKill() : 0);
    xpByHouse.set(
      agent.houseId,
      (xpByHouse.get(agent.houseId) ?? 0) + xp,
    );
    if (agent.isHero && agent.heroId !== null) {
      xpByHero.set(
        agent.heroId,
        (xpByHero.get(agent.heroId) ?? 0) + xp,
      );
    }
    if (killed && target.creatureId !== null) {
      creatureKillsByHouse.set(
        agent.houseId,
        (creatureKillsByHouse.get(agent.houseId) ?? 0) + 1,
      );
    }
    const bonus = bonusesByAgentId.get(agent.id);
    if (
      killed &&
      bonus !== undefined &&
      bonus.onKillHeal > 0 &&
      bonus.onKillHealRadius > 0
    ) {
      nextAgents = nextAgents.map((candidate) => {
        if (
          candidate.hp <= 0 ||
          distanceSquared(agent, candidate) >
            bonus.onKillHealRadius ** 2
        ) {
          return candidate;
        }
        const candidateModifiers =
          modifiersByHouse.get(candidate.id) ??
          modifiersByHouse.get(candidate.houseId);
        if (candidateModifiers === undefined) {
          throw new RangeError(
            `Missing modifiers for ${candidate.houseId}.`,
          );
        }
        return {
          ...candidate,
          hp: Math.max(
            candidate.hp,
            Math.min(
              maxHpForAgent(candidate, candidateModifiers),
              candidate.hp + bonus.onKillHeal,
            ),
          ),
        };
      });
    }
    const updatedAttacker = nextAgents[agentIndex];
    if (updatedAttacker !== undefined) {
      nextAgents[agentIndex] = {
        ...updatedAttacker,
        lastAttackTick: tick,
      };
    }
  });
  return {
    agents: nextAgents,
    threat: currentThreat,
    xpAwards: [...xpByHouse.entries()]
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([houseId, amount]) => ({ houseId, amount })),
    heroXpAwards: [...xpByHero.entries()]
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([heroId, amount]) => ({ heroId, amount })),
    creatureKillsByHouse: [...creatureKillsByHouse.entries()]
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([houseId, amount]) => ({ houseId, amount })),
    rangedAttackEffects,
  };
}
