import type {
  Agent,
  AgentState,
  ThreatPresence,
} from "./agentTypes";
import { BALANCE_CONFIG } from "../content/balanceConfig";

export type AgentIntent =
  | { readonly kind: "idle" }
  | {
      readonly kind: "flee";
      readonly fromX: number;
      readonly fromY: number;
    }
  | {
      readonly kind: "engage";
      readonly towardX: number;
      readonly towardY: number;
    };

export function decideIntent(
  agent: Agent,
  threats: readonly ThreatPresence[],
  isTraitorHouse: boolean,
): AgentIntent {
  if (agent.state === "dead") {
    return { kind: "idle" };
  }

  const nearestThreat = threats.reduce<{
    readonly threat: ThreatPresence;
    readonly distanceSquared: number;
  } | null>((nearest, threat) => {
    if (!threat.hostile) {
      return nearest;
    }
    const deltaX = threat.x - agent.x;
    const deltaY = threat.y - agent.y;
    const distanceSquared = deltaX * deltaX + deltaY * deltaY;
    if (
      distanceSquared >
      BALANCE_CONFIG.AGENT_THREAT_SENSE_RADIUS ** 2
    ) {
      return nearest;
    }
    return nearest === null ||
      distanceSquared < nearest.distanceSquared
      ? { threat, distanceSquared }
      : nearest;
  }, null);
  if (nearestThreat === null) {
    return { kind: "idle" };
  }

  if (
    isTraitorHouse &&
    agent.disposition.loyalty <
      BALANCE_CONFIG.TRAITOR_SABOTAGE_LOYALTY_CEILING
  ) {
    return {
      kind: "flee",
      fromX: nearestThreat.threat.x,
      fromY: nearestThreat.threat.y,
    };
  }

  if (
    agent.disposition.aggression >=
    BALANCE_CONFIG.AGENT_FIGHT_AGGRESSION_THRESHOLD
  ) {
    return {
      kind: "engage",
      towardX: nearestThreat.threat.x,
      towardY: nearestThreat.threat.y,
    };
  }

  return {
    kind: "flee",
    fromX: nearestThreat.threat.x,
    fromY: nearestThreat.threat.y,
  };
}

export function intentToState(intent: AgentIntent): AgentState {
  switch (intent.kind) {
    case "idle":
      return "idle";
    case "flee":
      return "fleeing";
    case "engage":
      return "fighting";
  }
}
