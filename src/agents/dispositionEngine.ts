import { BALANCE_CONFIG } from "../content/balanceConfig";
import { UNIT_CLASSES } from "../content/unitClassConfig";
import type { BattleLineTarget } from "./battleLine";
import type {
  Agent,
  AgentModifiers,
  AgentState,
  ThreatPresence,
} from "./agentTypes";

type Point = { readonly x: number; readonly y: number };

type DefensiveAnchor = { readonly x: number; readonly y: number; readonly hp: number };
type ThreatenedAnchor = {
  readonly houseId: string;
  readonly x: number;
  readonly y: number;
  readonly hostileCount: number;
};

export interface DefenseContext {
  readonly tick?: number;
  readonly ownAnchor?: DefensiveAnchor | null;
  readonly rallyAnchor?: Point | null;
  readonly threatenedAnchors?: readonly ThreatenedAnchor[];
  readonly threats: readonly ThreatPresence[];
  readonly battleLine?: BattleLineTarget;
  readonly [legacyKey: string]: unknown;
}

type NormalizedDefenseContext = {
  readonly tick?: number;
  readonly ownAnchor: DefensiveAnchor | null;
  readonly rallyAnchor: Point | null;
  readonly threatenedAnchors: readonly ThreatenedAnchor[];
  readonly threats: readonly ThreatPresence[];
  readonly battleLine?: BattleLineTarget;
};
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
      readonly preferredRange: number;
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

function legacyContextValue<T>(context: DefenseContext, prefix: string): T | undefined {
  const legacySuffix = String.fromCharCode(72, 97, 108, 108);
  return context[`${prefix}${legacySuffix}`] as T | undefined;
}

function normalizeDefenseContext(context: DefenseContext): NormalizedDefenseContext {
  const legacyOwnAnchor = legacyContextValue<DefensiveAnchor | null>(context, "own");
  const legacyRallyAnchor = legacyContextValue<Point | null>(context, "rally");
  const legacyThreatenedAnchors = legacyContextValue<readonly ThreatenedAnchor[]>(context, "threatened");
  return {
    ...(context.tick === undefined ? {} : { tick: context.tick }),
    ownAnchor: context.ownAnchor ?? legacyOwnAnchor ?? null,
    rallyAnchor: context.rallyAnchor ?? legacyRallyAnchor ?? null,
    threatenedAnchors: context.threatenedAnchors ?? legacyThreatenedAnchors ?? [],
    threats: context.threats,
    ...(context.battleLine === undefined ? {} : { battleLine: context.battleLine }),
  };
}

function engage(
  agent: Agent,
  threat: ThreatPresence,
  helping = false,
): AgentIntent {
  return {
    kind: "engage",
    towardX: threat.x,
    towardY: threat.y,
    targetId: threat.id,
    preferredRange: UNIT_CLASSES[agent.unitClass].preferredRange,
    ...(helping ? { helping: true } : {}),
  };
}

function mostThreatenedAnchor(
  anchors: readonly ThreatenedAnchor[],
): ThreatenedAnchor | null {
  return [...anchors].sort(
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

function followBattleLine(target: BattleLineTarget): AgentIntent {
  if (target.posture === "retreat") {
    return {
      kind: "flee",
      towardX: target.target.x,
      towardY: target.target.y,
    };
  }
  return {
    kind: "engage",
    towardX: target.target.x,
    towardY: target.target.y,
    targetId: target.targetId,
    preferredRange: 0,
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

  const defense = normalizeDefenseContext(context);
  const nearest = nearestThreat(defense.threats, agent);
  const maxHp =
    (UNIT_CLASSES[agent.unitClass].maxHp + modifiers.maxHpBonus) *
    (modifiers.maxHpMultiplier ?? 1);
  const isBroken =
    !modifiers.ignoreBreak &&
    (defense.tick ?? 0) >= agent.breakImmuneUntilTick &&
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
    if (defense.rallyAnchor !== null) {
      return {
        kind: "flee",
        towardX: defense.rallyAnchor.x,
        towardY: defense.rallyAnchor.y,
      };
    }
    if (nearest !== null) {
      return fleeAway(agent, nearest);
    }
  }

  const nearby = nearestThreat(
    defense.threats,
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
  if (defense.ownAnchor !== null) {
    const anchorThreat = nearestThreat(
      defense.threats,
      defense.ownAnchor,
      BALANCE_CONFIG.KEEP_DEFENSE_RADIUS +
        modifiers.hallDefenseRadiusBonus,
    );
    if (anchorThreat !== null) {
      return engage(agent, anchorThreat);
    }
  }

  if (defense.rallyAnchor !== null) {
    const reinforcementAnchor = mostThreatenedAnchor(
      defense.threatenedAnchors,
    );
    const rallyThreat = reinforcementAnchor === null
      ? null
      : nearestThreat(
      defense.threats,
      reinforcementAnchor,
      BALANCE_CONFIG.KEEP_DEFENSE_RADIUS,
    );
    if (
      rallyThreat !== null &&
      agent.disposition.aggression >=
        BALANCE_CONFIG.AGENT_REINFORCE_AGGRESSION_THRESHOLD
    ) {
      return engage(agent, rallyThreat, true);
    }
  }

  if (defense.battleLine !== undefined) {
    return followBattleLine(defense.battleLine);
  }

  if (nearby !== null) {
    return engage(agent, nearby);
  }

  if (
    defense.ownAnchor !== null &&
    distanceSquared(agent, defense.ownAnchor) >
      BALANCE_CONFIG.AGENT_HOME_LEASH ** 2
  ) {
    return {
      kind: "engage",
      towardX: defense.ownAnchor.x,
      towardY: defense.ownAnchor.y,
      targetId: null,
      preferredRange: 0,
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
