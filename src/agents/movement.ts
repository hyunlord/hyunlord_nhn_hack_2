import { BALANCE_CONFIG } from "../content/balanceConfig";
import type { Rng } from "../engine/prng";
import type { Agent } from "./agentTypes";

const FULL_TURN = Math.PI * 2;
const TURN_RANGE = 0.8;

function normalizeHeading(heading: number): number {
  return ((heading % FULL_TURN) + FULL_TURN) % FULL_TURN;
}

export function stepAgent(agent: Agent, rng: Rng): Agent {
  if (agent.state === "dead") {
    return agent;
  }

  let heading = agent.heading;
  if (rng.next() < BALANCE_CONFIG.WANDER_TURN_CHANCE) {
    heading += rng.range(-TURN_RANGE, TURN_RANGE);
  }

  const minimum = BALANCE_CONFIG.AGENT_RADIUS;
  const maximumX = BALANCE_CONFIG.WORLD_WIDTH - minimum;
  const maximumY = BALANCE_CONFIG.WORLD_HEIGHT - minimum;
  let x = agent.x + Math.cos(heading) * BALANCE_CONFIG.WANDER_SPEED;
  let y = agent.y + Math.sin(heading) * BALANCE_CONFIG.WANDER_SPEED;

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
