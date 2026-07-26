import { BALANCE_CONFIG } from "../content/balanceConfig";
import type { Rng } from "../content/random";
import type { AgentIntent } from "./dispositionEngine";
import type { Agent } from "./agentTypes";

const FULL_TURN = Math.PI * 2;
const TURN_RANGE = 0.8;

function normalizeHeading(heading: number): number {
  return ((heading % FULL_TURN) + FULL_TURN) % FULL_TURN;
}

export function stepAgent(
  agent: Agent,
  rng: Rng,
  intent: AgentIntent = { kind: "idle" },
): Agent {
  if (agent.state === "dead") {
    return agent;
  }

  let heading: number;
  let speed: number;
  switch (intent.kind) {
    case "idle":
      heading = agent.heading;
      if (rng.next() < BALANCE_CONFIG.WANDER_TURN_CHANCE) {
        heading += rng.range(-TURN_RANGE, TURN_RANGE);
      }
      speed = BALANCE_CONFIG.WANDER_SPEED;
      break;
    case "flee":
      heading = Math.atan2(
        agent.y - intent.fromY,
        agent.x - intent.fromX,
      );
      speed =
        BALANCE_CONFIG.WANDER_SPEED *
        BALANCE_CONFIG.AGENT_FLEE_SPEED_MULTIPLIER;
      break;
    case "engage":
      heading = Math.atan2(
        intent.towardY - agent.y,
        intent.towardX - agent.x,
      );
      speed =
        BALANCE_CONFIG.WANDER_SPEED *
        BALANCE_CONFIG.AGENT_ENGAGE_SPEED_MULTIPLIER;
      break;
  }

  const minimum = BALANCE_CONFIG.AGENT_RADIUS;
  const maximumX = BALANCE_CONFIG.WORLD_WIDTH - minimum;
  const maximumY = BALANCE_CONFIG.WORLD_HEIGHT - minimum;
  let x = agent.x + Math.cos(heading) * speed;
  let y = agent.y + Math.sin(heading) * speed;

  if (x < minimum || x > maximumX) {
    x = Math.min(maximumX, Math.max(minimum, x));
    heading = Math.PI - heading;
  }
  if (y < minimum || y > maximumY) {
    y = Math.min(maximumY, Math.max(minimum, y));
    heading = -heading;
  }

  return {
    ...agent,
    x,
    y,
    heading: normalizeHeading(heading),
  };
}
