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
  spawnInvasion,
  stepThreat,
} from "../narrative/invasionDirector";
import type { ThreatEvent } from "../narrative/threatTypes";
import type { GameState } from "./engine.types";
import type { Rng } from "./prng";

type Point = { readonly x: number; readonly y: number };
type ThreatHit = {
  readonly creatureId: string | null;
  readonly amount: number;
};
type InvasionStep = Pick<
  GameState,
  "phase" | "houses" | "agents" | "activeThreat"
>;

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
  return threat.mage.hp > 0
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
    ...(threat.mage.hp > 0
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
    threat:
      hits.length === 0
        ? damagedThreat
        : { ...damagedThreat, engaged: true },
  };
}

function applyThreatDamages(
  agents: readonly Agent[],
  damages: readonly {
    readonly agentId: string;
    readonly amount: number;
  }[],
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

export function advanceInvasion(
  state: GameState,
  tick: number,
  rng: Rng,
): InvasionStep {
  const isSpawnTick =
    tick === BALANCE_CONFIG.INTERVENTION_DURATION_TICKS;
  const spawnedThreat = isSpawnTick
    ? spawnInvasion(
        state.houses.map(({ id }) => id),
        BALANCE_CONFIG.WORLD_WIDTH,
        BALANCE_CONFIG.WORLD_HEIGHT,
        tick,
        rng,
      )
    : state.activeThreat;
  const houses =
    isSpawnTick && spawnedThreat !== null
      ? state.houses.map((house) => ({
          ...house,
          isTraitor: house.id === spawnedThreat.traitorHouseId,
        }))
      : state.houses;
  let agents = moveAgents(state.agents, spawnedThreat, rng);
  let activeThreat = spawnedThreat;
  if (activeThreat !== null) {
    const attacks = applyAgentAttacks(agents, activeThreat, tick);
    const stepped = stepThreat(attacks.threat, attacks.agents, tick);
    agents = applyThreatDamages(attacks.agents, stepped.damages, tick);
    activeThreat = stepped.threat;
  }
  const observationTick =
    BALANCE_CONFIG.INTERVENTION_DURATION_TICKS +
    BALANCE_CONFIG.OBSERVATION_HANDOFF_TICKS;
  const phase =
    activeThreat !== null &&
    (activeThreat.engaged || tick >= observationTick)
      ? "observation"
      : isSpawnTick
        ? "invasion"
        : state.phase;

  return { phase, houses, agents, activeThreat };
}
