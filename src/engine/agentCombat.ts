import type { Agent } from "../agents/agentTypes";
import type { AgentIntent } from "../agents/dispositionEngine";
import { BALANCE_CONFIG } from "../content/balanceConfig";
import { applyDamageToThreat } from "../threat/waveDirector";
import type { ThreatEvent } from "../threat/threatTypes";
import type { ResolvedModifiers } from "../progression/modifiers";
import { xpForDamage, xpForKill } from "../progression/xp";

type Point = { readonly x: number; readonly y: number };
type ThreatHit = {
  readonly creatureId: string | null;
  readonly amount: number;
};
type HouseAmount = {
  readonly houseId: string;
  readonly amount: number;
};

export type AgentDecision = {
  readonly agent: Agent;
  readonly intent: AgentIntent;
};

function distanceSquared(first: Point, second: Point): number {
  return (first.x - second.x) ** 2 + (first.y - second.y) ** 2;
}

export function applyAgentAttacks(
  decisions: readonly AgentDecision[],
  threat: ThreatEvent,
  tick: number,
  modifiersByHouse: ReadonlyMap<string, ResolvedModifiers>,
): {
  readonly agents: Agent[];
  readonly threat: ThreatEvent;
  readonly xpAwards: HouseAmount[];
  readonly creatureKillsByHouse: HouseAmount[];
} {
  let currentThreat = threat;
  const xpByHouse = new Map<string, number>();
  const creatureKillsByHouse = new Map<string, number>();
  const nextAgents = decisions.map(({ agent, intent }) => {
    const modifiers = modifiersByHouse.get(agent.houseId);
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
            BALANCE_CONFIG.AGENT_ATTACK_INTERVAL_TICKS *
              modifiers.attackIntervalMultiplier,
          ),
        );
    if (!canAttack) {
      return agent;
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
        BALANCE_CONFIG.AGENT_ATTACK_RANGE ** 2,
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
      return agent;
    }
    const amount =
      BALANCE_CONFIG.AGENT_ATTACK_DAMAGE *
      modifiers.attackDamageMultiplier;
    const hit: ThreatHit = {
      creatureId: target.creatureId,
      amount,
    };
    const actualDamage = Math.min(target.hp, amount);
    currentThreat = applyDamageToThreat(currentThreat, [hit]);
    const killed = actualDamage >= target.hp;
    xpByHouse.set(
      agent.houseId,
      (xpByHouse.get(agent.houseId) ?? 0) +
        xpForDamage(actualDamage) +
        (killed ? xpForKill() : 0),
    );
    if (killed && target.creatureId !== null) {
      creatureKillsByHouse.set(
        agent.houseId,
        (creatureKillsByHouse.get(agent.houseId) ?? 0) + 1,
      );
    }
    return { ...agent, lastAttackTick: tick };
  });
  return {
    agents: nextAgents,
    threat: currentThreat,
    xpAwards: [...xpByHouse.entries()]
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([houseId, amount]) => ({ houseId, amount })),
    creatureKillsByHouse: [...creatureKillsByHouse.entries()]
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([houseId, amount]) => ({ houseId, amount })),
  };
}
