import { BALANCE_CONFIG } from "../content/balanceConfig";
import type {
  Agent,
  AgentModifiers,
  AgentState,
  ThreatPresence,
} from "./agentTypes";

type Point = { readonly x: number; readonly y: number };

export interface DefenseContext {
  readonly tick?: number;
  readonly ownHall: { readonly x: number; readonly y: number; readonly hp: number } | null;
  readonly rallyHall: Point | null;
  readonly threatenedHalls: readonly {
    readonly houseId: string;
    readonly x: number;
    readonly y: number;
    readonly hostileCount: number;
  }[];
  readonly threats: readonly ThreatPresence[];
}

export type AgentIntent =
  | { readonly kind: "idle" }
  | {
      readonly kind: "flee";
      readonly towardX: number;
      readonly towardY: number;
    }
  | {
      readonly kind: "engage";
      readonly towardX: number;
      readonly towardY: number;
      readonly targetId: string | null;
      readonly helping?: boolean;
    };

function distanceSquared(first: Point, second: Point): number {
  return (first.x - second.x) ** 2 + (first.y - second.y) ** 2;
}

function nearestThreat(
  threats: readonly ThreatPresence[],
  point: Point,
  radius: number = Number.POSITIVE_INFINITY,
): ThreatPresence | null {
  const radiusSquared = radius ** 2;
  return [...threats]
    .filter(
      (candidate) =>
        candidate.hostile &&
        distanceSquared(candidate, point) <= radiusSquared,
    )
    .sort((first, second) => {
      const delta =
        distanceSquared(first, point) - distanceSquared(second, point);
      return delta === 0 ? first.id.localeCompare(second.id) : delta;
    })[0] ?? null;
}

function engage(
  threat: ThreatPresence,
  helping = false,
): AgentIntent {
  return {
    kind: "engage",
    towardX: threat.x,
    towardY: threat.y,
    targetId: threat.id,
    ...(helping ? { helping: true } : {}),
  };
}

function mostThreatenedHall(
  halls: DefenseContext["threatenedHalls"],
): DefenseContext["threatenedHalls"][number] | null {
  return [...halls].sort(
    (first, second) =>
      second.hostileCount - first.hostileCount ||
      first.houseId.localeCompare(second.houseId),
  )[0] ?? null;
}

function fleeAway(agent: Agent, threat: ThreatPresence): AgentIntent {
  return {
    kind: "flee",
    towardX: agent.x + (agent.x - threat.x),
    towardY: agent.y + (agent.y - threat.y),
  };
}

export function decideIntent(
  agent: Agent,
  context: DefenseContext,
  isTraitorHouse: boolean,
  modifiers: AgentModifiers = {
    attackDamageMultiplier: 1,
    attackIntervalMultiplier: 1,
    maxHpBonus: 0,
    moveSpeedMultiplier: 1,
    threatSenseRadiusBonus: 0,
    breakHpRatioDelta: 0,
    hallDefenseRadiusBonus: 0,
  },
): AgentIntent {
  if (agent.state === "dead" || agent.hp <= 0) {
    return { kind: "idle" };
  }

  const nearest = nearestThreat(context.threats, agent);
  const maxHp =
    (BALANCE_CONFIG.INITIAL_HP + modifiers.maxHpBonus) *
    (modifiers.maxHpMultiplier ?? 1);
  const isBroken =
    !modifiers.ignoreBreak &&
    (context.tick ?? 0) >= agent.breakImmuneUntilTick &&
    agent.hp <
      maxHp *
        Math.max(
          0,
          BALANCE_CONFIG.AGENT_BREAK_HP_RATIO +
            modifiers.breakHpRatioDelta,
        ) &&
    agent.disposition.aggression <
      BALANCE_CONFIG.AGENT_HOLD_AGGRESSION_THRESHOLD;
  if (isBroken && !agent.isHero) {
    if (context.rallyHall !== null) {
      return {
        kind: "flee",
        towardX: context.rallyHall.x,
        towardY: context.rallyHall.y,
      };
    }
    if (nearest !== null) {
      return fleeAway(agent, nearest);
    }
  }

  const nearby = nearestThreat(
    context.threats,
    agent,
    BALANCE_CONFIG.AGENT_THREAT_SENSE_RADIUS +
      modifiers.threatSenseRadiusBonus,
  );
  if (
    !agent.isHero &&
    isTraitorHouse &&
    agent.disposition.loyalty <
      BALANCE_CONFIG.TRAITOR_SABOTAGE_LOYALTY_CEILING &&
    nearby !== null
  ) {
    return fleeAway(agent, nearby);
  }
  if (nearby !== null) {
    return engage(nearby);
  }

  if (context.ownHall !== null) {
    const hallThreat = nearestThreat(
      context.threats,
      context.ownHall,
      BALANCE_CONFIG.HALL_DEFENSE_RADIUS +
        modifiers.hallDefenseRadiusBonus,
    );
    if (hallThreat !== null) {
      return engage(hallThreat);
    }
  }

  if (context.rallyHall !== null) {
    const reinforcementHall = mostThreatenedHall(
      context.threatenedHalls,
    );
    const rallyThreat = reinforcementHall === null
      ? null
      : nearestThreat(
      context.threats,
      reinforcementHall,
      BALANCE_CONFIG.HALL_DEFENSE_RADIUS,
    );
    if (
      rallyThreat !== null &&
      agent.disposition.aggression >=
        BALANCE_CONFIG.AGENT_REINFORCE_AGGRESSION_THRESHOLD
    ) {
      return engage(rallyThreat, true);
    }
  }

  if (
    context.ownHall !== null &&
    distanceSquared(agent, context.ownHall) >
      BALANCE_CONFIG.AGENT_HOME_LEASH ** 2
  ) {
    return {
      kind: "engage",
      towardX: context.ownHall.x,
      towardY: context.ownHall.y,
      targetId: null,
    };
  }
  return { kind: "idle" };
}

export function intentToState(intent: AgentIntent): AgentState {
  switch (intent.kind) {
    case "idle":
      return "idle";
    case "flee":
      return "fleeing";
    case "engage":
      return intent.helping === true ? "helping" : "fighting";
  }
}
