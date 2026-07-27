import {
  decideIntent,
  intentToState,
} from "../agents/dispositionEngine";
import { stepAgent } from "../agents/movement";
import type {
  Agent,
  ThreatPresence,
} from "../agents/agentTypes";
import { BALANCE_CONFIG } from "../content/balanceConfig";
import {
  applyDamageToThreat,
  stepThreat,
} from "../threat/waveDirector";
import type { ThreatEvent } from "../threat/threatTypes";
import type { GameState } from "./engine.types";
import type { Rng } from "./prng";
import {
  applyHallDamages,
  applyThreatDamages,
} from "./combatDamage";

type Point = { readonly x: number; readonly y: number };
type ThreatHit = {
  readonly creatureId: string | null;
  readonly amount: number;
};
type WaveCombatStep = Pick<
  GameState,
  "agents" | "halls" | "activeThreat"
> & {
  readonly creatureKills: number;
};

function distanceSquared(first: Point, second: Point): number {
  return (first.x - second.x) ** 2 + (first.y - second.y) ** 2;
}

function toThreatPresences(threat: ThreatEvent | null): ThreatPresence[] {
  if (threat === null) {
    return [];
  }
  const presences = threat.creatures.map(({ x, y }) => ({
    x,
    y,
    hostile: true,
  }));
  return threat.mage !== null && threat.mage.hp > 0
    ? [
        ...presences,
        { x: threat.mage.x, y: threat.mage.y, hostile: true },
      ]
    : presences;
}

function moveAgents(
  agents: readonly Agent[],
  threat: ThreatEvent | null,
  rng: Rng,
): Agent[] {
  const threats = toThreatPresences(threat);
  const decisions = agents.map((agent) => {
    const intent = decideIntent(
      agent,
      threats,
      threat?.traitorHouseId === agent.houseId,
    );
    return { agent: stepAgent(agent, rng, intent), intent };
  });
  const movedAgents = decisions.map(({ agent }) => agent);

  return decisions.map(({ agent, intent }) => {
    if (agent.state === "dead") {
      return agent;
    }
    const state = intentToState(intent);
    if (intent.kind !== "engage") {
      return { ...agent, state };
    }
    const target = { x: intent.towardX, y: intent.towardY };
    const nearestVictim = [...movedAgents]
      .filter((candidate) => candidate.state !== "dead" && candidate.hp > 0)
      .sort((first, second) => {
        const delta =
          distanceSquared(first, target) -
          distanceSquared(second, target);
        return delta === 0
          ? first.id.localeCompare(second.id)
          : delta;
      })[0];
    return {
      ...agent,
      state:
        nearestVictim !== undefined &&
        nearestVictim.houseId !== agent.houseId
          ? "helping"
          : state,
    };
  });
}

function applyAgentAttacks(
  agents: readonly Agent[],
  threat: ThreatEvent,
  tick: number,
): { readonly agents: Agent[]; readonly threat: ThreatEvent } {
  const hits: ThreatHit[] = [];
  const targets = [
    ...threat.creatures.map((creature) => ({
      key: creature.id,
      creatureId: creature.id,
      x: creature.x,
      y: creature.y,
    })),
    ...(threat.mage !== null && threat.mage.hp > 0
      ? [{
          key: "mage",
          creatureId: null,
          x: threat.mage.x,
          y: threat.mage.y,
        }]
      : []),
  ];
  const nextAgents = agents.map((agent) => {
    const canAttack =
      agent.hp > 0 &&
      (agent.state === "fighting" || agent.state === "helping") &&
      tick - agent.lastAttackTick >=
        BALANCE_CONFIG.AGENT_ATTACK_INTERVAL_TICKS;
    if (!canAttack) {
      return agent;
    }
    const target = [...targets]
      .filter(
        (candidate) =>
          distanceSquared(agent, candidate) <=
          BALANCE_CONFIG.AGENT_ATTACK_RANGE ** 2,
      )
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
    hits.push({
      creatureId: target.creatureId,
      amount: BALANCE_CONFIG.AGENT_ATTACK_DAMAGE,
    });
    return { ...agent, lastAttackTick: tick };
  });
  const damagedThreat = applyDamageToThreat(threat, hits);
  return {
    agents: nextAgents,
    threat: damagedThreat,
  };
}

export function advanceWaveCombat(
  state: GameState,
  tick: number,
  rng: Rng,
): WaveCombatStep {
  if (state.activeThreat === null) {
    return {
      agents: state.agents,
      halls: state.halls,
      activeThreat: null,
      creatureKills: 0,
    };
  }

  const initialCreatureCount = state.activeThreat.creatures.length;
  const movedAgents = moveAgents(state.agents, state.activeThreat, rng);
  const attacks = applyAgentAttacks(
    movedAgents,
    state.activeThreat,
    tick,
  );
  const stepped = stepThreat(
    attacks.threat,
    attacks.agents,
    state.halls.map(({ houseId, x, y, hp }) => ({
      id: houseId,
      x,
      y,
      hp,
    })),
    tick,
  );

  return {
    agents: applyThreatDamages(
      attacks.agents,
      stepped.agentDamages,
      tick,
    ),
    halls: applyHallDamages(state.halls, stepped.hallDamages),
    activeThreat: stepped.threat,
    creatureKills:
      initialCreatureCount - stepped.threat.creatures.length,
  };
}
