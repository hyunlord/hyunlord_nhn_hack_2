import { BALANCE_CONFIG } from "../content/balanceConfig";
import type { Rng } from "../content/random";
import { UNIT_CLASSES } from "../content/unitClassConfig";
import type { AgentIntent } from "./dispositionEngine";
import type { Agent, AgentModifiers } from "./agentTypes";

const FULL_TURN = Math.PI * 2;
const TURN_RANGE = 0.8;

function normalizeHeading(heading: number): number {
  return ((heading % FULL_TURN) + FULL_TURN) % FULL_TURN;
}

export function stepAgent(
  agent: Agent,
  rng: Rng,
  intent: AgentIntent = { kind: "idle" },
  modifiers: Pick<AgentModifiers, "moveSpeedMultiplier"> = {
    moveSpeedMultiplier: 1,
  },
): Agent {
  if (agent.state === "dead") {
    return agent;
  }

  let heading: number;
  let speed: number;
  const classSpeed = UNIT_CLASSES[agent.unitClass].moveSpeed;
  switch (intent.kind) {
    case "idle":
      heading = agent.heading;
      if (rng.next() < BALANCE_CONFIG.WANDER_TURN_CHANCE) {
        heading += rng.range(-TURN_RANGE, TURN_RANGE);
      }
      speed = classSpeed;
      break;
    case "flee":
      heading = Math.atan2(
        intent.towardY - agent.y,
        intent.towardX - agent.x,
      );
      speed =
        classSpeed *
        BALANCE_CONFIG.AGENT_FLEE_SPEED_MULTIPLIER;
      break;
    case "engage": {
      const deltaX = intent.towardX - agent.x;
      const deltaY = intent.towardY - agent.y;
      const distance = Math.hypot(deltaX, deltaY);
      const targetHeading = Math.atan2(deltaY, deltaX);
      const attackRange = UNIT_CLASSES[agent.unitClass].attackRange;
      const advanceThreshold =
        intent.preferredRange < attackRange
          ? intent.preferredRange * 1.1
          : attackRange;
      if (intent.preferredRange <= 0) {
        heading = targetHeading;
        speed =
          classSpeed * BALANCE_CONFIG.AGENT_ENGAGE_SPEED_MULTIPLIER;
      } else if (distance > advanceThreshold) {
        heading = targetHeading;
        speed =
          classSpeed * BALANCE_CONFIG.AGENT_ENGAGE_SPEED_MULTIPLIER;
      } else if (distance < intent.preferredRange * 0.7) {
        heading = targetHeading + Math.PI;
        speed = classSpeed * 0.9;
      } else {
        heading = agent.heading;
        speed = 0;
      }
      break;
    }
  }
  speed *= modifiers.moveSpeedMultiplier;

  const minimum = UNIT_CLASSES[agent.unitClass].drawRadius;
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
